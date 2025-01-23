import { GoogleGenerativeAI } from '@google/generative-ai';
import { WIPEntry } from '@/src/types';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash-exp",
  generationConfig: {
    temperature: 0.1,
    topP: 0.1,
  }
});

export const wipAggregationService = {
  /**
   * Compare if two client/project combinations refer to the same work
   */
  async areEntriesForSameWork(entry1: WIPEntry, entry2: WIPEntry): Promise<boolean> {
    const prompt = `Compare these two work entries and determine if they refer to the same client and project.
    Consider common variations, abbreviations, and typos.
    
    Entry 1:
    Client: "${entry1.client}"
    Project: "${entry1.project || 'No project specified'}"
    
    Entry 2:
    Client: "${entry2.client}"
    Project: "${entry2.project || 'No project specified'}"
    
    Return ONLY "true" if they refer to the same work, or "false" if they are different.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text().toLowerCase().trim();
    return response === 'true';
  },

  /**
   * Check if a description is semantically covered by existing bullet points
   */
  async isWorkAlreadyCovered(newDescription: string, existingBulletPoints: string): Promise<boolean> {
    const prompt = `Compare this new work description with the existing bullet points and determine if the work is already covered.
    
    New work description:
    "${newDescription}"
    
    Existing bullet points:
    ${existingBulletPoints}
    
    Consider:
    1. The core activities and outcomes
    2. If the new work is just a more specific version of an existing point
    3. If the work type is already represented
    
    Return ONLY "true" if the work is already covered, or "false" if it represents new/different work.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text().toLowerCase().trim();
    return response === 'true';
  },

  /**
   * Generate a bullet point summary for a new work description
   */
  async generateBulletPoint(description: string): Promise<string> {
    const prompt = `Create a concise, professional bullet point summarizing this work description.
    The bullet point should:
    1. Start with "•"
    2. Be clear and specific
    3. Focus on the core work/outcome
    4. Use active voice
    5. Be 10-15 words maximum
    
    Work description:
    "${description}"
    
    Return ONLY the bullet point, nothing else.`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  },

  /**
   * Process a new daily entry and return updated WIP description if needed
   */
  async processNewDailyEntry(
    dailyEntry: WIPEntry, 
    existingWipEntry?: WIPEntry
  ): Promise<{ shouldCreateWip: boolean; updatedDescription?: string }> {
    // If no existing WIP entry, create new one
    if (!existingWipEntry) {
      const bulletPoint = await this.generateBulletPoint(dailyEntry.description);
      return {
        shouldCreateWip: true,
        updatedDescription: bulletPoint
      };
    }

    // Check if work is already covered
    const isWorkCovered = await this.isWorkAlreadyCovered(
      dailyEntry.description,
      existingWipEntry.description
    );

    if (isWorkCovered) {
      return { shouldCreateWip: false };
    }

    // Generate new bullet point and append to existing
    const newBulletPoint = await this.generateBulletPoint(dailyEntry.description);
    const updatedDescription = existingWipEntry.description + '\n' + newBulletPoint;

    return {
      shouldCreateWip: false,
      updatedDescription
    };
  }
}; 
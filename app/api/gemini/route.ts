import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.0-flash-thinking-exp',
  generationConfig: {
    temperature: 0.1,
    topP: 0.1
  }
});

// Helper function to normalize project names
function normalizeProjectName(name: string): string {
  // Just clean up whitespace and ensure consistent casing
  return name.trim().replace(/\s+/g, ' ');
}

export async function POST(request: Request) {
  try {
    const { client, entries } = await request.json();

    // Group entries by project dynamically
    const projectGroups = entries.reduce((groups: any, entry: any) => {
      const projectName = normalizeProjectName(entry.project);
      if (!groups[projectName]) {
        groups[projectName] = [];
      }
      groups[projectName].push(entry);
      return groups;
    }, {});

    // Calculate totals dynamically
    const totalHours = entries.reduce((sum, entry) => sum + ((entry.timeInMinutes || 0) / 60), 0);
    const totalAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);

    const prompt = `You are a professional invoice writer. Create a detailed, well-organized invoice description for the following work:

CLIENT INFORMATION:
Client Name: ${client}

WORK DETAILS BY PROJECT:
${Object.entries(projectGroups).map(([project, projectEntries]: [string, any[]]) => {
  // Calculate project totals dynamically
  const projectHours = projectEntries.reduce((sum, entry) => sum + ((entry.timeInMinutes || 0) / 60), 0);
  const projectAmount = projectEntries.reduce((sum, entry) => sum + entry.amount, 0);

  return `
PROJECT: ${project} (${projectHours.toFixed(1)} hours)

Tasks Completed:
${projectEntries.map(entry => `- ${entry.description}`).join('\n')}
`;
}).join('\n')}

FINANCIAL SUMMARY:
Total Hours: ${totalHours.toFixed(1)}
Total Amount: $${totalAmount.toFixed(2)}

Please create a professional invoice description that:
1. Starts with a brief executive summary of the work completed
2. Groups work by project, with clear section headers showing total hours
3. For each project:
   - Provide a high-level overview of achievements and value delivered
   - List specific tasks completed with their impact
   - Include relevant technical details where appropriate
4. Use clear, professional language in active voice
5. Format the response with proper spacing and section breaks
6. End with a summary of deliverables and their business value

IMPORTANT FORMATTING RULES:
1. Use active voice without "we" statements (e.g., "Reviewed documents" instead of "We reviewed documents")
2. Start each task with a past tense verb (e.g., "Prepared", "Reviewed", "Completed")
3. Keep descriptions concise and professional
4. Avoid first-person pronouns (we, our, us)
5. Use direct action statements - no phrases like "this included" or "this involved"
6. Each line should start with a verb in past tense describing what was done
7. Format for task descriptions:
   GOOD: "Conducted client conference call to discuss project progress"
   BAD: "This included client conference calls to discuss progress"
   GOOD: "Prepared tax returns and e-filing documentation"
   BAD: "This involved preparation of tax returns"

Format the response in a way that would be appropriate for a professional invoice, using markdown formatting.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text || text.trim() === '') {
      throw new Error('Empty response from Gemini');
    }

    return NextResponse.json({ content: text });
  } catch (error) {
    console.error('Error in Gemini API:', error);
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
} 
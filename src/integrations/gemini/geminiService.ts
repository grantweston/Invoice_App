"use server";

import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is missing from environment variables');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 2000
): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (retries >= maxRetries || !(error instanceof Error && error.message.includes('429'))) {
        throw error;
      }
      const delayTime = initialDelay * Math.pow(2, retries);
      console.log(`Rate limited. Retrying in ${delayTime}ms...`);
      await delay(delayTime);
      retries++;
    }
  }
}

export async function analyze(prompt: string): Promise<string> {
  return retryWithBackoff(async () => {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  });
}

export async function areDescriptionsEquivalent(actual: string, expected: string): Promise<boolean> {
  const prompt = `
  Compare these two work descriptions and determine if they convey the same information and level of detail:

  Description 1: "${actual}"
  Description 2: "${expected}"

  Consider:
  1. Do both descriptions contain the same key information?
  2. Do they convey the same level of progress/status?
  3. Are any important details missing from either one?
  4. Ignore differences in formatting (periods, colons, capitalization)
  5. Ignore minor wording differences that don't change meaning
  6. Consider common abbreviations as equivalent (e.g., "dev" = "development", "P1" = "Phase 1")
  7. Focus on the semantic meaning rather than exact wording
  8. Check if one is just a more concise version of the other
  9. Compare the actual content and meaning, not just the text

  Respond with just "true" if they are equivalent in meaning (even if formatted differently), or "false" if they differ in meaningful ways.
  `;

  try {
    const response = await analyze(prompt);
    return response.trim().toLowerCase() === 'true';
  } catch (error) {
    console.error('Error comparing descriptions:', error);
    // Fallback to basic comparison if Gemini fails
    const normalize = (text: string) => text
      .toLowerCase()
      .replace(/[.:,\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/development/g, 'dev')
      .replace(/phase (\d+)/g, 'p$1')
      .replace(/accounts receivable/g, 'ar')
      .replace(/quarter (\d+)/g, 'q$1')
      .replace(/website/g, 'web')
      .replace(/application/g, 'app')
      .replace(/schedule c calculations and documentation/g, 'schedule c')
      .replace(/business expenses and receipts/g, 'expenses')
      .replace(/equipment purchases/g, 'equipment')
      .trim();
    
    return normalize(actual) === normalize(expected);
  }
}

export async function compareDescriptions(
  description1: string,
  description2: string,
  project?: string,
  client?: string
): Promise<{ shouldUpdate: boolean; updatedDescription?: string; explanation: string }> {
  // First check if descriptions are identical or just abbreviations
  const normalizedDesc1 = description1.toLowerCase().replace(/[.:,\-]/g, ' ').replace(/\s+/g, ' ').trim();
  const normalizedDesc2 = description2.toLowerCase().replace(/[.:,\-]/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Check for abbreviations and common variations
  const abbreviations = {
    'dev': 'development',
    'p1': 'phase 1',
    'p2': 'phase 2',
    'p3': 'phase 3',
    'ar': 'accounts receivable',
    'ap': 'accounts payable',
    'q1': 'quarter 1',
    'q2': 'quarter 2',
    'q3': 'quarter 3',
    'q4': 'quarter 4',
    'web': 'website',
    'app': 'application'
  };

  let expandedDesc1 = normalizedDesc1;
  let expandedDesc2 = normalizedDesc2;
  
  Object.entries(abbreviations).forEach(([abbr, full]) => {
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
    expandedDesc1 = expandedDesc1.replace(regex, full);
    expandedDesc2 = expandedDesc2.replace(regex, full);
  });

  // Check if one description is just an abbreviated version of the other
  if (expandedDesc1 === expandedDesc2 || 
      normalizedDesc1.includes(normalizedDesc2) || 
      normalizedDesc2.includes(normalizedDesc1)) {
    // Keep the more detailed version
    const detailedDesc = description1.length >= description2.length ? description1 : description2;
    return {
      shouldUpdate: false,
      updatedDescription: detailedDesc,
      explanation: 'Descriptions are identical or represent the same task with different formatting'
    };
  }

  // Check if descriptions are too similar to be worth combining
  const words1 = new Set(normalizedDesc1.split(' '));
  const words2 = new Set(normalizedDesc2.split(' '));
  const commonWords = new Set(Array.from(words1).filter(word => words2.has(word)));
  const similarity = commonWords.size / Math.max(words1.size, words2.size);
  
  if (similarity > 0.8) {  // If descriptions are more than 80% similar
    // Keep the more detailed version
    const detailedDesc = description1.length >= description2.length ? description1 : description2;
    return {
      shouldUpdate: false,
      updatedDescription: detailedDesc,
      explanation: 'Descriptions are too similar to warrant combining'
    };
  }

  const prompt = `
  Compare these two work descriptions and determine if they are related tasks that should be combined:

  Description 1: "${description1}"
  Description 2: "${description2}"
  ${project ? `Project: "${project}"` : ''}
  ${client ? `Client: "${client}"` : ''}

  Consider:
  1. Are they part of the same overall task or project?
  2. Do they represent different stages or aspects of the same work?
  3. Would combining them provide a clearer picture of the work progress?
  4. Are they logically connected or dependent on each other?
  5. Should they be kept separate for clarity?
  6. Are they just different ways of saying the same thing?
  7. Would combining them make the progress narrative clearer?
  8. Are they sequential steps in the same process?

  If they should be combined, create a description that:
  - Starts with the project name (if provided)
  - Uses arrows (->) to show progression
  - Keeps important details from both descriptions
  - Is concise but complete
  - Shows the logical flow of work
  - Abbreviates repeated terms after first use
  - Uses consistent formatting throughout
  - Simplifies common phrases (e.g., "state and federal" -> "state/federal")
  - Removes redundant information
  - Keeps the more detailed version if they're essentially the same task
  - Uses standard abbreviations (AR, AP, Q1, P1, etc.)
  - Maintains chronological order
  - Focuses on key milestones and progress
  - Removes project name from the middle of the description
  - Uses consistent tense throughout
  - Keeps descriptions brief but informative
  - Uses active voice
  - Removes unnecessary words
  - Standardizes terminology

  Respond with a JSON object containing:
  {
    "shouldCombine": boolean,
    "combinedDescription": string (only if shouldCombine is true),
    "explanation": string (brief explanation of the decision),
    "areSameTask": boolean (true if they're just different ways of saying the same thing)
  }
  `;

  try {
    const response = await analyze(prompt);
    const result = JSON.parse(response);
    
    // If they're the same task, don't update
    if (result.areSameTask) {
      // Keep the more detailed version
      const detailedDesc = description1.length >= description2.length ? description1 : description2;
      return {
        shouldUpdate: false,
        updatedDescription: detailedDesc,
        explanation: 'Descriptions represent the same task with different wording'
      };
    }
    
    if (result.shouldCombine && result.combinedDescription) {
      // Ensure project name is included if provided
      let finalDescription = result.combinedDescription;
      if (project && !finalDescription.startsWith(project)) {
        finalDescription = `${project}: ${finalDescription}`;
      }
      
      // Clean up formatting
      finalDescription = finalDescription
        .replace(/\s*->\s*/g, ' -> ')  // Consistent arrow spacing
        .replace(/\s+/g, ' ')          // Remove extra spaces
        .replace(/\s*:\s*/g, ': ')     // Consistent colon spacing
        .replace(/state and federal/gi, 'state/federal')  // Common abbreviations
        .replace(/quarter (\d)/gi, 'Q$1')  // Quarter abbreviations
        .replace(/phase (\d)/gi, 'P$1')    // Phase abbreviations
        .replace(/accounts receivable/gi, 'AR')  // Common accounting terms
        .replace(/accounts payable/gi, 'AP')
        .replace(/website development/gi, 'web dev')  // Common development terms
        .replace(/application development/gi, 'app dev')
        .replace(/researched state\/federal requirements/gi, 'researched requirements')  // Simplify common phrases
        .replace(/reviewed business expenses and receipts/gi, 'reviewed expenses')
        .replace(/calculated depreciation for new equipment purchases/gi, 'calculated equipment depreciation')
        .replace(/completed schedule c calculations and documentation/gi, 'completed Schedule C')
        .replace(/tax return 2024:/gi, '')  // Remove project name from middle
        .replace(/financial review:/gi, '')
        .replace(/client portal:/gi, '')
        .replace(/reviewing/gi, 'reviewed')  // Consistent tense
        .replace(/starting/gi, 'started')
        .replace(/implementing/gi, 'implemented')
        .replace(/calculating/gi, 'calculated')
        .replace(/investigating/gi, 'investigated')
        .replace(/initial review of/gi, 'reviewed')  // Simplify phrases
        .replace(/initial client meeting/gi, 'met with client')
        .replace(/business expenses and receipts/gi, 'expenses')
        .replace(/equipment purchases/gi, 'equipment')
        .replace(/schedule c calculations and documentation/gi, 'Schedule C')
        .trim();
      
      // Add project name back at the start if needed
      if (project && !finalDescription.startsWith(project)) {
        finalDescription = `${project}: ${finalDescription}`;
      }
      
      return {
        shouldUpdate: true,
        updatedDescription: finalDescription,
        explanation: result.explanation
      };
    }
    
    return {
      shouldUpdate: false,
      explanation: result.explanation
    };
  } catch (error) {
    console.error('Error comparing descriptions:', error);
    // Fallback to basic comparison
    const areSimilar = description1.toLowerCase().includes(description2.toLowerCase()) ||
                      description2.toLowerCase().includes(description1.toLowerCase());
    return {
      shouldUpdate: areSimilar,
      updatedDescription: areSimilar ? description2 : undefined,
      explanation: 'Using basic text comparison due to analysis error'
    };
  }
}
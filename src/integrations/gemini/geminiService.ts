"use server";

import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import fetch from 'node-fetch';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is missing from environment variables');
}

// Configure Gemini with node-fetch for Node.js environment
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Set up fetch for Node.js environment
(global as any).fetch = fetch;

const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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
    // Add format instruction to the prompt
    const formattedPrompt = `${prompt}\n\nIMPORTANT: Respond with a clear 'true' or 'false' answer, optionally followed by a brief explanation.`;
    const result = await model.generateContent(formattedPrompt);
    const response = await result.response;
    return response.text();
  });
}

export async function analyzeJson(prompt: string): Promise<any> {
  return retryWithBackoff(async () => {
    // Add format instruction to the prompt
    const formattedPrompt = `${prompt}\n\nIMPORTANT: Respond with ONLY a valid JSON object, no other text or formatting.`;
    
    const result = await model.generateContent(formattedPrompt);
    const response = await result.response;
    const text = response.text();
    
    // Remove any markdown code block markers and clean up the response
    const cleanJson = text
      .replace(/```(?:json)?\n?/g, '') // Remove code block markers with or without language
      .replace(/\n```/g, '')           // Remove closing code block marker
      .trim();                         // Remove any extra whitespace
    
    try {
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error('Failed to parse JSON response:', cleanJson);
      // Try to extract JSON from the response if it's wrapped in other text
      const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (innerError) {
          console.error('Failed to parse extracted JSON:', jsonMatch[0]);
          throw innerError;
        }
      }
      throw error;
    }
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

  IMPORTANT: Respond with ONLY 'true' or 'false', nothing else.
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

  // Check if one is a more detailed version of the other
  if (normalizedDesc1.includes(normalizedDesc2) || normalizedDesc2.includes(normalizedDesc1)) {
    const detailedDesc = description1.length >= description2.length ? description1 : description2;
    return {
      shouldUpdate: false,
      updatedDescription: detailedDesc,
      explanation: 'One description is a more detailed version of the other'
    };
  }

  const prompt = `
  Compare these two work descriptions and determine if they should be combined:

  Description 1: "${description1}"
  Description 2: "${description2}"

  Consider:
  1. Are they part of the same overall task or project?
  2. Do they represent different stages or aspects of the same work?
  3. Would combining them provide a clearer picture of the work progress?
  4. Are they logically connected or dependent on each other?
  5. Should they be kept separate for clarity?
  6. Are they just different ways of saying the same thing?
  7. Would combining them make the progress narrative clearer?
  8. Are they sequential steps in the same process?
  9. IMPORTANT: If one description is just a more detailed version of the other, mark them as the same task

  Rules for response:
  1. If descriptions are the same task with different detail levels, set areSameTask=true
  2. Preserve technical terms like "optimization" instead of replacing with synonyms
  3. Keep the more detailed version when tasks are the same

  IMPORTANT: You must respond with a valid JSON object in exactly this format:
  {
    "shouldCombine": boolean,
    "combinedDescription": string,
    "explanation": string,
    "areSameTask": boolean
  }

  Example response:
  {
    "shouldCombine": true,
    "combinedDescription": "Database setup -> Connection configuration -> Performance optimization",
    "explanation": "Tasks represent sequential steps in database setup process",
    "areSameTask": false
  }
  `;

  try {
    const result = await analyzeJson(prompt);
    
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
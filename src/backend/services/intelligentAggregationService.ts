import { WIPEntry } from '@/src/types';
import { analyze } from '@/src/integrations/gemini/geminiService';

interface AggregationResult {
  shouldMerge: boolean;
  confidence: number;
  explanation?: string;
}

// Add helper function to check if projects are effectively the same
export async function isSameProject(project1: string, project2: string): Promise<boolean> {
  console.log(`\n📊 Comparing projects:
    Project 1: "${project1}"
    Project 2: "${project2}"`);

  // Use Gemini to compare projects
  const prompt = `
  Compare these two project names and determine if they refer to the same project or work.
  Consider common variations, technical terminology, and project phases.
  
  Project 1: "${project1}"
  Project 2: "${project2}"
  
  Consider:
  1. Are these different representations of the same project?
  2. Could one be a phase or component of the other?
  3. Are these common variations or abbreviations in software/business context?
  4. Do they represent the same type of work (e.g., "Tax Prep" and "Tax Preparation")?
  
  Respond with just true or false.
  `;

  try {
    const response = await analyze(prompt);
    const isSame = response.trim().toLowerCase() === 'true';
    
    if (isSame) {
      console.log(`✅ Project match (AI analysis): "${project1}" ≈ "${project2}"`);
    } else {
      console.log(`❌ Project mismatch (AI analysis): "${project1}" ≠ "${project2}"`);
    }
    
    return isSame;
  } catch (error) {
    console.error("Error comparing projects with AI:", error);
    return false;
  }
}

// Add helper function to check if clients are effectively the same
export async function isSameClient(client1: string, client2: string): Promise<boolean> {
  // If either is Unknown, they can be merged
  if (client1 === "Unknown" || client2 === "Unknown") {
    console.log(`✅ Client match (one unknown): "${client1}" ≈ "${client2}"`);
    return true;
  }

  // Use Gemini to compare clients
  const prompt = `
  Compare these two client names and determine if they refer to the same client.
  Consider common variations, abbreviations, and business relationships.
  
  Client 1: "${client1}"
  Client 2: "${client2}"
  
  Consider:
  1. Are these different representations of the same client?
  2. Could one be a subsidiary or division of the other?
  3. Are these common variations or abbreviations?
  4. For individual names, could these be the same person with name variations?
  
  Respond with just true or false.
  `;

  try {
    const response = await analyze(prompt);
    const isSame = response.trim().toLowerCase() === 'true';
    
    if (isSame) {
      console.log(`✅ Client match (AI analysis): "${client1}" ≈ "${client2}"`);
    } else {
      console.log(`❌ Client mismatch (AI analysis): "${client1}" ≠ "${client2}"`);
    }
    
    return isSame;
  } catch (error) {
    console.error("Error comparing clients with AI:", error);
    return false;
  }
}

// Update shouldEntriesBeMerged to handle async comparisons
export async function shouldEntriesBeMerged(entry1: WIPEntry, entry2: WIPEntry): Promise<{ shouldMerge: boolean; confidence: number }> {
  try {
    // Check if clients are the same using Gemini
    const clientMatch = await isSameClient(entry1.client_name, entry2.client_name);
    
    // Check if projects are the same using Gemini
    const projectMatch = await isSameProject(entry1.project_name || '', entry2.project_name || '');
    
    // Check description similarity using Gemini
    const { shouldUpdate: descriptionMatch, explanation } = await compareDescriptions(entry1.description, entry2.description);

    // Calculate overall confidence - weight client and project matches more heavily
    const confidence = (
      (clientMatch ? 1 : 0) * 0.4 + 
      (projectMatch ? 1 : 0) * 0.4 + 
      (descriptionMatch ? 1 : 0) * 0.2
    );

    // Entries should be merged if:
    // 1. Clients match (including Unknown cases) AND
    // 2. Either projects match OR descriptions are similar enough
    const shouldMerge = clientMatch && (projectMatch || descriptionMatch);

    return {
      shouldMerge,
      confidence
    };
  } catch (error) {
    console.error('Error comparing entries:', error);
    return {
      shouldMerge: false,
      confidence: 0
    };
  }
}

export async function findRelatedEntries(entries: WIPEntry[]): Promise<WIPEntry[][]> {
  const groups: WIPEntry[][] = [];
  const processed = new Set<string>();

  for (const entry of entries) {
    if (processed.has(entry.id)) continue;

    const currentGroup = [entry];
    processed.add(entry.id);

    // Look for related entries
    for (const candidate of entries) {
      if (processed.has(candidate.id)) continue;

      // Check if candidate matches ALL entries in current group
      let shouldAddToGroup = true;
      let minConfidence = 1;

      for (const groupEntry of currentGroup) {
        const { shouldMerge, confidence } = await shouldEntriesBeMerged(groupEntry, candidate);
        if (!shouldMerge || confidence <= 0.7) {
          shouldAddToGroup = false;
          break;
        }
        minConfidence = Math.min(minConfidence, confidence);
      }

      if (shouldAddToGroup) {
        currentGroup.push(candidate);
        processed.add(candidate.id);
      }
    }

    groups.push(currentGroup);
  }

  return groups;
}

export async function compareDescriptions(
  existingDesc: string,
  newDesc: string
): Promise<{
  shouldUpdate: boolean;
  updatedDescription?: string;
  explanation: string;
}> {
  const prompt = `
  Compare these two work descriptions and determine if they should be combined into a single summary:

  Description 1: "${existingDesc}"
  Description 2: "${newDesc}"

  Rules for combining:
  1. Combine if they're related tasks or show progress on the same work
  2. Convert verbs to strongest form:
     - "working on" -> "completed"
     - "started" -> "started"
     - "reviewing" -> "reviewed"
     - "discussing" -> "discussed"
     - "implementing" -> "implemented"
  3. Separate tasks with commas
  4. Use standard abbreviations (AR, AP, Q1)
  5. Keep only essential information
  6. Don't add extra details or steps

  Example good combinations:
  "Started tax return" + "Working on Schedule C" = "Started tax return, completed Schedule C"
  "Reviewing Q3 statements" + "Found issues in receivables" = "Reviewed Q3 statements, found AR issues"
  "Meeting about strategy" + "Discussing timeline" = "Met with client, discussed strategy, set timeline"

  Example descriptions to keep separate:
  "Client meeting" + "Code review" (different types of work)
  "Tax return 2023" + "Bookkeeping for Q4" (distinct activities)

  Respond with just a JSON object:
  {
    "shouldCombine": boolean,
    "combinedDescription": string (only if shouldCombine is true),
    "explanation": string (brief explanation of why),
    "areSameTask": boolean (true if they're just different ways of saying the same thing)
  }`;

  try {
    const response = await analyze(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    const result = JSON.parse(jsonMatch[0]);
    
    if (result.areSameTask) {
      const detailedDesc = existingDesc.length >= newDesc.length ? existingDesc : newDesc;
      return {
        shouldUpdate: false,
        updatedDescription: detailedDesc,
        explanation: 'Descriptions represent the same task with different wording'
      };
    }
    
    if (result.shouldCombine && result.combinedDescription) {
      return {
        shouldUpdate: true,
        updatedDescription: result.combinedDescription,
        explanation: result.explanation
      };
    }
    
    return {
      shouldUpdate: false,
      explanation: result.explanation
    };
  } catch (error) {
    console.error('Error comparing descriptions:', error);
    return {
      shouldUpdate: false,
      explanation: 'Error during analysis'
    };
  }
}

export async function mergeEntryGroup(group: WIPEntry[]): Promise<WIPEntry> {
  // Sort entries by timestamp
  const sortedEntries = group.sort((a, b) => Number(a.id) - Number(b.id));
  
  // Calculate total time
  const totalMinutes = group.reduce((sum, entry) => {
    return sum + (entry.time_in_minutes || 0);
  }, 0);

  // Use the most confident client if available
  const knownClient = group.find(e => e.client_name !== "Unknown")?.client_name || "Unknown";

  // Use the most recent entry as base
  const mostRecentEntry = sortedEntries[sortedEntries.length - 1];

  // Start with the earliest entry's description as base
  let finalDescription = sortedEntries[0].description;
  console.log(`📝 Starting with base description: "${finalDescription}"`);

  // Compare with subsequent descriptions in chronological order
  for (let i = 1; i < sortedEntries.length; i++) {
    const entry = sortedEntries[i];
    const comparison = await compareDescriptions(finalDescription, entry.description);
    
    if (comparison.shouldUpdate && comparison.updatedDescription) {
      console.log(`📝 Updating description with entry ${entry.id}:`);
      console.log(`Previous: "${finalDescription}"`);
      console.log(`New: "${comparison.updatedDescription}"`);
      console.log(`Reason: ${comparison.explanation}`);
      finalDescription = comparison.updatedDescription;
    } else {
      console.log(`📝 Keeping existing description (${comparison.explanation})`);
    }
  }

  return {
    id: mostRecentEntry.id,
    client_id: mostRecentEntry.client_id,
    client_name: knownClient,
    client_address: mostRecentEntry.client_address,
    project_name: mostRecentEntry.project_name,
    time_in_minutes: totalMinutes,
    hourly_rate: mostRecentEntry.hourly_rate,
    description: finalDescription,
    date: mostRecentEntry.date,
    category: mostRecentEntry.category,
    entities: mostRecentEntry.entities,
    details: mostRecentEntry.details,
    retainer_amount: mostRecentEntry.retainer_amount,
    adjustments: mostRecentEntry.adjustments,
    created_at: mostRecentEntry.created_at,
    updated_at: new Date().toISOString(),
    partner: mostRecentEntry.partner
  };
} 
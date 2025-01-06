import { WIPEntry } from '@/src/services/supabaseDB';
import { analyze, analyzeJson } from '../../integrations/gemini/geminiService';

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
  Consider them the same if they are clearly variations of the same project.
  
  Project 1: "${project1}"
  Project 2: "${project2}"
  
  Consider:
  1. Are these exactly the same project?
  2. Are these common variations or abbreviations of the same project?
     Examples:
     - "Tax Return Prep" = "Tax Return Preparation"
     - "DB Migration" = "Database Migration"
     - "Dev" = "Development"
     - "App" = "Application"
  3. Do they have the same core meaning and purpose?
  4. Would these be tracked as the same project in a time tracking system?
  
  Return false if:
  1. They are different types of work (e.g., "Tax Return" vs "Bookkeeping")
  2. They are different phases or components that could be separate projects
  3. There is significant ambiguity about whether they are the same project
  
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

  const prompt = `
Compare these two potential client references and determine if they refer to the same client.

Client 1: "${client1}"
Client 2: "${client2}"

Consider:
1. Are they different representations of the same client?
2. Could one be a subsidiary or division of the other?
3. Are these common variations or abbreviations?
4. For individual names, could these be the same person with name variations?

If either client is "Unknown":
1. Compare the project names and descriptions to identify patterns
2. Look for industry-specific terminology that might indicate same client
3. Check for similar work patterns or project structures
4. Consider timing and sequence of work

Response must be a JSON object with:
{
  "isMatch": boolean,
  "confidence": number (0.0 to 1.0),
  "explanation": string,
  "patterns": string[] (only if one client is Unknown)
}

Example responses:

For known clients:
{
  "isMatch": true,
  "confidence": 0.95,
  "explanation": "Both refer to same company with standard abbreviation (Corp vs Corporation)",
  "patterns": []
}

For unknown client:
{
  "isMatch": true,
  "confidence": 0.75,
  "explanation": "Project patterns and terminology suggest same financial services client",
  "patterns": [
    "Similar financial compliance projects",
    "Same tech stack mentioned in descriptions",
    "Consistent reporting structure across projects"
  ]
}`;

  try {
    const result = await analyzeJson(prompt);
    
    // Check if we have a match with sufficient confidence
    const isMatch = result.isMatch && result.confidence >= 0.6;
    
    if (isMatch) {
      console.log(`✅ Client match (AI analysis): "${client1}" ≈ "${client2}"`);
      if (result.patterns && result.patterns.length > 0) {
        console.log('📋 Matching patterns:', result.patterns);
      }
    } else {
      console.log(`❌ Client mismatch (AI analysis): "${client1}" ≠ "${client2}"`);
    }
    
    return isMatch;
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

export async function compareDescriptions(desc1: string, desc2: string): Promise<{ shouldUpdate: boolean; updatedDescription?: string; explanation: string }> {
  const prompt = `
  Compare these two work descriptions and determine if they should be combined:

  Description 1: "${desc1}"
  Description 2: "${desc2}"

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
  1. If descriptions are the same task (even with different detail levels):
     - Set shouldCombine=false
     - Set areSameTask=true
  2. If descriptions are different but related:
     - Set shouldCombine=true
     - Set areSameTask=false
     - Combine them in a logical way in combinedDescription
  3. Keep explanations brief and focused
  4. Preserve technical terms exactly as written
  5. Return ONLY a valid JSON object with no prefix text

  Response MUST be a JSON object with exactly these fields:
  {
    "shouldCombine": boolean,
    "combinedDescription": string,
    "explanation": string (keep this brief),
    "areSameTask": boolean
  }`;

  try {
    const result = await analyzeJson(prompt);
    console.log('Gemini response:', result);

    // If they're the same task (even if one is more detailed), keep the original
    if (result.areSameTask) {
      return {
        shouldUpdate: false,
        updatedDescription: desc1,
        explanation: result.explanation
      };
    }

    // If they should be combined, update with the combined description
    if (result.shouldCombine) {
      return {
        shouldUpdate: true,
        updatedDescription: result.combinedDescription,
        explanation: result.explanation
      };
    }

    // If neither condition is met, don't update
    return {
      shouldUpdate: false,
      explanation: result.explanation
    };
  } catch (error) {
    console.error('Error comparing descriptions:', error);
    return {
      shouldUpdate: false,
      explanation: "Error comparing descriptions"
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

  // Collect all descriptions to merge
  const descriptions = sortedEntries.map(e => e.description);
  
  // Start with the earliest entry's description as base
  let finalDescription = descriptions[0];
  console.log(`📝 Starting with base description: "${finalDescription}"`);

  // Compare with subsequent descriptions in chronological order
  for (let i = 1; i < descriptions.length; i++) {
    const currentDesc = descriptions[i];
    const prompt = `
      Compare these two work descriptions and determine how to combine them:
      
      Description 1: "${finalDescription}"
      Description 2: "${currentDesc}"
      
      Rules:
      1. If they describe different aspects or stages of the same work, they should be combined
      2. Keep technical terms exactly as they appear (e.g., "optimization", "indexing", "testing")
      3. Combine using bullet points if they are distinct but related tasks
      4. Keep the most specific and detailed information
      5. Don't duplicate information
      6. Preserve all technical terminology
      7. Use consistent formatting for similar tasks
      
      Return a JSON object:
      {
        "shouldCombine": boolean,
        "combinedDescription": string,
        "explanation": string
      }`;
    
    try {
      const response = await analyzeJson(prompt);
      if (response.shouldCombine) {
        console.log(`📝 Combining descriptions:`);
        console.log(`Previous: "${finalDescription}"`);
        console.log(`New combined: "${response.combinedDescription}"`);
        finalDescription = response.combinedDescription;
      } else {
        // If descriptions are different but related, append them
        const comparison = await compareDescriptions(finalDescription, currentDesc);
        if (comparison.shouldUpdate && comparison.updatedDescription) {
          console.log(`📝 Updating description with new information:`);
          console.log(`Previous: "${finalDescription}"`);
          console.log(`New: "${comparison.updatedDescription}"`);
          console.log(`Reason: ${comparison.explanation}`);
          finalDescription = comparison.updatedDescription;
        } else {
          console.log(`📝 Keeping existing description (${comparison.explanation})`);
        }
      }
    } catch (error) {
      console.error('Error analyzing descriptions for combination:', error);
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
    created_at: mostRecentEntry.created_at,
    updated_at: new Date().toISOString(),
    partner: mostRecentEntry.partner
  };
} 
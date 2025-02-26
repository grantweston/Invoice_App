import { WIPEntry } from '@/src/types';
import { analyze } from '@/src/integrations/gemini/geminiService';

interface AggregationResult {
  shouldMerge: boolean;
  confidence: number;
  explanation?: string;
}

// Add helper function for string similarity
function getStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  // Check for exact match after normalization
  if (s1 === s2) return 1;
  
  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.9;
  }

  // Split into words and compare
  const words1 = s1.split(/\W+/).filter(w => w.length > 2);
  const words2 = new Set(s2.split(/\W+/).filter(w => w.length > 2));
  
  // Count matching words
  const matches = words1.filter(word => words2.has(word)).length;
  const totalWords = Math.max(words1.length, words2.size);
  
  return totalWords > 0 ? matches / totalWords : 0;
}

// Add helper function for normalizing project names
function normalizeProjectName(name: string): string {
  // First, standardize common variations
  let normalized = name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    // Standardize common variations
    .replace(/\b(development|dev)\b/gi, 'dev')
    .replace(/\b(application|app)\b/gi, 'app')
    .replace(/\b(program|prog)\b/gi, 'prog')
    // Remove common prefixes
    .replace(/^(new|the|a)\s+/gi, '')
    // Remove version numbers
    .replace(/\s+v\d+(\.\d+)*|\s+\d+(\.\d+)*/g, '')
    // Remove common generic words
    .replace(/\b(system|platform|service|api|ui|frontend|backend|web)\b/gi, '')
    // Remove special characters and extra spaces
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Ensure we don't end up with an empty string
  if (!normalized) {
    normalized = name.toLowerCase().trim();
  }
  
  console.log(`🔍 Project name normalization:
    Original: "${name}"
    Normalized: "${normalized}"
    Words: [${normalized.split(' ').join(', ')}]`);
  return normalized;
}

// Add helper function for normalizing client names
function normalizeClientName(name: string): string {
  const normalized = name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    // Remove common business suffixes
    .replace(/\b(inc|llc|ltd|corporation|corp|company|co|group)\b/gi, '')
    // Remove special characters
    .replace(/[^\w\s]/g, '')
    // Remove multiple spaces and trim
    .replace(/\s+/g, ' ')
    .trim();
  
  console.log(`🔍 Normalized client name: "${name}" -> "${normalized}"`);
  return normalized;
}

// Add helper function for normalizing partner names
function normalizePartnerName(name: string): string {
  const normalized = name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    // Common name variations
    .replace(/\b(jonathan|john)\b/g, 'john')
    .replace(/\b(samuel|sam)\b/g, 'sam')
    .replace(/\b(benjamin|ben)\b/g, 'ben')
    .replace(/\b(michael|mike)\b/g, 'mike')
    .replace(/\b(robert|rob|bob)\b/g, 'rob')
    .replace(/\b(william|will|bill)\b/g, 'will')
    .replace(/\b(james|jim|jimmy)\b/g, 'james')
    .replace(/\b(richard|rick|dick)\b/g, 'rick')
    .replace(/\b(thomas|tom|tommy)\b/g, 'tom')
    .replace(/\b(christopher|chris)\b/g, 'chris')
    // Remove special characters and extra spaces
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  console.log(`🔍 Normalized partner name: "${name}" -> "${normalized}"`);
  return normalized;
}

// Add helper function to check if projects are effectively the same
async function isSameProject(project1: string, project2: string): Promise<boolean> {
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
    // Fallback to basic comparison if AI fails
    const norm1 = normalizeProjectName(project1);
    const norm2 = normalizeProjectName(project2);
    return norm1 === norm2 || norm1.includes(norm2) || norm2.includes(norm1);
  }
}

// Add helper function to check if clients are effectively the same
async function isSameClient(client1: string, client2: string): Promise<boolean> {
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
    // Fallback to basic comparison if AI fails
    const norm1 = normalizeClientName(client1);
    const norm2 = normalizeClientName(client2);
    return norm1 === norm2 || norm1.includes(norm2) || norm2.includes(norm1);
  }
}

// Add helper function to check if partners are effectively the same
function isSamePartner(partner1: string, partner2: string): boolean {
  const norm1 = normalizePartnerName(partner1);
  const norm2 = normalizePartnerName(partner2);
  
  // Direct match after normalization
  if (norm1 === norm2) {
    console.log(`✅ Partner match (exact): "${partner1}" = "${partner2}"`);
    return true;
  }
  
  // Check if one contains the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    console.log(`✅ Partner match (contains): "${partner1}" ≈ "${partner2}"`);
    return true;
  }
  
  // Calculate similarity
  const similarity = getStringSimilarity(norm1, norm2);
  const isSimilar = similarity > 0.7;
  
  if (isSimilar) {
    console.log(`✅ Partner match (similarity ${similarity.toFixed(2)}): "${partner1}" ≈ "${partner2}"`);
  } else {
    console.log(`❌ Partner mismatch (similarity ${similarity.toFixed(2)}): "${partner1}" ≠ "${partner2}"`);
  }
  
  return isSimilar;
}

// Update shouldEntriesBeMerged to handle async comparisons
export async function shouldEntriesBeMerged(entry1: WIPEntry, entry2: WIPEntry): Promise<{ shouldMerge: boolean; confidence: number }> {
  try {
    const prompt = `
    Compare these two work entries and determine if they represent the same project/task:

    Entry 1:
    - Client: "${entry1.client}"
    - Project: "${entry1.project}"
    - Partner: "${entry1.partner}"

    Entry 2:
    - Client: "${entry2.client}"
    - Project: "${entry2.project}"
    - Partner: "${entry2.partner}"

    Consider:
    1. Are the client names referring to the same client? (Consider variations, abbreviations, and typos)
    2. Are the project names referring to the same project? (Consider task descriptions and context)
    3. Are the partner names referring to the same person? (Consider variations and typos)

    Respond in JSON format:
    {
      "are_same": boolean,
      "confidence": number (0-1),
      "explanation": string,
      "matches": {
        "client_match": boolean,
        "project_match": boolean,
        "partner_match": boolean
      }
    }
    `;

    const response = await analyze(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Return true only if all three fields match with high confidence
    return {
      shouldMerge: analysis.are_same && analysis.matches.client_match && analysis.matches.project_match && analysis.matches.partner_match,
      confidence: analysis.confidence
    };
  } catch (error) {
    console.error('Error comparing entries:', error);
    // Fall back to basic string comparison if Gemini fails
    return {
      shouldMerge: entry1.client === entry2.client && 
                   entry1.project === entry2.project && 
                   entry1.partner === entry2.partner,
      confidence: 1.0
    };
  }
}

export async function findRelatedEntries(entries: WIPEntry[]): Promise<WIPEntry[][]> {
  const groups: WIPEntry[][] = [];
  const processed = new Set<number>();

  for (const entry of entries) {
    if (processed.has(entry.id)) continue;

    const currentGroup = [entry];
    processed.add(entry.id);

    // Look for related entries
    for (const candidate of entries) {
      if (processed.has(candidate.id)) continue;

      // Check the last entry in current group against candidate
      const lastEntry = currentGroup[currentGroup.length - 1];
      const { shouldMerge, confidence } = await shouldEntriesBeMerged(lastEntry, candidate);

      if (shouldMerge && confidence > 0.7) {
        currentGroup.push(candidate);
        processed.add(candidate.id);
      }
    }

    groups.push(currentGroup);
  }

  return groups;
}

export async function compareDescriptions(existingDesc: string, newDesc: string): Promise<{
  shouldUpdate: boolean;
  updatedDescription?: string;
  explanation: string;
}> {
  const prompt = `
  Compare these two work descriptions and determine if the new description adds significant information that should be incorporated.
  
  Existing description: "${existingDesc}"
  New description: "${newDesc}"
  
  Consider:
  1. Does the new description add meaningful new context or progress information?
  2. Is it just restating the same work in different words?
  3. Does it represent progress made after the original description?
  
  If an update is needed, provide a merged description that:
  - Preserves important context from the original
  - Adds the new information
  - Maintains a clear narrative of the work progress
  
  Respond in JSON format:
  {
    "shouldUpdate": boolean,
    "updatedDescription": string (only if shouldUpdate is true),
    "explanation": "brief reason for the decision"
  }
  `;

  try {
    const response = await analyze(prompt);
    const result = JSON.parse(response);
    return {
      shouldUpdate: result.shouldUpdate,
      updatedDescription: result.shouldUpdate ? result.updatedDescription : undefined,
      explanation: result.explanation
    };
  } catch (error) {
    console.error("Error comparing descriptions:", error);
    // If descriptions are identical, don't update
    if (existingDesc === newDesc) {
      return {
        shouldUpdate: false,
        explanation: "Identical descriptions"
      };
    }
    // If new description is longer, use it
    if (newDesc.length > existingDesc.length) {
      return {
        shouldUpdate: true,
        updatedDescription: newDesc,
        explanation: "Using longer description due to analysis error"
      };
    }
    // Otherwise keep existing description
    return {
      shouldUpdate: false,
      explanation: "Keeping existing description due to analysis error"
    };
  }
}

export async function mergeEntryGroup(group: WIPEntry[]): Promise<WIPEntry> {
  // Sort entries by timestamp
  const sortedEntries = group.sort((a, b) => a.id - b.id);
  
  // Calculate total time
  const totalMinutes = group.reduce((sum, entry) => {
    return sum + (entry.timeInMinutes || (entry.hours ? Math.round(entry.hours * 60) : 0));
  }, 0);

  // Use the most confident client if available
  const knownClient = group.find(e => e.client !== "Unknown")?.client || "Unknown";

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

  // Combine all associated daily IDs
  const allAssociatedDailyIds = Array.from(new Set(
    group.flatMap(entry => entry.associatedDailyIds || [])
  )).sort((a, b) => a - b);

  console.log(`🔗 Combined ${allAssociatedDailyIds.length} associated daily entries`);

  return {
    id: mostRecentEntry.id,
    client: knownClient,
    project: mostRecentEntry.project,
    partner: mostRecentEntry.partner,
    timeInMinutes: totalMinutes,
    hours: totalMinutes / 60,
    description: finalDescription,
    hourlyRate: mostRecentEntry.hourlyRate,
    associatedDailyIds: allAssociatedDailyIds,
    subEntries: mostRecentEntry.subEntries || [],
    startDate: sortedEntries[0].startDate,
    lastWorkedDate: mostRecentEntry.lastWorkedDate
  };
} 
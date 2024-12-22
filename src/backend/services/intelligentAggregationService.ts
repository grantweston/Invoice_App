import { WIPEntry } from '@/src/types';
import { analyze } from '@/src/integrations/gemini/geminiService';

interface AggregationResult {
  shouldMerge: boolean;
  confidence: number;
  explanation: string;
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
function isSameProject(project1: string, project2: string): boolean {
  console.log(`\n📊 Comparing projects:
    Project 1: "${project1}"
    Project 2: "${project2}"`);

  const norm1 = normalizeProjectName(project1);
  const norm2 = normalizeProjectName(project2);
  
  // Direct match after normalization
  if (norm1 === norm2) {
    console.log('✅ Exact match after normalization');
    return true;
  }
  
  // Check if one contains the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    console.log('✅ One name contains the other');
    return true;
  }
  
  // Check for common variations
  const variations1 = [
    norm1,
    norm1.replace(/\s/g, ''),  // No spaces
    norm1.replace(/[aeiou]/g, '') // No vowels
  ];
  
  const variations2 = [
    norm2,
    norm2.replace(/\s/g, ''),
    norm2.replace(/[aeiou]/g, '')
  ];
  
  console.log(`Checking variations:
    Project 1: [${variations1.join(', ')}]
    Project 2: [${variations2.join(', ')}]`);
  
  // Check if any variation matches
  for (const v1 of variations1) {
    for (const v2 of variations2) {
      if (v1 === v2 || v1.includes(v2) || v2.includes(v1)) {
        console.log(`✅ Match found in variations: "${v1}" ≈ "${v2}"`);
        return true;
      }
    }
  }
  
  // Calculate similarity
  const similarity = getStringSimilarity(norm1, norm2);
  console.log(`📈 String similarity: ${similarity.toFixed(2)}`);
  
  const isSimilar = similarity > 0.7;
  console.log(isSimilar ? '✅ Similar enough to merge' : '❌ Not similar enough to merge');
  
  return isSimilar;
}

// Add helper function to check if clients are effectively the same
function isSameClient(client1: string, client2: string): boolean {
  // If either is Unknown, they can be merged
  if (client1 === "Unknown" || client2 === "Unknown") {
    console.log(`✅ Client match (one unknown): "${client1}" ≈ "${client2}"`);
    return true;
  }

  const norm1 = normalizeClientName(client1);
  const norm2 = normalizeClientName(client2);
  
  // Direct match after normalization
  if (norm1 === norm2) {
    console.log(`✅ Client match (exact): "${client1}" = "${client2}"`);
    return true;
  }
  
  // Check if one contains the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    console.log(`✅ Client match (contains): "${client1}" ≈ "${client2}"`);
    return true;
  }
  
  // Calculate similarity
  const similarity = getStringSimilarity(norm1, norm2);
  const isSimilar = similarity > 0.7;
  
  if (isSimilar) {
    console.log(`✅ Client match (similarity ${similarity.toFixed(2)}): "${client1}" ≈ "${client2}"`);
  } else {
    console.log(`❌ Client mismatch (similarity ${similarity.toFixed(2)}): "${client1}" ≠ "${client2}"`);
  }
  
  return isSimilar;
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

export async function shouldEntriesBeMerged(entry1: WIPEntry, entry2: WIPEntry): Promise<AggregationResult> {
  console.log(`\n🔄 Comparing entries for merging:`);
  console.log(`Entry 1: ${entry1.client} / ${entry1.project} / ${entry1.partner} - ${entry1.description}`);
  console.log(`Entry 2: ${entry2.client} / ${entry2.project} / ${entry2.partner} - ${entry2.description}`);

  // 1. First check client names
  if (!isSameClient(entry1.client, entry2.client)) {
    console.log('❌ Different clients - stopping comparison');
    return { shouldMerge: false, confidence: 1, explanation: "Different clients" };
  }
  console.log('✅ Client names match or can be merged');

  // 2. Then check project names
  if (!isSameProject(entry1.project, entry2.project)) {
    console.log('❌ Different projects - stopping comparison');
    return { shouldMerge: false, confidence: 1, explanation: "Different projects" };
  }
  console.log('✅ Project names match');

  // 3. Then check partner names with flexible matching
  if (!isSamePartner(entry1.partner, entry2.partner)) {
    console.log('❌ Different partners - stopping comparison');
    return { shouldMerge: false, confidence: 1, explanation: "Different partners" };
  }
  console.log('✅ Partner names match');

  // 4. Check time proximity
  const timeDiffMinutes = Math.abs(entry2.id - entry1.id) / (1000 * 60);
  console.log(`⏱️ Time difference: ${timeDiffMinutes.toFixed(1)} minutes`);

  // If entries are more than 30 minutes apart, require higher similarity
  const timeThreshold = timeDiffMinutes <= 30 ? 0.3 : 0.7;

  // 5. Compare descriptions
  const similarity = getStringSimilarity(entry1.description, entry2.description);
  console.log(`📊 Description similarity: ${similarity.toFixed(2)}`);

  // If descriptions are identical or very similar
  if (similarity > 0.8) {
    console.log('✅ Very similar descriptions');
    return {
      shouldMerge: true,
      confidence: similarity,
      explanation: "Very similar descriptions"
    };
  }

  // If entries are close in time and have moderate similarity
  if (timeDiffMinutes < 30 && similarity > timeThreshold) {
    console.log('✅ Recent entries with moderate similarity');
    return {
      shouldMerge: true,
      confidence: 0.8,
      explanation: "Recent entries with similar context"
    };
  }

  // For less obvious cases, use Gemini
  const prompt = `
  Analyze if these two work entries are part of the same ongoing work session.
  
  Entry 1:
  Client: "${entry1.client}"
  Project: "${entry1.project}"
  Partner: "${entry1.partner}"
  Description: "${entry1.description}"
  
  Entry 2:
  Client: "${entry2.client}"
  Project: "${entry2.project}"
  Partner: "${entry2.partner}"
  Description: "${entry2.description}"
  
  Time difference: ${timeDiffMinutes} minutes
  Description similarity score: ${similarity}
  
  Consider:
  1. The entries have matching client, project, and partner names
  2. Are these entries describing work on the same task/feature?
  3. Do they appear to be continuous work or related updates?
  4. Would these typically be tracked as a single work session?
  5. Given the ${timeDiffMinutes} minute time difference, is this likely the same session?
  
  Respond in JSON format:
  {
    "shouldMerge": boolean,
    "confidence": number (0-1),
    "explanation": "brief reason"
  }
  `;

  try {
    const response = await analyze(prompt);
    const result = JSON.parse(response);
    return {
      shouldMerge: result.shouldMerge,
      confidence: result.confidence,
      explanation: result.explanation
    };
  } catch (error) {
    console.error("Error analyzing entries:", error);
    // If Gemini fails but entries are close in time, use time-based merging
    if (timeDiffMinutes < 10) {
      return {
        shouldMerge: true,
        confidence: 0.7,
        explanation: "Recent entries, falling back to time-based merging"
      };
    }
    return { 
      shouldMerge: false, 
      confidence: 0,
      explanation: "Error in analysis" 
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
    associatedDailyIds: allAssociatedDailyIds
  };
} 
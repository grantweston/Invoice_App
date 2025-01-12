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

export async function compareDescriptions(desc1: string, desc2: string): Promise<boolean> {
  try {
    // Clean and normalize descriptions
    const cleanDesc1 = desc1.trim().toLowerCase();
    const cleanDesc2 = desc2.trim().toLowerCase();
    
    // If descriptions are identical, return true immediately
    if (cleanDesc1 === cleanDesc2) {
      return true;
    }

    // Split into bullet points if they exist
    const points1 = cleanDesc1.split(/[•\-\*]\s*/).map(p => p.trim()).filter(Boolean);
    const points2 = cleanDesc2.split(/[•\-\*]\s*/).map(p => p.trim()).filter(Boolean);
    
    // If either description has no valid points, compare as whole strings
    if (points1.length === 0 || points2.length === 0) {
      const similarity = calculateStringSimilarity(cleanDesc1, cleanDesc2);
      return similarity > 0.7; // 70% similarity threshold
    }

    // Compare each point
    let matchCount = 0;
    for (const point1 of points1) {
      for (const point2 of points2) {
        const similarity = calculateStringSimilarity(point1, point2);
        if (similarity > 0.7) { // 70% similarity threshold
          matchCount++;
          break;
        }
      }
    }

    // Calculate overall similarity based on matching points
    const overallSimilarity = matchCount / Math.min(points1.length, points2.length);
    return overallSimilarity > 0.5; // 50% of points should match
  } catch (error) {
    console.warn('⚠️ Error comparing descriptions:', error);
    // Fallback to simple string comparison
    return desc1.trim().toLowerCase() === desc2.trim().toLowerCase();
  }
}

// Helper function to calculate string similarity using Levenshtein distance
function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) {
    return 1.0;
  }
  
  const costs: number[] = [];
  for (let i = 0; i <= shorter.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= longer.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (shorter[i - 1] !== longer[j - 1]) {
          newValue = Math.min(
            Math.min(newValue, lastValue),
            costs[j]
          ) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) {
      costs[longer.length] = lastValue;
    }
  }
  
  const distance = costs[longer.length];
  return (longer.length - distance) / longer.length;
}

export async function mergeEntryGroup(entries: WIPEntry[]): Promise<WIPEntry> {
  if (entries.length === 0) {
    throw new Error('Cannot merge empty group of entries');
  }

  if (entries.length === 1) {
    return entries[0];
  }

  // Sort entries by lastWorkedDate to get the most recent one as base
  const sortedEntries = [...entries].sort((a, b) => 
    (b.lastWorkedDate || 0) - (a.lastWorkedDate || 0)
  );

  const baseEntry = sortedEntries[0];
  let mergedDescription = baseEntry.description || '';

  // Merge descriptions from other entries if they add new information
  for (const entry of sortedEntries.slice(1)) {
    if (entry.description) {
      const areSimilar = await compareDescriptions(mergedDescription, entry.description);
      if (!areSimilar) {
        // If descriptions are different, combine them with bullet points
        mergedDescription = mergeMultipleDescriptions(mergedDescription, entry.description);
      }
    }
  }

  // Combine all time entries
  const totalMinutes = entries.reduce((sum, entry) => sum + (entry.timeInMinutes || 0), 0);
  const totalHours = totalMinutes / 60;

  // Combine all associated daily IDs
  const associatedDailyIds = Array.from(new Set(
    entries.flatMap(entry => entry.associatedDailyIds || [])
  ));

  // Combine all sub-entries
  const subEntries = Array.from(new Set(
    entries.flatMap(entry => entry.subEntries || [])
  ));

  return {
    ...baseEntry,
    description: mergedDescription,
    timeInMinutes: totalMinutes,
    hours: totalHours,
    associatedDailyIds,
    subEntries,
    lastWorkedDate: Math.max(...entries.map(e => e.lastWorkedDate || 0))
  };
}

// Helper function to merge multiple descriptions
function mergeMultipleDescriptions(...descriptions: string[]): string {
  // Split descriptions into sentences
  const allSentences = descriptions.flatMap(desc => 
    desc.split(/[.!?]/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      // Remove any existing bullets or dashes
      .map(s => s.replace(/^[•\-]\s*/, ''))
  );
  
  // Remove duplicates
  const uniqueSentences = Array.from(new Set(allSentences));
  
  // Add bullet points and join
  return uniqueSentences.length > 0 
    ? uniqueSentences.map(s => `• ${s}`).join('\n')
    : 'No description available';
} 
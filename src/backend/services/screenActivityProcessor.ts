import type { WIPEntry } from '@/src/services/supabaseDB';
import type { ScreenAnalysis } from '@/src/services/screenAnalysisService';
import { shouldEntriesBeMerged } from './intelligentAggregationService';
import { getOrCreateUnknownClient } from '@/src/services/supabaseDB';

export function getDefaultHourlyRate(): number {
  try {
    // Check for test environment first
    if (process.env.NODE_ENV === 'test' && typeof localStorage !== 'undefined') {
      const settings = localStorage.getItem('userSettings');
      if (settings) {
        const parsed = JSON.parse(settings);
        if (parsed.defaultRate && !isNaN(parsed.defaultRate)) {
          return Number(parsed.defaultRate);
        }
      }
    }
    
    // Browser environment check
    if (typeof window !== 'undefined') {
      const settings = window.localStorage.getItem('userSettings');
      if (settings) {
        const parsed = JSON.parse(settings);
        if (parsed.defaultRate && !isNaN(parsed.defaultRate)) {
          return Number(parsed.defaultRate);
        }
      }
    }
  } catch (error) {
    console.error('Error getting default rate:', error);
  }
  return 150; // Fallback rate
}

function standardizeDescription(description: string): string {
  // Split into lines and standardize bullets
  const lines = description.split('\n').map(line => {
    line = line.trim();
    // Remove existing bullets/dashes
    line = line.replace(/^[-•*]\s*/, '');
    // Add standard bullet if not empty
    return line ? `- ${line}` : line;
  });
  // Filter empty lines and join
  return lines.filter(line => line).join('\n');
}

export function getActivePartner(): string {
  try {
    // Check for test environment first
    if (process.env.NODE_ENV === 'test' && typeof localStorage !== 'undefined') {
      const settings = localStorage.getItem('userSettings');
      if (settings) {
        const parsed = JSON.parse(settings);
        if (parsed.userName) {
          return parsed.userName;
        }
      }
    }
    
    // Browser environment check
    if (typeof window !== 'undefined') {
      const settings = window.localStorage.getItem('userSettings');
      if (settings) {
        const parsed = JSON.parse(settings);
        if (parsed.userName) {
          return parsed.userName;
        }
      }
    }
  } catch (error) {
    console.error('Error getting active partner:', error);
  }
  return 'Unknown'; // Fallback partner
}

export async function processScreenActivity(
  analysis: ScreenAnalysis,
  existingEntries: WIPEntry[] = []
): Promise<WIPEntry> {
  try {    
    // Get settings first
    const partner = getActivePartner();
    const hourlyRate = getDefaultHourlyRate();
    
    // Get or create the unknown client if needed
    let clientId = '';
    let clientAddress = '';
    
    if (analysis.client_name === 'Unknown') {
      const unknownClient = await getOrCreateUnknownClient(
        analysis.project_name || 'General',
        analysis.activity_description
      );
      clientId = unknownClient.id;
      clientAddress = unknownClient.address;
    }
    
    // Create base entry from analysis
    const newEntry: WIPEntry = {
      id: crypto.randomUUID(),
      description: standardizeDescription(analysis.activity_description),
      time_in_minutes: 1,
      hourly_rate: hourlyRate,
      date: new Date().toISOString(),
      client_id: clientId,
      client_name: analysis.client_name || 'Unknown',
      client_address: clientAddress || 'N/A',
      project_name: analysis.project_name || 'General',
      partner: partner,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Look for similar existing entries to potentially merge
    for (const existingEntry of existingEntries) {
      const { shouldMerge, confidence } = await shouldEntriesBeMerged(existingEntry, newEntry);
      
      if (shouldMerge && confidence > 0.7) {
        // Merge the entries
        const mergedEntry = {
          ...existingEntry,
          time_in_minutes: existingEntry.time_in_minutes + newEntry.time_in_minutes,
          description: standardizeDescription(existingEntry.description + '\n' + newEntry.description),
          updated_at: new Date().toISOString()
        };
        
        return mergedEntry;
      }
    }

    return newEntry;
  } catch (error) {
    console.error('Error in processScreenActivity:', error);
    throw error;
  }
} 
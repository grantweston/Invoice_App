import type { WIPEntry } from '@/src/types';
import type { ScreenAnalysis } from '@/src/services/screenAnalysisService';
import { shouldEntriesBeMerged } from './intelligentAggregationService';
import { getOrCreateUnknownClient } from '@/src/services/supabaseDB';

export function getDefaultHourlyRate(): number {
  try {
    if (typeof window === 'undefined') {
      return 150; // Default rate in non-browser environment
    }
    const settings = window.localStorage.getItem('userSettings');
    if (settings) {
      const parsed = JSON.parse(settings);
      if (parsed.defaultRate && !isNaN(parsed.defaultRate)) {
        return Number(parsed.defaultRate);
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
    if (typeof window === 'undefined') {
      console.log('Running in non-browser environment');
      return 'Unknown'; // Default partner in non-browser environment
    }
    const settings = window.localStorage.getItem('userSettings');
    console.log('Settings from localStorage:', settings);
    if (settings) {
      const parsed = JSON.parse(settings);
      console.log('Parsed settings:', parsed);
      if (parsed.userName) {
        console.log('Found userName:', parsed.userName);
        return parsed.userName;
      }
    }
  } catch (error) {
    console.error('Error getting active partner:', error);
  }
  console.log('Falling back to Unknown partner');
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
        // Always add the time
        newEntry.time_in_minutes += existingEntry.time_in_minutes;
        
        // Combine descriptions, avoiding duplicates
        const descriptions = new Set([
          existingEntry.description,
          newEntry.description
        ].flatMap(desc => desc.split('\n')));
        newEntry.description = Array.from(descriptions).join('\n');
        
        // Client info handling:
        // Always prefer existing client info over "Unknown"
        if (existingEntry.client_name !== "Unknown" && 
            (newEntry.client_name === "Unknown" || !newEntry.client_id)) {
          newEntry.client_id = existingEntry.client_id;
          newEntry.client_name = existingEntry.client_name;
          newEntry.client_address = existingEntry.client_address || '';
        }
        
        // Project name handling:
        // Use existing project if new one is empty or generic
        if (existingEntry.project_name && 
            (!newEntry.project_name || 
             newEntry.project_name.toLowerCase().includes('general'))) {
          newEntry.project_name = existingEntry.project_name;
        }
      }
    }

    return newEntry;
  } catch (error) {
    console.error('Error in processScreenActivity:', error);
    throw error;
  }
} 
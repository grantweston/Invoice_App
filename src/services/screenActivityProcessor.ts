import type { WIPEntry } from '@/src/types';
import type { ScreenAnalysis } from './screenAnalysisService';
import { shouldEntriesBeMerged } from '@/src/backend/services/intelligentAggregationService';

const DEFAULT_HOURLY_RATE = 150; // Default rate if none specified

export async function processScreenActivity(
  analysis: ScreenAnalysis,
  existingEntries: WIPEntry[] = []
): Promise<WIPEntry> {
  // Create base entry from analysis
  const newEntry: WIPEntry = {
    id: crypto.randomUUID(), // Generate a UUID for new entries
    description: analysis.activity_description,
    time_in_minutes: 1, // Start with 1 minute, will be updated by the recorder
    hourly_rate: DEFAULT_HOURLY_RATE,
    date: new Date().toISOString(),
    client_name: analysis.client_name,
    client_id: '', // Will be set if we find a matching client
    project_name: analysis.project_name || '',
    client_address: '', // Will be set if we find a matching client
    category: 'Development', // Default category
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Look for similar existing entries to potentially merge
  for (const existingEntry of existingEntries) {
    const { shouldMerge, confidence } = await shouldEntriesBeMerged(existingEntry, newEntry);
    
    if (shouldMerge && confidence > 0.7) {
      // Update time and description
      newEntry.time_in_minutes += existingEntry.time_in_minutes;
      newEntry.description = `${existingEntry.description}\n${newEntry.description}`;
      
      // Use existing client info if available
      if (existingEntry.client_id && existingEntry.client_name !== "Unknown") {
        newEntry.client_id = existingEntry.client_id;
        newEntry.client_name = existingEntry.client_name;
        newEntry.client_address = existingEntry.client_address || '';
      }
      
      // Use existing project if available
      if (existingEntry.project_name) {
        newEntry.project_name = existingEntry.project_name;
      }
      
      break;
    }
  }

  return newEntry;
} 
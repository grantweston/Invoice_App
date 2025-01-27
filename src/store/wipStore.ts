import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WIPEntry } from '@/src/types';
import { wipAggregationService } from '@/src/services/wipAggregationService';

interface WIPState {
  entries: WIPEntry[];
  addEntry: (entry: WIPEntry) => void;
  addEntries: (entries: WIPEntry[]) => void;
  removeEntry: (id: number) => void;
  removeEntries: (ids: number[]) => void;
  updateEntry: (id: number, updates: Partial<WIPEntry>) => void;
  clear: () => void;
  processNewDailyEntry: (dailyEntry: WIPEntry) => Promise<void>;
}

export const useWIPStore = create<WIPState>()(
  persist(
    (set, get) => ({
      entries: [],
      
      addEntry: (entry) => set((state) => ({
        entries: [...state.entries, entry]
      })),

      addEntries: (newEntries) => set((state) => ({
        entries: [...state.entries, ...newEntries]
      })),
      
      removeEntry: (id) => set((state) => ({
        entries: state.entries.filter(entry => entry.id !== id)
      })),

      removeEntries: (ids) => set((state) => ({
        entries: state.entries.filter(entry => !ids.includes(entry.id))
      })),
      
      updateEntry: (id, updates) => set((state) => ({
        entries: state.entries.map(entry =>
          entry.id === id ? { ...entry, ...updates } : entry
        )
      })),
      
      clear: () => set({ entries: [] }),

      processNewDailyEntry: async (dailyEntry: WIPEntry) => {
        const state = get();
        
        // Find matching WIP entry if it exists
        let matchingWipEntry: WIPEntry | undefined;
        for (const wipEntry of state.entries) {
          const isMatch = await wipAggregationService.areEntriesForSameWork(dailyEntry, wipEntry);
          if (isMatch) {
            matchingWipEntry = wipEntry;
            break;
          }
        }

        // Process the entry
        const result = await wipAggregationService.processNewDailyEntry(
          dailyEntry,
          matchingWipEntry
        );

        // Create new WIP entry if needed
        if (result.shouldCreateWip) {
          const newWipEntry: WIPEntry = {
            ...dailyEntry,
            description: result.updatedDescription!,
            id: Date.now(), // or however you generate IDs
          };
          state.addEntry(newWipEntry);
        }
        // Update existing WIP entry if description changed
        else if (result.updatedDescription && matchingWipEntry) {
          state.updateEntry(matchingWipEntry.id, {
            description: result.updatedDescription
          });
        }
      }
    }),
    {
      name: 'wip-storage'
    }
  )
); 
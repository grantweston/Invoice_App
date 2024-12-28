import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WIPEntry {
  id: string;
  client: string;
  project: string;
  description: string;
  timeInMinutes: number;
  hourlyRate: number;
  partner: string;
  associatedDailyIds: string[];
}

interface WIPState {
  entries: WIPEntry[];
  setEntries: (entries: WIPEntry[]) => void;
  addEntry: (entry: WIPEntry) => void;
  updateEntry: (id: string, updates: Partial<WIPEntry>) => void;
  deleteEntry: (id: string) => void;
  clearEntries: () => void;
}

export const useWIPStore = create<WIPState>()(
  persist(
    (set) => ({
      entries: [],
      setEntries: (entries) => set({ entries }),
      addEntry: (entry) => set((state) => ({ 
        entries: [...state.entries, entry] 
      })),
      updateEntry: (id, updates) => set((state) => ({
        entries: state.entries.map((entry) =>
          entry.id === id ? { ...entry, ...updates } : entry
        ),
      })),
      deleteEntry: (id) => set((state) => ({
        entries: state.entries.filter((entry) => entry.id !== id),
      })),
      clearEntries: () => set({ entries: [] }),
    }),
    {
      name: 'wip-storage',
    }
  )
); 
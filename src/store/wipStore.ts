import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WIPEntry } from '@/src/services/supabaseDB';

interface WIPState {
  entries: WIPEntry[];
  addEntry: (entry: WIPEntry) => void;
  updateEntry: (id: string, updates: Partial<WIPEntry>) => void;
  deleteEntry: (id: string) => void;
  setEntries: (entries: WIPEntry[]) => void;
}

export const useWIPStore = create<WIPState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) => {
        set((state) => ({
          entries: [...state.entries, entry]
        }));
      },
      updateEntry: (id, updates) => {
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id ? { ...entry, ...updates } : entry
          )
        }));
      },
      deleteEntry: (id) => {
        set((state) => ({
          entries: state.entries.filter((entry) => entry.id !== id)
        }));
      },
      setEntries: (entries) => {
        set({ entries });
      }
    }),
    {
      name: 'wip-storage'
    }
  )
); 
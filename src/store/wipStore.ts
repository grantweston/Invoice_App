import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WIPEntry } from '@/src/types';

interface WIPState {
  entries: WIPEntry[];
  addEntry: (entry: WIPEntry) => void;
  addEntries: (entries: WIPEntry[]) => void;
  removeEntry: (id: number) => void;
  removeEntries: (ids: number[]) => void;
  updateEntry: (id: number, updates: Partial<WIPEntry>) => void;
  clear: () => void;
}

export const useWIPStore = create<WIPState>()(
  persist(
    (set) => ({
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
      
      clear: () => set({ entries: [] })
    }),
    {
      name: 'wip-storage'
    }
  )
); 
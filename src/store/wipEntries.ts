import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WIPEntry } from '@/src/types';

interface WIPState {
  entries: WIPEntry[];
  totalHours: number;
  totalAmount: number;
  setWIPData: (data: { entries: WIPEntry[]; totalHours: number; totalAmount: number }) => void;
  appendWIPData: (data: { entries: WIPEntry[]; totalHours: number; totalAmount: number }) => void;
  clearWIPData: () => void;
  deleteEntry: (entryId: number) => void;
}

export const useWIPStore = create<WIPState>()(
  persist(
    (set) => ({
      entries: [],
      totalHours: 0,
      totalAmount: 0,
      setWIPData: (data) => set(data),
      appendWIPData: (data) => set((state) => ({
        entries: [...state.entries, ...data.entries],
        totalHours: state.totalHours + data.totalHours,
        totalAmount: state.totalAmount + data.totalAmount,
      })),
      clearWIPData: () => set({ entries: [], totalHours: 0, totalAmount: 0 }),
      deleteEntry: (entryId) => set((state) => {
        const entryToDelete = state.entries.find(e => e.id === entryId);
        if (!entryToDelete) return state;

        const timeInMinutes = entryToDelete.timeInMinutes || 0;
        const hours = timeInMinutes / 60;
        const amount = hours * (entryToDelete.hourlyRate || 0);

        return {
          entries: state.entries.filter(e => e.id !== entryId),
          totalHours: state.totalHours - hours,
          totalAmount: state.totalAmount - amount,
        };
      }),
    }),
    {
      name: 'wip-entries-storage',
    }
  )
); 
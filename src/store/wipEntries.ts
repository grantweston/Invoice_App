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
    }),
    {
      name: 'wip-entries-storage',
    }
  )
); 
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WIPEntry } from '@/src/types';

// Helper function to ensure numeric timeInMinutes
function getTimeInMinutes(entry: WIPEntry): number {
  return entry.timeInMinutes;
}

interface DailyLogsState {
  logs: WIPEntry[];
  addLog: (entry: WIPEntry) => void;
  clearLogs: () => void;
  updateMatchingLogs: (oldEntry: WIPEntry, newEntry: WIPEntry) => void;
  setLogs: (logs: WIPEntry[]) => void;
  deleteLogs: (entryToDelete: WIPEntry) => void;
}

export const useDailyLogs = create<DailyLogsState>()(
  persist(
    (set) => ({
      logs: [],
      addLog: (entry) => {
        // Force a numeric timeInMinutes
        const corrected = {
          ...entry,
          timeInMinutes: getTimeInMinutes(entry),
        };
        set((state) => ({ logs: [...state.logs, corrected] }));
      },
      clearLogs: () => {
        set({ logs: [] });
      },
      updateMatchingLogs: (oldEntry, newEntry) => {
        set((state) => {
          const updated = state.logs.map((log) => {
            if (log.client === oldEntry.client && log.project === oldEntry.project) {
              return {
                ...log,
                client: newEntry.client,
                project: newEntry.project,
                timeInMinutes: getTimeInMinutes(log),
              };
            }
            return log;
          });
          return { logs: updated };
        });
      },
      setLogs: (logs) => {
        // Ensure each entry has a numeric timeInMinutes
        const corrected = logs.map((l) => ({
          ...l,
          timeInMinutes: getTimeInMinutes(l),
        }));
        set({ logs: corrected });
      },
      deleteLogs: (entryToDelete) => {
        set((state) => {
          const updated = state.logs.filter(
            (log) =>
              !(
                log.client === entryToDelete.client &&
                log.project === entryToDelete.project
              )
          );
          return { logs: updated };
        });
      },
    }),
    { name: 'daily-logs-storage' }
  )
); 
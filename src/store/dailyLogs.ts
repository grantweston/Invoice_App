import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WIPEntry } from '@/src/types';

// Add helper function
const getTimeInMinutes = (entry: WIPEntry): number => {
  if (typeof entry.timeInMinutes === 'number') {
    return entry.timeInMinutes;
  }
  return entry.hours ? Math.round(entry.hours * 60) : 0;
};

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
        console.log('📝 Adding to daily logs:', entry);
        // Ensure both time formats are set
        const newEntry = {
          ...entry,
          timeInMinutes: getTimeInMinutes(entry),
          hours: getTimeInMinutes(entry) / 60
        };
        set((state) => {
          const newLogs = [...state.logs, newEntry];
          console.log('📊 Updated daily logs:', newLogs);
          return { logs: newLogs };
        });
      },
      clearLogs: () => {
        console.log('🧹 Clearing daily logs');
        set({ logs: [] });
      },
      updateMatchingLogs: (oldEntry, newEntry) => {
        set((state) => {
          const updatedLogs = state.logs.map(log => {
            // Match based on client and project
            if (log.client === oldEntry.client && log.project === oldEntry.project) {
              return {
                ...log,
                client: newEntry.client,
                project: newEntry.project,
                description: log.description,
                partner: log.partner,
                hourlyRate: log.hourlyRate,
                timeInMinutes: getTimeInMinutes(log),
                hours: getTimeInMinutes(log) / 60
              };
            }
            return log;
          });
          return { logs: updatedLogs };
        });
      },
      setLogs: (logs) => {
        console.log('📊 Setting daily logs:', logs);
        // Ensure both time formats are set for all logs
        const updatedLogs = logs.map(log => ({
          ...log,
          timeInMinutes: getTimeInMinutes(log),
          hours: getTimeInMinutes(log) / 60
        }));
        set({ logs: updatedLogs });
      },
      deleteLogs: (entryToDelete) => {
        console.log('🗑️ Deleting logs matching:', entryToDelete);
        set((state) => {
          const updatedLogs = state.logs.filter(log => 
            !(log.client === entryToDelete.client && log.project === entryToDelete.project)
          );
          return { logs: updatedLogs };
        });
      },
    }),
    {
      name: 'daily-logs-storage',
    }
  )
); 
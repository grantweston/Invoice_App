import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WIPEntry } from '@/src/types';

const getTimeInMinutes = (entry: WIPEntry): number => {
  return entry.time_in_minutes || 0;
};

interface DailyLogsState {
  logs: WIPEntry[];
  addLog: (description: string) => void;
  clearLogs: () => void;
  updateMatchingLogs: (oldEntry: WIPEntry, newEntry: WIPEntry) => void;
  setLogs: (logs: WIPEntry[]) => void;
  deleteLogs: (entryToDelete: WIPEntry) => void;
}

export const useDailyLogs = create<DailyLogsState>()(
  persist(
    (set) => ({
      logs: [],
      addLog: (description: string) => {
        // Get settings
        const settingsStr = localStorage.getItem('userSettings');
        const settings = settingsStr ? JSON.parse(settingsStr) : {};
        const partner = settings.userName || 'Unknown';
        const hourlyRate = settings.defaultRate || 150;

        const newLog: WIPEntry = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          description,
          time_in_minutes: 1,
          hourly_rate: hourlyRate,
          partner,
          client_name: 'Unknown',
          client_id: 'unknown',
          project_name: 'General'
        };
        set((state) => ({
          logs: [...state.logs, newLog]
        }));
      },
      clearLogs: () => {
        console.log('🧹 Clearing daily logs');
        set({ logs: [] });
      },
      updateMatchingLogs: (oldEntry, newEntry) => {
        set((state) => {
          const updatedLogs = state.logs.map(log => {
            // Match based on client and project
            if (log.client_name === oldEntry.client_name && log.project_name === oldEntry.project_name) {
              return {
                ...log,
                client_name: newEntry.client_name,
                project_name: newEntry.project_name,
                description: log.description,
                partner: log.partner,
                hourly_rate: log.hourly_rate,
                time_in_minutes: getTimeInMinutes(log)
              };
            }
            return log;
          });
          return { logs: updatedLogs };
        });
      },
      setLogs: (logs) => {
        console.log('📊 Setting daily logs:', logs);
        // Ensure time format is set for all logs
        const updatedLogs = logs.map(log => ({
          ...log,
          time_in_minutes: getTimeInMinutes(log)
        }));
        set({ logs: updatedLogs });
      },
      deleteLogs: (entryToDelete) => {
        console.log('🗑️ Deleting logs matching:', entryToDelete);
        set((state) => {
          const updatedLogs = state.logs.filter(log => 
            !(log.client_name === entryToDelete.client_name && log.project_name === entryToDelete.project_name)
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
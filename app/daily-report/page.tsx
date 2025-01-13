"use client";

import { Suspense, useEffect, useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import WIPTable from "@/app/components/WIPTable";
import { useDailyLogs, useWIPStore } from "@/src/store/supabaseStores";
import type { WIPEntry } from "@/src/types";
import { exportToExcel } from '@/src/services/excelExportService';

export default function DailyReport() {
  const logs = useDailyLogs((state) => state.logs);
  const [entries, setEntries] = useState(logs);

  // Update entries when logs change
  useEffect(() => {
    console.log('📊 Daily report logs updated:', logs);
    setEntries([...logs].sort((a, b) => b.id - a.id));

    // Recalculate WIP entries based on current daily logs
    const recalculateWipEntries = async () => {
      try {
        const wipStore = useWIPStore.getState();
        const currentWipEntries = wipStore.entries;
        console.log('Current WIP entries:', currentWipEntries);

        // Group daily logs by client and project for today only
        const today = new Date().setHours(0, 0, 0, 0);
        const groupedLogs = logs.reduce((acc, log) => {
          // Only group logs from today
          const logDate = new Date(log.startDate).setHours(0, 0, 0, 0);
          if (logDate !== today) return acc;

          const key = `${log.client}-${log.project}`;
          if (!acc[key]) {
            // Try to find existing WIP entry for this client/project from today
            const existingEntry = currentWipEntries.find(e => {
              const entryDate = new Date(e.startDate).setHours(0, 0, 0, 0);
              return e.client === log.client && 
                     e.project === log.project && 
                     entryDate === today;
            });

            acc[key] = {
              id: existingEntry?.id || Date.now(),
              client: log.client,
              project: log.project,
              partner: log.partner,
              hourlyRate: log.hourlyRate,
              timeInMinutes: 0,
              hours: 0,
              description: '',
              associatedDailyIds: [],
              startDate: log.startDate,
              lastWorkedDate: log.lastWorkedDate,
              subEntries: []
            };
          }

          // Add bullet point to description
          acc[key].description += (acc[key].description ? '\n' : '') + `• ${log.description}`;
          acc[key].timeInMinutes += 1;
          acc[key].associatedDailyIds.push(log.id);
          acc[key].lastWorkedDate = Math.max(acc[key].lastWorkedDate, log.lastWorkedDate);
          acc[key].hourlyRate = log.hourlyRate; // Use the most recent rate
          return acc;
        }, {} as Record<string, WIPEntry>);

        // Convert grouped logs to WIP entries
        const updatedWipEntries = Object.values(groupedLogs);
        
        // Calculate hours for each entry
        updatedWipEntries.forEach(entry => {
          entry.hours = entry.timeInMinutes / 60;
        });

        // Combine with existing entries from other days
        const otherDaysEntries = currentWipEntries.filter(entry => {
          const entryDate = new Date(entry.startDate).setHours(0, 0, 0, 0);
          return entryDate !== today;
        });

        const finalEntries = [...otherDaysEntries, ...updatedWipEntries];
        console.log('Final WIP entries:', finalEntries);

        // Update WIP store with recalculated entries
        await wipStore.setEntries(finalEntries);
        console.log('✅ WIP entries recalculated successfully');
      } catch (error) {
        console.error('❌ Failed to recalculate WIP entries:', error);
      }
    };

    recalculateWipEntries();
  }, [logs]);

  // Clear all data
  const clearAllData = () => {
    if (window.confirm('Are you sure you want to delete all entries?')) {
      console.log('🧹 Clearing all data...');
      useDailyLogs.getState().clearLogs();
      setEntries([]);
    }
  };

  // Handle entry deletion
  const handleEntryDelete = async (entryToDelete: WIPEntry) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        // Get current WIP entries
        const wipStore = useWIPStore.getState();
        const wipEntries = wipStore.entries;

        // Find and update any WIP entries that reference this daily entry
        for (const wipEntry of wipEntries) {
          if (wipEntry.associatedDailyIds?.includes(entryToDelete.id)) {
            // Remove the bullet point corresponding to this entry's description
            const bulletToRemove = `• ${entryToDelete.description}`;
            const updatedDescription = wipEntry.description
              .split('\n')
              .filter(line => line.trim() !== bulletToRemove.trim())
              .join('\n');

            // Update the WIP entry
            const updatedEntry = {
              ...wipEntry,
              description: updatedDescription,
              associatedDailyIds: wipEntry.associatedDailyIds.filter(id => id !== entryToDelete.id),
              timeInMinutes: wipEntry.timeInMinutes - 1,
              hours: (wipEntry.timeInMinutes - 1) / 60
            };
            
            await wipStore.updateEntry(wipEntry.id.toString(), updatedEntry);
          }
        }

        // Delete from daily logs
        await useDailyLogs.getState().deleteLogs(entryToDelete);
        console.log('✅ Entry deleted successfully');

        // Update local state
        setEntries(prev => prev.filter(entry => entry.id !== entryToDelete.id));
      } catch (error) {
        console.error('❌ Failed to delete entry:', error);
      }
    }
  };

  // Handle entry updates
  const handleEntryUpdate = (updatedEntry: WIPEntry) => {
    // Update in daily logs store
    const currentLogs = useDailyLogs.getState().logs;
    const updatedLogs = currentLogs.map(entry => 
      entry.id === updatedEntry.id ? updatedEntry : entry
    );
    useDailyLogs.getState().setLogs(updatedLogs);
    
    // Update local state
    setEntries(prev => prev.map(entry => 
      entry.id === updatedEntry.id ? updatedEntry : entry
    ));
  };

  // Helper function to format time
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold">Daily Activity</h1>
            <p className="text-sm text-gray-600">
              Showing individual time entries from screen recording analysis
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
              onClick={clearAllData}
            >
              Clear All Data
            </button>
            <button
              onClick={() => exportToExcel(logs, [])}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export to Excel
            </button>
          </div>
        </div>
        <WIPTable 
          entries={entries}
          onEntryUpdate={handleEntryUpdate}
          onDelete={handleEntryDelete}
          isEditable={true}
          showTimestamp={true}
          showTotalCost={false}
        />
      </div>
    </Suspense>
  );
}
"use client";

import { Suspense, useEffect, useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import WIPTable from "@/app/components/WIPTable";
import { useDailyLogs } from "@/src/store/dailyLogs";
import type { WIPEntry } from "@/src/types";
import { exportToExcel } from '@/src/services/excelExportService';

export default function DailyReport() {
  const logs = useDailyLogs((state) => state.logs);
  const [entries, setEntries] = useState(logs);

  // Update entries when logs change
  useEffect(() => {
    console.log('📊 Daily report logs updated:', logs);
    setEntries([...logs].sort((a, b) => b.id - a.id));
  }, [logs]);

  // Auto-refresh every second
  useEffect(() => {
    // Initial update
    setEntries([...logs].sort((a, b) => b.id - a.id));

    // Set up interval for updates
    const interval = setInterval(() => {
      const currentLogs = useDailyLogs.getState().logs;
      if (JSON.stringify(currentLogs) !== JSON.stringify(entries)) {
        console.log('🔄 Refreshing daily report...');
        setEntries([...currentLogs].sort((a, b) => b.id - a.id));
      }
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, []);

  // Clear all data
  const clearAllData = () => {
    if (window.confirm('Are you sure you want to delete all entries?')) {
      console.log('🧹 Clearing all data...');
      useDailyLogs.getState().clearLogs();
      setEntries([]);
    }
  };

  // Handle entry deletion
  const handleEntryDelete = (entryToDelete: WIPEntry) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      // Remove from daily logs store
      const currentLogs = useDailyLogs.getState().logs;
      const updatedLogs = currentLogs.filter(entry => entry.id !== entryToDelete.id);
      useDailyLogs.getState().setLogs(updatedLogs);
      
      // Update local state
      setEntries(prev => prev.filter(entry => entry.id !== entryToDelete.id));
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

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold">Daily Time Sheet</h1>
            <p className="text-sm text-gray-600">
              Showing individual time entries from screen recording analysis
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="bg-yellow-200 dark:bg-yellow-500/40
                hover:bg-yellow-300 dark:hover:bg-yellow-500/50 
                text-yellow-800 dark:text-yellow-200 border border-yellow-400 dark:border-yellow-500/40 
                hover:border-yellow-500 dark:hover:border-yellow-500/50
                px-4 py-1.5 rounded-lg text-xs h-[38px] transition-all duration-150 hover:scale-105 shadow-lg"
              onClick={clearAllData}
            >
              Clear All Data
            </button>
            <button
              onClick={() => exportToExcel([], entries)}
              className="bg-emerald-200 dark:bg-emerald-500/40
                hover:bg-emerald-300 dark:hover:bg-emerald-500/50 
                text-emerald-800 dark:text-emerald-200 border border-emerald-400 dark:border-emerald-500/40 
                hover:border-emerald-500 dark:hover:border-emerald-500/50
                px-4 py-1.5 rounded-lg text-xs h-[38px] flex items-center gap-1 transition-all duration-150 hover:scale-105 shadow-lg"
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
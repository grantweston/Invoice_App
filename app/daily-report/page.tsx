"use client";

import { Suspense, useEffect, useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import WIPTable from "@/app/components/WIPTable";
import { useDailyLogs } from "@/src/store/supabaseStores";
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
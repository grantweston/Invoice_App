"use client";

import { Suspense, useEffect, useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import WIPTable from "@/app/components/WIPTable";
import { useDailyLogs } from "@/src/store/dailyLogs";
import type { WIPEntry } from "@/src/types";

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
          <button
            type="button"
            className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
            onClick={clearAllData}
          >
            Clear All Data
          </button>
        </div>
        <WIPTable 
          entries={entries}
          onEntryUpdate={() => {}}
          onDelete={handleEntryDelete}
          isEditable={false}
          showTimestamp={true}
          showTotalCost={false}
        />
      </div>
    </Suspense>
  );
}
"use client";

import { useState, useEffect, useRef } from 'react';
import WIPTable from "@/app/components/WIPTable";
import type { WIPEntry } from "@/src/types";
import { useDailyLogs } from "@/src/store/dailyLogs";
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useNormalizedNames } from "@/src/store/normalizedNames";
import { 
  findRelatedEntries, 
  mergeEntryGroup
} from '@/src/backend/services/intelligentAggregationService';
<<<<<<< HEAD
=======
import { useRecordingState } from '@/src/store/recordingState';
>>>>>>> gemini-updates
import { exportToExcel } from '@/src/services/excelExportService';
import { FileDown } from 'lucide-react';

interface PageClientProps {
  initialEntries: WIPEntry[];
}

interface WIPState {
  entries: WIPEntry[];
  setEntries: (entries: WIPEntry[] | ((prev: WIPEntry[]) => WIPEntry[])) => void;
  clearEntries: () => void;
}

const useWIPStore = create<WIPState>()(
  persist(
    (set) => ({
      entries: [],
      setEntries: (entries) => set((state) => ({
        entries: typeof entries === 'function' ? entries(state.entries) : entries
      })),
      clearEntries: () => set({ entries: [] }),
    }),
    {
      name: 'wip-storage',
    }
  )
);

// Helper function to normalize entries
async function normalizeEntries(entries: WIPEntry[]): Promise<WIPEntry[]> {
  // First, find related entries using intelligent analysis
  const groups = await findRelatedEntries(entries);
  
  // Then merge each group into a single entry
  const mergedEntries = await Promise.all(groups.map(group => mergeEntryGroup(group)));
  return mergedEntries;
}

export default function PageClient({ initialEntries }: PageClientProps) {
  const [defaultPartner, setDefaultPartner] = useState('');
  const [defaultRate, setDefaultRate] = useState(0);
  const [activePartner, setActivePartner] = useState('');
  const lastNormalizedRef = useRef<string>('');
  const getNormalizedName = useNormalizedNames((state) => state.getNormalizedName);
  
  // Use persisted WIP store instead of local state
  const wipEntries = useWIPStore((state) => state.entries);
  const setWipEntries = useWIPStore((state) => state.setEntries);

  // Initialize WIP entries from store or initial entries
  useEffect(() => {
    const initializeEntries = async () => {
      if (initialEntries.length > 0 && wipEntries.length === 0) {
        try {
          const normalizedEntries = await normalizeEntries(initialEntries);
          setWipEntries(normalizedEntries);
        } catch (error) {
          console.error("Error normalizing initial entries:", error);
        }
      }
    };
    
    initializeEntries();
  }, [initialEntries, wipEntries.length, setWipEntries]);

  // Load settings from localStorage
  useEffect(() => {
    const savedPartner = localStorage.getItem('defaultPartner') || '';
    const savedRate = parseFloat(localStorage.getItem('defaultRate') || '0');
    const savedActivePartner = localStorage.getItem('activePartner') || savedPartner;
    setDefaultPartner(savedPartner);
    setDefaultRate(savedRate);
    setActivePartner(savedActivePartner);
  }, []);

<<<<<<< HEAD
=======
  // Save settings
  const saveSettings = () => {
    localStorage.setItem('defaultPartner', defaultPartner);
    localStorage.setItem('defaultRate', defaultRate.toString());
    localStorage.setItem('activePartner', activePartner);
    setShowSettings(false);
  };

  // Update new entries with defaults
  const updateWipFromDaily = async (newDailyEntry: WIPEntry) => {
    try {
      // First, check if this entry should be merged with an existing WIP entry
      for (const existingEntry of wipEntries) {
        const { shouldMerge, confidence } = await shouldEntriesBeMerged(existingEntry, newDailyEntry);
        
        if (shouldMerge && confidence > 0.7) {
          console.log('🔄 Merging with existing WIP entry:', existingEntry.id);
          
          // Update the existing entry's time
          const updatedEntries = await Promise.all(wipEntries.map(async entry => {
            if (entry.id === existingEntry.id) {
              // Increment time by 1 minute (the daily entry's duration)
              const newMinutes = (entry.timeInMinutes || 0) + (newDailyEntry.timeInMinutes || 0);
              
              // Create updated entry with new time and potentially new client
              let updatedEntry = {
                ...entry,
                timeInMinutes: newMinutes,
                hours: newMinutes / 60,
                // If client was unknown but now known, update it
                client: entry.client === "Unknown" && newDailyEntry.client !== "Unknown" 
                  ? newDailyEntry.client 
                  : entry.client,
                // Add the new daily entry ID to the associations
                associatedDailyIds: [...(entry.associatedDailyIds || []), newDailyEntry.id]
              };

              // Compare descriptions synchronously
              try {
                const comparison = await compareDescriptions(entry.description, newDailyEntry.description);
                if (comparison.shouldUpdate && comparison.updatedDescription) {
                  console.log('📝 Updating description based on new daily entry');
                  updatedEntry = {
                    ...updatedEntry,
                    description: comparison.updatedDescription
                  };
                }
              } catch (error) {
                console.error('Error comparing descriptions:', error);
              }

              return updatedEntry;
            }
            return entry;
          }));

          setWipEntries(updatedEntries);
          return; // Exit after finding and updating a match
        }
      }

      // If no match found, create a new WIP entry
      console.log('➕ Creating new WIP entry for daily entry');
      const updatedEntries = [...wipEntries, { 
        ...newDailyEntry,
        partner: defaultPartner,
        hourlyRate: defaultRate,
        associatedDailyIds: [newDailyEntry.id] // Initialize with the current daily entry ID
      }];

      // Normalize and merge similar entries
      const normalized = await normalizeEntries(updatedEntries);
      console.log('🔄 Normalized entries:', normalized);
      setWipEntries(normalized);
    } catch (error) {
      console.error("Error updating WIP from daily:", error);
    }
  };

  // Add normalize function
  const normalizeAllEntries = async () => {
    console.log('🔄 Manually normalizing WIP entries...');
    
    try {
      // Normalize WIP entries only
      const normalizedWipEntries = await normalizeEntries(wipEntries);
      
      // Update WIP store
      setWipEntries(normalizedWipEntries);
    } catch (error) {
      console.error("Error normalizing entries:", error);
    }
  };

  // Clear all data
  const clearAllData = () => {
    if (window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      console.log('🧹 Clearing all data...');
      
      // Clear WIP store
      clearWipEntries();
      
      // Clear Daily Logs store
      clearDailyLogs();
      
      // Reset local state
      setStatus('');
      setLastUpdateTime(null);
      
      // Force reload the stores
      useWIPStore.persist.clearStorage();
      useDailyLogs.persist.clearStorage();
      
      console.log('✅ All data cleared successfully');
      setStatus('All data cleared');
    }
  };

  // Handle new screen analysis
  const handleScreenBatch = async (screenshots: string[]) => {
    try {
      if (screenshots.length < 12) {
        console.log(`⏳ Waiting for more screenshots (${screenshots.length}/12)...`);
        return;
      }

      const now = new Date();
      console.log(`📤 Sending batch of ${screenshots.length} screenshots for analysis...`);

      const response = await fetch('/api/analyze-screen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          screenshots,
          currentTasks: wipEntries
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze screenshots');
      }

      const analysis: ScreenAnalysis = await response.json();
      console.log('📊 Received analysis:', analysis);
      
      if (analysis.confidence_score > 0) {
        // Create a single daily entry for this minute
        const dailyEntry = {
          id: Date.now(),
          client: analysis.client_name,
          project: analysis.project_name,
          timeInMinutes: 1,
          hours: 1/60,
          partner: activePartner || defaultPartner,
          hourlyRate: defaultRate,
          description: analysis.detailed_description || analysis.activity_description || 'No description available',
          associatedDailyIds: [],
          subEntries: [],
          startDate: Date.now(),
          lastWorkedDate: Date.now()
        };

        // Add the daily entry
        addDailyLog(dailyEntry);
        console.log('📝 Created daily entry:', dailyEntry);

        // Look for matching WIP entry to update
        const matchingEntry = wipEntries.find(entry => {
          if (analysis.client_name !== "Unknown") {
            return isSimilarName(entry.client, analysis.client_name) &&
                   isSimilarName(entry.project, analysis.project_name);
          }
          return isSimilarName(entry.project, analysis.project_name);
        });

        if (matchingEntry) {
          // Update existing WIP entry
          const updatedEntry = {
            ...matchingEntry,
            client: matchingEntry.client === "Unknown" && analysis.client_name !== "Unknown" 
              ? analysis.client_name 
              : matchingEntry.client,
            timeInMinutes: getTimeInMinutes(matchingEntry) + 1,
            hours: (getTimeInMinutes(matchingEntry) + 1) / 60,
            description: mergeDescriptions(matchingEntry.description, analysis.activity_description || ''),
            associatedDailyIds: [...(matchingEntry.associatedDailyIds || []), dailyEntry.id],
            lastWorkedDate: Date.now()
          };
          
          setWipEntries(prev => prev.map(entry => 
            entry.id === matchingEntry.id ? updatedEntry : entry
          ));
        } else {
          // Create new WIP entry
          const newEntry = {
            id: Date.now() + 1,
            client: analysis.client_name,
            project: analysis.project_name,
            timeInMinutes: 1,
            hours: 1/60,
            partner: activePartner || defaultPartner,
            hourlyRate: defaultRate,
            description: analysis.activity_description || 'No description available',
            associatedDailyIds: [dailyEntry.id],
            subEntries: [],
            startDate: Date.now(),
            lastWorkedDate: Date.now()
          };
          
          setWipEntries(prev => [...prev, newEntry]);
        }

        setLastUpdateTime(now);
      }
    } catch (error) {
      console.error('❌ Failed to analyze screenshots:', error);
      setStatus('Failed to analyze screen activity');
    }
  };

  async function startWorkSession() {
    try {
      console.log('🎬 Starting work session...');
      setStatus('Starting recording...');
      
      await recorder.startRecording(handleScreenBatch);
      setLastUpdateTime(new Date());
      
      setStatus('Recording in progress...');
      console.log('✅ Work session started successfully');
    } catch (error) {
      console.error('❌ Failed to start work session:', error);
      setStatus(`Error: ${error.message}`);
    }
  }

  async function endWorkSession() {
    try {
      console.log('🛑 Ending work session...');
      setStatus('Stopping recording...');
      
      await recorder.stopRecording();
      setLastUpdateTime(null);
      setStatus('Recording saved successfully');
      console.log('✅ Work session ended successfully');
    } catch (error) {
      console.error('❌ Failed to end work session:', error);
      setStatus(`Error: ${error.message}`);
    }
  }

>>>>>>> gemini-updates
  // Handle entry updates
  const handleEntryUpdate = (updatedEntry: WIPEntry) => {
    // Find the old entry before updating
    const oldEntry = wipEntries.find(entry => entry.id === updatedEntry.id);
    if (!oldEntry) return;

    // Update WIP entries without normalization
    setWipEntries((prev: WIPEntry[]) => 
      prev.map(entry => 
        entry.id === updatedEntry.id ? updatedEntry : entry
      )
    );

    // If client name changed, update matching entries in daily logs
    if (oldEntry.client !== updatedEntry.client) {
      const dailyLogs = useDailyLogs.getState().logs;
      const updatedDailyLogs = dailyLogs.map(log => 
        log.client === oldEntry.client ? { ...log, client: updatedEntry.client } : log
      );
      useDailyLogs.getState().setLogs(updatedDailyLogs);
    }
  };

  const handleEntryBlur = async () => {
    try {
      const normalizedEntries = await normalizeEntries(wipEntries);
      setWipEntries(normalizedEntries);
    } catch (error) {
      console.error("Error normalizing entries on blur:", error);
    }
  };

  const handleEntryDelete = (entryToDelete: WIPEntry) => {
    setWipEntries(prev => prev.filter(entry => entry.id !== entryToDelete.id));
  };

  useEffect(() => {
    const aggregateEntries = async () => {
      if (wipEntries.length === 0) return;

      try {
        const normalizedEntries = await normalizeEntries(wipEntries);
        setWipEntries(normalizedEntries);
      } catch (error) {
        console.error("Error aggregating entries:", error);
      }
    };

    // Run aggregation when component mounts
    aggregateEntries();
  }, []); // Empty dependency array means this runs once on mount

  const handleExportToExcel = () => {
    exportToExcel(wipEntries, useDailyLogs.getState().logs);
  };

  return (
<<<<<<< HEAD
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold">Work In Progress (WIP) Dashboard</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Active Partner: {activePartner}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToExcel(wipEntries, useDailyLogs.getState().logs)}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs h-[38px] flex items-center gap-1"
=======
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-300">Work In Progress Report</h1>
          <p className="text-sm text-gray-600">
            Showing aggregated timesheet entries by project
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
            onClick={() => exportToExcel(wipEntries, useDailyLogs.getState().logs)}
            className="bg-emerald-200 dark:bg-emerald-500/40
              hover:bg-emerald-300 dark:hover:bg-emerald-500/50 
              text-emerald-800 dark:text-emerald-200 border border-emerald-400 dark:border-emerald-500/40 
              hover:border-emerald-500 dark:hover:border-emerald-500/50
              px-4 py-1.5 rounded-lg text-xs h-[38px] flex items-center gap-1 transition-all duration-150 hover:scale-105 shadow-lg"
>>>>>>> gemini-updates
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export to Excel
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <WIPTable 
          entries={wipEntries} 
          onEntryUpdate={handleEntryUpdate}
          onDelete={handleEntryDelete}
          onBlur={handleEntryBlur}
          isEditable={true}
        />
      </div>
    </div>
  );
}
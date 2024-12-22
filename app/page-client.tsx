"use client";

import { useState, useEffect, useRef } from 'react';
import { ClientScreenRecorder } from '@/src/services/clientScreenRecorder';
import type { ScreenAnalysis } from '@/src/services/screenAnalysisService';
import WIPTable from "./components/WIPTable";
import type { WIPEntry } from "@/src/types";
import { useDailyLogs } from "@/src/store/dailyLogs";
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useNormalizedNames } from "@/src/store/normalizedNames";
import { 
  findRelatedEntries, 
  mergeEntryGroup, 
  shouldEntriesBeMerged,
  compareDescriptions 
} from '@/src/backend/services/intelligentAggregationService';

const recorder = new ClientScreenRecorder();

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

// Helper function to merge descriptions intelligently
function mergeDescriptions(...descriptions: string[]): string {
  // Split and clean up descriptions
  const allParts = descriptions.flatMap(desc => 
    desc.toLowerCase().split(/[,.]/).map(p => p.trim()).filter(Boolean)
  );
  
  // Combine and deduplicate parts using array methods
  const uniqueParts = Array.from(new Set(allParts));
  
  // Join parts and capitalize first letter
  const combined = uniqueParts.join(', ');
  return combined.charAt(0).toUpperCase() + combined.slice(1);
}

// Helper function to determine if two tasks are similar
function isSimilarTask(task1: WIPEntry, task2: WIPEntry): boolean {
  // Direct match
  if (task1.client === task2.client && task1.project === task2.project) {
    return true;
  }

  // Check for similar client/project names (case insensitive)
  const client1 = task1.client.toLowerCase().replace(/\s+/g, ' ').trim();
  const client2 = task2.client.toLowerCase().replace(/\s+/g, ' ').trim();
  const project1 = task1.project.toLowerCase().replace(/\s+/g, ' ').trim();
  const project2 = task2.project.toLowerCase().replace(/\s+/g, ' ').trim();

  // Normalize common variations
  const normalizeText = (text: string): string => {
    return text
      .replace(/&/g, 'and')
      .replace(/\s+and\s+/g, ' and ')
      .replace(/\s*,\s*/g, ' and ')
      .replace(/\s+/g, ' ')
      .replace(/development/gi, 'dev')
      .replace(/application/gi, 'app')
      .replace(/preparation/gi, 'prep')
      .trim();
  };

  const normalizedClient1 = normalizeText(client1);
  const normalizedClient2 = normalizeText(client2);
  const normalizedProject1 = normalizeText(project1);
  const normalizedProject2 = normalizeText(project2);

  // Check if clients are similar
  const clientsMatch = 
    normalizedClient1 === normalizedClient2 || 
    normalizedClient1.includes(normalizedClient2) || 
    normalizedClient2.includes(normalizedClient1) ||
    // Check for name order variations (e.g., "Jack and Michelle" vs "Michelle and Jack")
    normalizedClient1.split(' and ').sort().join(' ') === normalizedClient2.split(' and ').sort().join(' ');

  // Check if projects are similar
  const projectsMatch = 
    normalizedProject1 === normalizedProject2 ||
    normalizedProject1.includes(normalizedProject2) || 
    normalizedProject2.includes(normalizedProject1) ||
    // Common variations
    (normalizedProject1.includes('dev') && normalizedProject2.includes('dev')) ||
    (normalizedProject1.includes('app') && normalizedProject2.includes('app')) ||
    (normalizedProject1.includes('prep') && normalizedProject2.includes('prep'));

  return clientsMatch && projectsMatch;
}

// Helper function to find most common variant
function findMostCommonVariant(variants: string[]): string {
  const counts = variants.reduce((acc, variant) => {
    acc[variant] = (acc[variant] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([variant]) => variant)[0];
}

// Helper function to generate a unique ID
function generateUniqueId(): number {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

// Add this helper function at the top with other helpers
const getTimeInMinutes = (entry: WIPEntry): number => {
  if (typeof entry.timeInMinutes === 'number') {
    return entry.timeInMinutes;
  }
  return entry.hours ? Math.round(entry.hours * 60) : 0;
};

// Replace the normalizeEntries function with:
async function normalizeEntries(entries: WIPEntry[]): Promise<WIPEntry[]> {
  // First, find related entries using intelligent analysis
  const groups = await findRelatedEntries(entries);
  
  // Then merge each group into a single entry
  const mergedEntries = await Promise.all(groups.map(group => mergeEntryGroup(group)));
  return mergedEntries;
}

// Add this function at the top with other helper functions
function isSimilarName(name1: string, name2: string): boolean {
  const clean1 = name1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const clean2 = name2.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Check if one is contained in the other
  if (clean1.includes(clean2) || clean2.includes(clean1)) {
    const similarity = Math.max(
      clean1.length / clean2.length,
      clean2.length / clean1.length
    );
    return similarity > 0.7; // 70% similarity threshold
  }
  return false;
}

export default function PageClient({ initialEntries }: PageClientProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('');
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const addDailyLog = useDailyLogs((state) => state.addLog);
  const clearDailyLogs = useDailyLogs((state) => state.clearLogs);
  const lastNormalizedRef = useRef<string>('');
  const getNormalizedName = useNormalizedNames((state) => state.getNormalizedName);
  
  // Use persisted WIP store instead of local state
  const wipEntries = useWIPStore((state) => state.entries);
  const setWipEntries = useWIPStore((state) => state.setEntries);
  const clearWipEntries = useWIPStore((state) => state.clearEntries);

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

  // Remove periodic normalization effect
  // We'll only normalize on blur now

  // Add settings state
  const [showSettings, setShowSettings] = useState(false);
  const [defaultPartner, setDefaultPartner] = useState('');
  const [defaultRate, setDefaultRate] = useState(0);

  // Load settings from localStorage
  useEffect(() => {
    const savedPartner = localStorage.getItem('defaultPartner') || '';
    const savedRate = parseFloat(localStorage.getItem('defaultRate') || '0');
    setDefaultPartner(savedPartner);
    setDefaultRate(savedRate);
  }, []);

  // Save settings
  const saveSettings = () => {
    localStorage.setItem('defaultPartner', defaultPartner);
    localStorage.setItem('defaultRate', defaultRate.toString());
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
    console.log('🔄 Manually normalizing all entries...');
    
    try {
      // Get all entries from both stores
      const dailyLogs = useDailyLogs.getState().logs;
      const allEntries = [...wipEntries, ...dailyLogs];
      
      // Normalize WIP entries
      const normalizedWipEntries = await normalizeEntries(wipEntries);
      
      // Normalize daily logs
      const normalizedDailyEntries = await normalizeEntries(dailyLogs);
      
      // Update both stores
      setWipEntries(normalizedWipEntries);
      useDailyLogs.getState().setLogs(normalizedDailyEntries);
    } catch (error) {
      console.error("Error normalizing all entries:", error);
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
      if (screenshots.length < 60) {
        console.log(`⏳ Waiting for more screenshots (${screenshots.length}/60)...`);
        return;
      }

      const now = new Date();
      const timeSinceLastUpdate = lastUpdateTime ? now.getTime() - lastUpdateTime.getTime() : Infinity;
      if (timeSinceLastUpdate < 30000) {
        console.log('🔄 Skipping analysis - too soon since last update');
        return;
      }

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
        // Look for existing entries with matching project/description
        const matchingEntry = wipEntries.find(entry => {
          // If we have a known client, match by client and project
          if (analysis.client_name !== "Unknown") {
            return isSimilarName(entry.client, analysis.client_name) &&
                   isSimilarName(entry.project, analysis.project_name);
          }
          
          // For unknown client, match by project and description similarity
          return isSimilarName(entry.project, analysis.project_name) &&
                 isSimilarDescription(entry.description, analysis.activity_description || '');
        });

        // Look for recent unknown entries that might be related
        const recentUnknownEntries = analysis.client_name !== "Unknown" ? 
          wipEntries.filter(entry => 
            entry.client === "Unknown" &&
            isSimilarName(entry.project, analysis.project_name) &&
            isRecentEntry(entry.id, 30) // Within last 30 minutes
          ) : [];

        if (matchingEntry) {
          // Update existing entry
          const updatedEntry = {
            ...matchingEntry,
            // Update client name if we now know it and old one was unknown
            client: matchingEntry.client === "Unknown" && analysis.client_name !== "Unknown" 
              ? analysis.client_name 
              : matchingEntry.client,
            timeInMinutes: getTimeInMinutes(matchingEntry) + 1,
            hours: (getTimeInMinutes(matchingEntry) + 1) / 60,
            description: mergeDescriptions(matchingEntry.description, analysis.activity_description || '')
          };
          
          // Create daily log entry first to get its ID
          const dailyEntry = {
            id: Date.now(),
            client: updatedEntry.client,
            project: updatedEntry.project,
            timeInMinutes: 1,
            hours: 1/60,
            partner: defaultPartner,
            hourlyRate: defaultRate,
            description: analysis.detailed_description || analysis.activity_description || 'No description available',
            associatedDailyIds: [],
            subEntries: [],
            startDate: Date.now(),
            lastWorkedDate: Date.now()
          };
          
          // Add the daily entry
          addDailyLog(dailyEntry);
          
          // Now update the WIP entry with the new daily entry ID
          const finalUpdatedEntry = {
            ...updatedEntry,
            associatedDailyIds: [...(updatedEntry.associatedDailyIds || []), dailyEntry.id]
          };
          
          setWipEntries(prev => prev.map(entry => 
            entry.id === matchingEntry.id ? finalUpdatedEntry : entry
          ));

          // Update recent unknown entries if we found a client
          if (analysis.client_name !== "Unknown" && recentUnknownEntries.length > 0) {
            setWipEntries(prev => prev.map(entry => 
              recentUnknownEntries.some(unknown => unknown.id === entry.id)
                ? { ...entry, client: analysis.client_name }
                : entry
            ));
          }
        } else {
          // Create daily entry first
          const dailyEntry = {
            id: Date.now(),
            client: analysis.client_name,
            project: analysis.project_name,
            timeInMinutes: 1,
            hours: 1/60,
            partner: defaultPartner,
            hourlyRate: defaultRate,
            description: analysis.detailed_description || analysis.activity_description || 'No description available',
            associatedDailyIds: [],
            subEntries: [],
            startDate: Date.now(),
            lastWorkedDate: Date.now()
          };
          
          // Add the daily entry
          addDailyLog(dailyEntry);
          
          // Create new WIP entry linked to the daily entry
          const newEntry = {
            id: Date.now() + 1, // Ensure different ID from daily entry
            client: analysis.client_name,
            project: analysis.project_name,
            timeInMinutes: 1,
            hours: 1/60,
            partner: defaultPartner,
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
      setIsRecording(true);
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
      setIsRecording(false);
      setLastUpdateTime(null);
      setStatus('Recording saved successfully');
      console.log('✅ Work session ended successfully');
    } catch (error) {
      console.error('❌ Failed to end work session:', error);
      setStatus(`Error: ${error.message}`);
    }
  }

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

  // Handle entry blur (when user finishes editing)
  const handleEntryBlur = async () => {
    try {
      const normalizedEntries = await normalizeEntries(wipEntries);
      if (JSON.stringify(normalizedEntries) !== JSON.stringify(wipEntries)) {
        console.log('🔄 Normalizing entries after edit...');
        setWipEntries(normalizedEntries);
        
        // Update daily logs with new normalized names
        const dailyLogs = useDailyLogs.getState().logs;
        const normalizedDailyEntries = await normalizeEntries(dailyLogs);
        useDailyLogs.getState().setLogs(normalizedDailyEntries);
      }
    } catch (error) {
      console.error("Error normalizing entries:", error);
    }
  };

  // Handle entry deletion
  const handleEntryDelete = (entryToDelete: WIPEntry) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      // Remove from WIP entries
      setWipEntries((prev: WIPEntry[]) => 
        prev.filter(entry => entry.id !== entryToDelete.id)
      );

      // Remove from daily logs
      useDailyLogs.getState().deleteLogs(entryToDelete);
    }
  };

  // Add these helper functions
  function isSimilarDescription(desc1: string, desc2: string): boolean {
    const words1 = desc1.toLowerCase().split(/\W+/);
    const words2 = desc2.toLowerCase().split(/\W+/);
    
    // Count matching words
    const matches = words1.filter(word => 
      word.length > 3 && words2.includes(word)
    ).length;
    
    // Calculate similarity score
    const similarity = matches / Math.min(words1.length, words2.length);
    return similarity > 0.3; // 30% word match threshold
  }

  function isRecentEntry(id: number, minutes: number): boolean {
    const entryTime = new Date(id);
    const now = new Date();
    const diffMinutes = (now.getTime() - entryTime.getTime()) / (1000 * 60);
    return diffMinutes <= minutes;
  }

  // Update the useEffect that manages entries:
  useEffect(() => {
    const aggregateEntries = async () => {
      if (wipEntries.length === 0) return;
      
      try {
        const aggregated = await normalizeEntries(wipEntries);
        setWipEntries(aggregated);
      } catch (error) {
        console.error("Error aggregating entries:", error);
      }
    };

    // Debounce the aggregation to avoid too frequent updates
    const timeoutId = setTimeout(aggregateEntries, 5000);
    return () => clearTimeout(timeoutId);
  }, [wipEntries]);

  // Add this effect to periodically check for entries that should be merged
  useEffect(() => {
    const checkForMerges = async () => {
      if (wipEntries.length < 2) return;

      try {
        console.log('🔄 Checking for entries to merge...');
        const normalized = await normalizeEntries(wipEntries);
        
        // Only update if there are changes
        if (JSON.stringify(normalized) !== JSON.stringify(wipEntries)) {
          console.log('✨ Found entries to merge, updating...');
          setWipEntries(normalized);
          
          // Update daily logs with new normalized names
          const dailyLogs = useDailyLogs.getState().logs;
          const normalizedDailyEntries = await normalizeEntries(dailyLogs);
          useDailyLogs.getState().setLogs(normalizedDailyEntries);
        } else {
          console.log('✓ No new merges needed');
        }
      } catch (error) {
        console.error("Error checking for merges:", error);
      }
    };

    // Check every 30 seconds
    const intervalId = setInterval(checkForMerges, 30000);
    
    // Run once immediately
    checkForMerges();

    return () => clearInterval(intervalId);
  }, [wipEntries]); // Depend on wipEntries to catch new entries

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Work In Progress (WIP) Dashboard
        </h1>
        
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              isRecording 
                ? "bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed opacity-75" 
                : "bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800 shadow-sm hover:shadow"
            }`}
            onClick={startWorkSession}
            disabled={isRecording}
          >
            <span className="flex items-center gap-2">
              {isRecording ? (
                <>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  Recording...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                  </svg>
                  Begin Work Session
                </>
              )}
            </span>
          </button>

          <button
            type="button"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              !isRecording
                ? "bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed opacity-75"
                : "bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 shadow-sm hover:shadow"
            }`}
            onClick={endWorkSession}
            disabled={!isRecording}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              End Session
            </span>
          </button>

          <button
            type="button"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-yellow-600 text-white hover:bg-yellow-700 
              dark:bg-yellow-700 dark:hover:bg-yellow-800 transition-all duration-150 shadow-sm hover:shadow"
            onClick={clearAllData}
            disabled={isRecording}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear Data
            </span>
          </button>

          <button
            type="button"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-100 text-primary-700 hover:bg-primary-200
              dark:bg-primary-900/30 dark:text-primary-300 dark:hover:bg-primary-900/50 transition-all duration-150 shadow-sm hover:shadow"
            onClick={() => setShowSettings(true)}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </span>
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-xl w-full max-w-md m-4 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Default Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Default Partner Name
                </label>
                <input
                  type="text"
                  value={defaultPartner}
                  onChange={(e) => setDefaultPartner(e.target.value)}
                  className="w-full p-2 border dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600
                    bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 transition-colors duration-150"
                  placeholder="Enter partner name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Default Hourly Rate
                </label>
                <input
                  type="number"
                  value={defaultRate}
                  onChange={(e) => setDefaultRate(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  className="w-full p-2 border dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600
                    bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 transition-colors duration-150"
                  placeholder="Enter hourly rate"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-dark-border
                    hover:bg-gray-200 dark:hover:bg-dark-bg transition-colors duration-150"
                  onClick={() => setShowSettings(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700
                    dark:bg-primary-700 dark:hover:bg-primary-800 transition-colors duration-150"
                  onClick={saveSettings}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Aggregated Time by Client & Project
        </h2>
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
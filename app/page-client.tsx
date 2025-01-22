"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { ClientScreenRecorder } from '@/src/services/clientScreenRecorder';
import type { ScreenAnalysis } from '@/src/services/screenAnalysisService';
import WIPTable from "@/app/components/WIPTable";
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
import { useRecordingState } from '@/src/store/recordingState';
import { exportToExcel } from '@/src/services/excelExportService';
import { FileDown } from 'lucide-react';

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

// Helper function to merge multiple descriptions intelligently
function mergeMultipleDescriptions(...descriptions: string[]): string {
  // Split descriptions into sentences
  const allSentences = descriptions.flatMap(desc => 
    desc.split(/[.!?]/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      // Remove any existing bullets or dashes
      .map(s => s.replace(/^[•\-]\s*/, ''))
  );
  
  // Remove duplicates
  const uniqueSentences = Array.from(new Set(allSentences));
  
  // Add bullet points and join
  return uniqueSentences.length > 0 
    ? uniqueSentences.map(s => `• ${s}`).join('\n')
    : 'No description available';
}

// Helper function for merging two descriptions with bullet points
function mergeDescriptions(existingDesc: string, newDesc: string): string {
  return mergeMultipleDescriptions(existingDesc, newDesc);
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
  const { isRecording, setIsRecording } = useRecordingState();
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

  // Format currency helper
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format time helper
  const formatTime = (hours: number): string => {
    const totalMinutes = Math.round(hours * 60);
    if (totalMinutes === 0) return '0 min';
    
    const displayHours = Math.floor(totalMinutes / 60);
    const displayMinutes = totalMinutes % 60;
    
    if (displayHours === 0) return `${displayMinutes} min`;
    if (displayMinutes === 0) return displayHours === 1 ? '1 hour' : `${displayHours} hours`;
    return `${displayHours} ${displayHours === 1 ? 'hour' : 'hours'}, ${displayMinutes} min`;
  };

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
  const [activePartner, setActivePartner] = useState('');

  // Load settings from localStorage
  useEffect(() => {
    const savedPartner = localStorage.getItem('defaultPartner') || '';
    const savedRate = parseFloat(localStorage.getItem('defaultRate') || '0');
    const savedActivePartner = localStorage.getItem('activePartner') || savedPartner;
    setDefaultPartner(savedPartner);
    setDefaultRate(savedRate);
    setActivePartner(savedActivePartner);
  }, []);

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
      if (screenshots.length < 60) {
        console.log(`⏳ Waiting for more screenshots (${screenshots.length}/60)...`);
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
        if (JSON.stringify(aggregated) !== JSON.stringify(wipEntries)) {
          console.log('✨ Found entries to merge, updating...');
          setWipEntries(aggregated);
        }
      } catch (error) {
        console.error("Error aggregating entries:", error);
      }
    };

    // Debounce the aggregation to avoid too frequent updates
    const timeoutId = setTimeout(aggregateEntries, 1000);
    return () => clearTimeout(timeoutId);
  }, [wipEntries]);

  // Group WIP entries by client for invoice generation
  const clientProjects = useMemo(() => {
    const grouped = wipEntries.reduce((acc, entry) => {
      if (!acc[entry.client]) {
        acc[entry.client] = {
          projects: {},
          totalAmount: 0,
          totalHours: 0
        };
      }
      
      if (!acc[entry.client].projects[entry.project]) {
        acc[entry.client].projects[entry.project] = {
          entries: [],
          totalHours: 0,
          totalAmount: 0
        };
      }
      
      const hours = getTimeInMinutes(entry) / 60;
      const amount = hours * entry.hourlyRate;
      
      acc[entry.client].projects[entry.project].entries.push(entry);
      acc[entry.client].projects[entry.project].totalHours += hours;
      acc[entry.client].projects[entry.project].totalAmount += amount;
      acc[entry.client].totalHours += hours;
      acc[entry.client].totalAmount += amount;
      
      return acc;
    }, {} as Record<string, {
      projects: Record<string, {
        entries: WIPEntry[];
        totalHours: number;
        totalAmount: number;
      }>;
      totalAmount: number;
      totalHours: number;
    }>);
    
    return grouped;
  }, [wipEntries]);

  const handleExportToExcel = () => {
    exportToExcel(wipEntries, useDailyLogs.getState().logs);
  };

  return (
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
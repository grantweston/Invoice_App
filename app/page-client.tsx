"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { ClientScreenRecorder } from '@/src/services/clientScreenRecorder';
import type { ScreenAnalysis } from '@/src/services/screenAnalysisService';
import WIPTable from "@/app/components/WIPTable";
import type { WIPEntry } from "@/src/types";
import { useDailyLogs, useWIPStore } from "@/src/store/supabaseStores";
import { useNormalizedNames } from "@/src/store/normalizedNames";
import { 
  findRelatedEntries, 
  mergeEntryGroup, 
  shouldEntriesBeMerged,
  compareDescriptions 
} from '@/src/backend/services/intelligentAggregationService';
import WorkSessionButton from './components/WorkSessionButton';
import { useRecordingState } from '@/src/store/recordingState';
import { exportToExcel } from '@/src/services/excelExportService';

const recorder = new ClientScreenRecorder();

interface PageClientProps {
  initialEntries: WIPEntry[];
}

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
      console.log('🔄 Initializing entries...');
      console.log('Initial entries:', initialEntries);
      console.log('Current WIP entries:', wipEntries);
      
      try {
        // First load from Supabase
        await useWIPStore.getState().loadEntries();
        console.log('✅ Loaded entries from Supabase');
        
        // Then add any new initial entries if needed
        if (initialEntries.length > 0 && wipEntries.length === 0) {
          console.log('💾 Adding initial entries to Supabase...');
          const normalizedEntries = await normalizeEntries(initialEntries);
          await useWIPStore.getState().setEntries(normalizedEntries);
          console.log('✅ Initial entries added to Supabase');
        }
      } catch (error) {
        console.error("❌ Error initializing entries:", error);
      }
    };
    
    initializeEntries();
  }, [initialEntries, wipEntries.length]);

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

  // Update WIP entries with defaults
  const updateWipFromDaily = async (newEntry: { 
    id: number;
    client: string;
    project: string;
    description: string;
    timeInMinutes: number;
    partner: string;
    hourlyRate: number;
    startDate: number;
    lastWorkedDate: number;
    associatedDailyIds: number[];
    subEntries: any[];
  }) => {
    console.log('🔄 Processing new daily entry:', newEntry);
    
    // Get current entries directly from store
    const currentEntries = useWIPStore.getState().entries;
    
    // Find matching entry by client and project from today
    const existingEntry = currentEntries.find(entry => 
      entry.client === newEntry.client && 
      entry.project === newEntry.project &&
      new Date(entry.startDate).toDateString() === new Date(newEntry.startDate).toDateString()
    );

    if (existingEntry) {
      console.log('📝 Found existing entry to update:', existingEntry);
      
      // Update the existing entry
      const updatedEntry: WIPEntry = {
        ...existingEntry,
        timeInMinutes: existingEntry.timeInMinutes + 1,
        hours: (existingEntry.timeInMinutes + 1) / 60,
        lastWorkedDate: newEntry.lastWorkedDate,
        description: newEntry.description,
        associatedDailyIds: Array.from(new Set([...(existingEntry.associatedDailyIds || []), newEntry.id]))
      };

      console.log('✏️ Updating existing entry:', updatedEntry);
      await useWIPStore.getState().updateEntry(existingEntry.id.toString(), updatedEntry);
      
    } else {
      console.log('➕ Creating new WIP entry from daily entry');
      
      // Create new entry starting at 1 minute
      const newWipEntry: WIPEntry = {
        client: newEntry.client,
        project: newEntry.project,
        timeInMinutes: 1,
        hours: 1/60,
        description: newEntry.description,
        startDate: newEntry.startDate,
        lastWorkedDate: newEntry.lastWorkedDate,
        hourlyRate: newEntry.hourlyRate,
        partner: newEntry.partner,
        subEntries: [],
        associatedDailyIds: [newEntry.id]
      };

      console.log('💾 Adding new WIP entry:', newWipEntry);
      await useWIPStore.getState().addEntry(newWipEntry);
    }
  };

  // Add normalize function
  const normalizeAllEntries = async () => {
    console.log('🔄 Manually normalizing WIP entries...');
    
    try {
      // Normalize WIP entries only
      const normalizedWipEntries = await normalizeEntries(wipEntries);
      
      // Update WIP store
      useWIPStore.getState().setEntries(normalizedWipEntries);
    } catch (error) {
      console.error("Error normalizing entries:", error);
    }
  };

  // Clear all data
  const clearAllData = () => {
    if (window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      console.log('🧹 Clearing all data...');
      
      // Clear WIP store
      useWIPStore.getState().clearEntries();
      
      // Clear Daily Logs store
      clearDailyLogs();
      
      // Reset local state
      setStatus('');
      setLastUpdateTime(null);
      
      console.log('✅ All data cleared successfully');
      setStatus('All data cleared');
    }
  };

  // Handle new screen analysis
  const handleScreenBatch = async (screenshots: string[]) => {
    const now = Date.now(); // Current timestamp in milliseconds
    
    let dailyEntryCreated = false;
    let createdDailyEntry = null;

    try {
      // 1. Validate screenshots
      if (!Array.isArray(screenshots) || screenshots.length === 0) {
        throw new Error('No screenshots provided');
      }

      // 2. Get current partner
      const currentPartner = activePartner || defaultPartner || '';

      // 3. Analyze screenshots
      console.log('🔍 Analyzing screenshots...');
      const response = await fetch('/api/analyze-screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screenshots })
      });

      if (!response.ok) {
        throw new Error(`Failed to analyze screenshots: [${response.status} ${response.statusText}]`);
      }

      const analysis = await response.json();
      console.log('✅ Analysis complete:', analysis);

      // Validate and normalize analysis data
      const clientName = analysis.client_name === 'unknown' ? 'Unspecified Client' : analysis.client_name;
      const projectName = analysis.project || 'General Work';
      const description = analysis.activity_description || 'No description available';

      // 4. Create daily entry
      const dailyEntry = {
        client: clientName,
        project: projectName,
        description: description,
        timeInMinutes: 1,
        hours: 1/60,
        partner: currentPartner,
        hourlyRate: 150,
        startDate: now,
        lastWorkedDate: now,
        subEntries: [],
        associatedDailyIds: []
      };

      // 5. Add daily entry to Supabase
      try {
        console.log('📝 Creating daily entry:', dailyEntry);
        createdDailyEntry = await useDailyLogs.getState().addLog(dailyEntry);
        
        if (!createdDailyEntry?.id) {
          throw new Error('Daily entry created but no ID returned');
        }
        
        dailyEntryCreated = true;
        console.log('✅ Daily entry created successfully:', createdDailyEntry);
        
      } catch (error) {
        console.error('❌ Failed to create daily entry:', error);
        throw error;
      }
      
      // 6. Update WIP Entry
      try {
        // Get fresh entries from store
        const currentEntries = useWIPStore.getState().entries;
        
        // Find existing entry from today only
        const today = new Date(now).setHours(0, 0, 0, 0);
        const existingEntry = currentEntries.find(entry => {
          const entryDate = new Date(entry.startDate).setHours(0, 0, 0, 0);
          const clientMatch = entry.client.toLowerCase() === clientName.toLowerCase();
          const projectMatch = entry.project.toLowerCase() === projectName.toLowerCase();
          const isToday = entryDate === today;
          
          if (clientMatch && projectMatch && isToday) {
            console.log('🎯 Found matching entry:', entry);
            return true;
          }
          return false;
        });

        if (existingEntry) {
          console.log('📝 Updating existing WIP entry:', existingEntry.id);
          console.log('Current time:', existingEntry.timeInMinutes, 'minutes');
          
          // Ensure we're only adding 1 minute
          const newTimeInMinutes = existingEntry.timeInMinutes + 1;
          console.log('New time will be:', newTimeInMinutes, 'minutes');
          
          const updatedEntry = {
            ...existingEntry,
            timeInMinutes: newTimeInMinutes,
            hours: newTimeInMinutes / 60,
            lastWorkedDate: now,
            description: mergeDescriptions(existingEntry.description, description),
            associatedDailyIds: Array.from(new Set([
              ...(existingEntry.associatedDailyIds || []),
              createdDailyEntry.id
            ]))
          };
          
          await useWIPStore.getState().updateEntry(existingEntry.id.toString(), updatedEntry);
          console.log('✅ WIP entry updated successfully');
          
        } else {
          console.log('📝 Creating new WIP entry');
          
          const newWipEntry = {
            ...dailyEntry,
            timeInMinutes: 1, // Start with exactly 1 minute
            hours: 1/60,     // Start with exactly 1/60 hour
            associatedDailyIds: [createdDailyEntry.id]
          };
          
          await useWIPStore.getState().addEntry(newWipEntry);
          console.log('✅ New WIP entry created successfully');
        }
        
        setLastUpdateTime(new Date(now));
        setStatus('Activity recorded successfully');
        console.log('✨ Screenshot batch processed successfully');
        
      } catch (error) {
        console.error('❌ Failed to update WIP entry:', error);
        setStatus('Warning: Daily log saved but WIP entry update failed');
        
        // Clean up daily entry if WIP entry failed
        if (dailyEntryCreated && createdDailyEntry?.id) {
          try {
            await useDailyLogs.getState().deleteLogs(createdDailyEntry);
            console.log('🧹 Cleaned up daily entry after WIP entry failure');
          } catch (cleanupError) {
            console.error('❌ Failed to clean up daily entry:', cleanupError);
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Screenshot batch processing failed:', error);
      setStatus('Error: Failed to process screenshots');
      
      // Clean up daily entry if WIP entry failed
      if (dailyEntryCreated && createdDailyEntry?.id) {
        try {
          await useDailyLogs.getState().deleteLogs(createdDailyEntry);
          console.log('🧹 Cleaned up daily entry after WIP entry failure');
        } catch (cleanupError) {
          console.error('❌ Failed to clean up daily entry:', cleanupError);
        }
      }
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
    useWIPStore.getState().updateEntry(updatedEntry.id.toString(), updatedEntry);

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
        useWIPStore.getState().setEntries(normalizedEntries);
      }
    } catch (error) {
      console.error("Error normalizing entries:", error);
    }
  };

  // Handle entry deletion
  const handleEntryDelete = async (entryToDelete: WIPEntry) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        // Remove from WIP entries
        await useWIPStore.getState().deleteEntry(entryToDelete.id.toString());
        console.log('✅ Deleted from WIP entries');

        // Remove from daily logs
        await useDailyLogs.getState().deleteLogs(entryToDelete);
        console.log('✅ Deleted from daily logs');
      } catch (error) {
        console.error('❌ Failed to delete entry:', error);
      }
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
          useWIPStore.getState().setEntries(aggregated);
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

  useEffect(() => {
    const initializeStores = async () => {
      // Initialize Supabase stores
      await Promise.all([
        useDailyLogs.getState().loadLogs(),
        useWIPStore.getState().loadEntries()
      ]);
      
      console.log('Stores initialized with Supabase data');
    };

    initializeStores();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-none">
            Work In Progress (WIP) Dashboard
          </h1>
          <div className="flex items-center gap-2 bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 px-3 py-1.5 rounded text-xs border dark:border-dark-border h-[38px]">
            <span className="text-gray-500 dark:text-gray-400">Active Partner:</span>
            <select
              value={activePartner}
              onChange={(e) => {
                setActivePartner(e.target.value);
                localStorage.setItem('activePartner', e.target.value);
              }}
              className="bg-transparent border-none focus:ring-0 focus:outline-none text-xs text-gray-900 dark:text-gray-100"
            >
              <option value="">Select Partner</option>
              {Array.from(new Set(wipEntries.map(e => e.partner))).filter(Boolean).map(partner => (
                <option key={partner} value={partner}>{partner}</option>
              ))}
              {!wipEntries.some(e => e.partner === defaultPartner) && defaultPartner && (
                <option value={defaultPartner}>{defaultPartner}</option>
              )}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <WorkSessionButton
              onStart={startWorkSession}
              onEnd={endWorkSession}
            />
            <button
              onClick={() => exportToExcel(wipEntries, useDailyLogs.getState().logs)}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs h-[38px] flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export to Excel
            </button>
          </div>
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
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

// Helper function to normalize and merge similar entries
function normalizeEntries(entries: WIPEntry[], getNormalizedName: (type: 'clients' | 'projects', original: string) => string, preserveDescriptions: boolean = false): WIPEntry[] {
  // Group similar clients
  const clientGroups: Record<string, WIPEntry[]> = {};
  
  entries.forEach(entry => {
    // Get normalized client name
    const normalizedClientName = getNormalizedName('clients', entry.client);
    
    // Find if we have a similar client group
    const similarClientGroup = Object.keys(clientGroups).find(client => 
      isSimilarTask({ client, project: '', description: '' } as WIPEntry, { ...entry, client: normalizedClientName } as WIPEntry)
    );

    if (similarClientGroup) {
      clientGroups[similarClientGroup].push(entry);
    } else {
      clientGroups[normalizedClientName] = [entry];
    }
  });

  // For each client group, group by similar projects
  const normalizedEntries: WIPEntry[] = [];
  
  Object.entries(clientGroups).forEach(([clientName, clientEntries]) => {
    const projectGroups: Record<string, WIPEntry[]> = {};

    clientEntries.forEach(entry => {
      // Get normalized project name
      const normalizedProjectName = getNormalizedName('projects', entry.project);
      
      const similarProjectGroup = Object.keys(projectGroups).find(project =>
        isSimilarTask({ client: '', project, description: '' } as WIPEntry, { ...entry, project: normalizedProjectName } as WIPEntry)
      );

      if (similarProjectGroup) {
        projectGroups[similarProjectGroup].push(entry);
      } else {
        projectGroups[normalizedProjectName] = [entry];
      }
    });

    // Merge entries with similar projects
    Object.entries(projectGroups).forEach(([projectName, projectEntries]) => {
      if (preserveDescriptions) {
        // Keep each entry separate with normalized client/project names
        projectEntries.forEach(entry => {
          normalizedEntries.push({
            ...entry,
            id: entry.id, // Keep original ID
            client: clientName,
            project: projectName,
            // Keep original description and other fields
            description: entry.description,
            partner: entry.partner || '',
            hourlyRate: entry.hourlyRate || 0
          });
        });
      } else {
        // Merge entries for WIP view
        const totalHours = projectEntries.reduce((sum, e) => sum + e.hours, 0);
        const descriptions = projectEntries.map(e => e.description);
        const mostRecentEntry = projectEntries.sort((a, b) => b.id - a.id)[0];
        
        normalizedEntries.push({
          id: generateUniqueId(),
          client: clientName,
          project: projectName,
          hours: totalHours,
          description: mergeDescriptions(...descriptions),
          partner: mostRecentEntry.partner || '',
          hourlyRate: mostRecentEntry.hourlyRate || 0
        });
      }
    });
  });

  return normalizedEntries;
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
    if (initialEntries.length > 0 && wipEntries.length === 0) {
      // Normalize initial entries before setting
      const normalizedEntries = normalizeEntries(initialEntries, getNormalizedName, false);
      setWipEntries(normalizedEntries);
    }
  }, [initialEntries, wipEntries.length, setWipEntries, getNormalizedName]);

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
  const updateWipFromDaily = (newDailyEntry: WIPEntry) => {
    setWipEntries((prev: WIPEntry[]) => {
      // Add new entry to existing entries with defaults
      const updatedEntries = [...prev, { 
        ...newDailyEntry,
        partner: defaultPartner,
        hourlyRate: defaultRate
      }];
      // Normalize and merge similar entries
      const normalized = normalizeEntries(updatedEntries, getNormalizedName);
      console.log('🔄 Normalized entries:', normalized);
      return normalized;
    });
  };

  // Add normalize function
  const normalizeAllEntries = () => {
    console.log('🔄 Manually normalizing all entries...');
    
    // Get all entries from both stores
    const dailyLogs = useDailyLogs.getState().logs;
    const allEntries = [...wipEntries, ...dailyLogs];
    
    // Normalize WIP entries
    const normalizedWipEntries = normalizeEntries(wipEntries, getNormalizedName, false);
    
    // Normalize daily logs (preserve descriptions)
    const normalizedDailyEntries = normalizeEntries(dailyLogs, getNormalizedName, true);
    
    // Update both stores
    setWipEntries(normalizedWipEntries);
    useDailyLogs.getState().setLogs(normalizedDailyEntries);
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
            hours: matchingEntry.hours + 1/60,
            description: mergeDescriptions(matchingEntry.description, analysis.activity_description || '')
          };
          
          setWipEntries(prev => prev.map(entry => 
            entry.id === matchingEntry.id ? updatedEntry : entry
          ));

          // Update recent unknown entries if we found a client
          if (analysis.client_name !== "Unknown" && recentUnknownEntries.length > 0) {
            setWipEntries(prev => prev.map(entry => 
              recentUnknownEntries.some(unknown => unknown.id === entry.id)
                ? { ...entry, client: analysis.client_name }
                : entry
            ));
          }
          
          // Create daily log entry with existing names
          const dailyEntry = {
            id: Date.now(),
            client: updatedEntry.client,
            project: updatedEntry.project,
            hours: 1/60,
            partner: defaultPartner,
            hourlyRate: defaultRate,
            description: analysis.detailed_description || analysis.activity_description || 'No description available'
          };
          
          addDailyLog(dailyEntry);
        } else {
          // Create new entry
          const newEntry = {
            id: Date.now(),
            client: analysis.client_name,
            project: analysis.project_name,
            hours: 1/60,
            partner: defaultPartner,
            hourlyRate: defaultRate,
            description: analysis.activity_description || 'No description available'
          };
          
          setWipEntries(prev => [...prev, newEntry]);
          
          // Create daily log entry
          const dailyEntry = {
            ...newEntry,
            description: analysis.detailed_description || analysis.activity_description || 'No description available'
          };
          
          addDailyLog(dailyEntry);
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
  const handleEntryBlur = () => {
    // Add a small delay to ensure the latest state is used
    setTimeout(() => {
      // Normalize entries after user finishes editing
      const normalizedEntries = normalizeEntries(wipEntries, getNormalizedName, false);
      if (JSON.stringify(normalizedEntries) !== JSON.stringify(wipEntries)) {
        console.log('🔄 Normalizing entries after edit...');
        setWipEntries(normalizedEntries);
        
        // Update daily logs with new normalized names
        const dailyLogs = useDailyLogs.getState().logs;
        const normalizedDailyEntries = normalizeEntries(dailyLogs, getNormalizedName, true);
        useDailyLogs.getState().setLogs(normalizedDailyEntries);
      }
    }, 100);
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

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Work In Progress (WIP) Dashboard</h1>

      <div className="mb-4 flex space-x-2">
        <button
          type="button"
          className={`px-3 py-1 rounded text-sm ${
            isRecording 
              ? "bg-gray-400 text-white cursor-not-allowed" 
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
          onClick={startWorkSession}
          disabled={isRecording}
        >
          {isRecording ? "Recording in Progress..." : "Begin Work Session"}
        </button>

        <button
          type="button"
          className="bg-red-600 text-white px-3 py-1 rounded text-sm"
          onClick={endWorkSession}
          disabled={!isRecording}
        >
          End Work Session
        </button>

        <button
          type="button"
          className="bg-yellow-600 text-white px-3 py-1 rounded text-sm"
          onClick={clearAllData}
          disabled={isRecording}
        >
          Clear All Data
        </button>

        <button
          type="button"
          className="bg-purple-600 text-white px-3 py-1 rounded text-sm"
          onClick={() => setShowSettings(true)}
        >
          Settings
        </button>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg shadow-lg w-96">
            <h2 className="text-lg font-semibold mb-4">Default Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Default Partner Name
                </label>
                <input
                  type="text"
                  value={defaultPartner}
                  onChange={(e) => setDefaultPartner(e.target.value)}
                  className="mt-1 block w-full p-2 border rounded"
                  placeholder="Enter partner name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Default Hourly Rate
                </label>
                <input
                  type="number"
                  value={defaultRate}
                  onChange={(e) => setDefaultRate(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full p-2 border rounded"
                  placeholder="Enter hourly rate"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  className="bg-gray-200 px-4 py-2 rounded"
                  onClick={() => setShowSettings(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                  onClick={saveSettings}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-2">Aggregated Time by Client & Project</h2>
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
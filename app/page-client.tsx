"use client";

import { useState, useEffect } from 'react';
import { ClientScreenRecorder } from '@/src/services/clientScreenRecorder';
import type { ScreenAnalysis } from '@/src/services/screenAnalysisService';
import WIPTable from "@/app/components/WIPTable";
import type { WIPEntry } from "@/src/services/supabaseDB";
import { useDailyLogs } from "@/src/store/dailyLogs";
import { useNormalizedNames } from "@/src/store/normalizedNames";
import { isSameProject, isSameClient } from '@/src/backend/services/intelligentAggregationService';
import WorkSessionButton from './components/WorkSessionButton';
import { useRecordingState } from '@/src/store/recordingState';
import { upsertWIPEntry, getWIPEntries, updateWIPEntry, deleteWIPEntry } from '@/src/services/wipEntryService';
import { supabase } from '@/src/lib/supabase';
import { getActivePartner, getDefaultHourlyRate } from '@/src/backend/services/screenActivityProcessor';
import { useActivePartner } from '@/src/store/activePartner';

const DEFAULT_HOURLY_RATE = 150; // You can adjust this or load from env/config

// Simple description merge function since we removed the complex one
function mergeDescriptions(desc1: string, desc2: string): string {
  const allBullets = [...desc1.split('•'), ...desc2.split('•')]
    .filter(Boolean)
    .map(b => b.trim());
  const uniqueBullets = Array.from(new Set(allBullets));
  return uniqueBullets.length > 0 ? '• ' + uniqueBullets.join(' • ') : 'No description available';
}

export default function PageClient() {
  const [status, setStatus] = useState('');
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [wipEntries, setWipEntries] = useState<WIPEntry[]>([]);
  const dailyLogs = useDailyLogs();
  const isRecording = useRecordingState((state) => state.isRecording);
  const [recorder] = useState(() => new ClientScreenRecorder());
  const { activePartner } = useActivePartner();

  // Function to fetch WIP entries
  const fetchWIPEntries = async () => {
    try {
      const entries = await getWIPEntries();
      setWipEntries(entries);
    } catch (error) {
      console.error('Error fetching WIP entries:', error);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchWIPEntries();
    
    // Subscribe to changes
    const channel = supabase
      .channel('wip_entries_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wip_entries'
        },
        (payload) => {
          console.log('WIP entry changed:', payload);
          fetchWIPEntries(); // Refresh entries when changes occur
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleScreenshots = async (screenshots: string[]) => {
    try {
      const response = await fetch('/api/analyze-screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screenshots })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze screenshots');
      }

      const data = await response.json();
      console.log('Analysis result:', data);
      await handleAnalysis(data);
    } catch (error) {
      console.error('Failed to analyze screenshots:', error);
    }
  };

  const findMatchingEntry = async (analysis: ScreenAnalysis): Promise<WIPEntry | undefined> => {
    // Sort entries by date, most recent first
    const sortedEntries = [...wipEntries].sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    const now = new Date().getTime();
    const FIVE_MINUTES = 5 * 60 * 1000; // 5 minutes in milliseconds

    // Try to find a matching entry using intelligent comparison
    for (const entry of sortedEntries) {
      // Check if entry was updated in the last 5 minutes
      const entryTime = new Date(entry.updated_at).getTime();
      if (now - entryTime > FIVE_MINUTES) continue;

      const clientMatches = analysis.client_name === "Unknown" || 
                          await isSameClient(entry.client_name, analysis.client_name);
      
      if (clientMatches) {
        const projectMatches = await isSameProject(entry.project_name || '', analysis.project_name);
        if (projectMatches) {
          return entry;
        }
      }
    }
    return undefined;
  };

  const handleAnalysis = async (analysis: ScreenAnalysis) => {
    try {
      const now = new Date();
      
      // Get settings
      const settingsStr = localStorage.getItem('userSettings');
      const settings = settingsStr ? JSON.parse(settingsStr) : {};
      const hourlyRate = settings.hourlyRate || DEFAULT_HOURLY_RATE;
      
      // Create daily entry matching WIPEntry type
      const dailyEntry: WIPEntry = {
        id: now.getTime().toString(),
        description: analysis.activity_description || 'No description available',
        time_in_minutes: 1,
        hourly_rate: hourlyRate,
        date: now.toISOString(),
        client_id: 'unknown',
        client_name: analysis.client_name || 'Unknown',
        client_address: '',
        project_name: analysis.project_name || 'General',
        partner: activePartner,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };
      
      dailyLogs.addLog(dailyEntry);

      // Look for matching WIP entry using intelligent comparison
      const matchingEntry = await findMatchingEntry(analysis);

      if (matchingEntry) {
        // Update existing WIP entry
        const updatedEntry: Partial<WIPEntry> = {
          description: mergeDescriptions(matchingEntry.description, analysis.activity_description || ''),
          time_in_minutes: matchingEntry.time_in_minutes + 1,
          date: now.toISOString(),
          client_name: matchingEntry.client_name === "Unknown" && analysis.client_name !== "Unknown" 
            ? analysis.client_name 
            : matchingEntry.client_name,
          updated_at: now.toISOString()
        };
        
        await updateWIPEntry(matchingEntry.id, updatedEntry);
        await fetchWIPEntries(); // Refresh entries after update
      } else {
        // Create new WIP entry
        const newEntry: WIPEntry = {
          id: now.getTime().toString(),
          client_id: 'unknown',
          client_name: analysis.client_name || 'Unknown',
          client_address: '',
          project_name: analysis.project_name || 'General',
          time_in_minutes: 1,
          hourly_rate: hourlyRate,
          description: analysis.activity_description || 'No description available',
          date: now.toISOString(),
          partner: activePartner,
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        };
        
        const savedEntry = await upsertWIPEntry(newEntry);
        setWipEntries(prev => [...prev, savedEntry]);
      }
      
      setLastUpdateTime(now);
    } catch (error) {
      console.error('❌ Failed to analyze screenshots:', error);
      setStatus('Failed to analyze screen activity');
    }
  };

  const handleEntryUpdate = async (entry: WIPEntry) => {
    try {
      await updateWIPEntry(entry.id, {
        ...entry,
        partner: entry.partner || 'Unknown'
      });
      await fetchWIPEntries(); // Refresh entries after update
    } catch (error) {
      console.error('Failed to update entry:', error);
    }
  };

  const handleEntryDelete = async (entry: WIPEntry) => {
    try {
      await deleteWIPEntry(entry.id);
      setWipEntries(prev => prev.filter(e => e.id !== entry.id));
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  };

  async function startWorkSession() {
    try {
      console.log('🎬 Starting work session...');
      setStatus('Starting recording...');
      
      await recorder.startRecording(handleScreenshots);
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

  // Update the createEntry function to include partner
  const createEntry = async (entry: Partial<WIPEntry>) => {
    try {
      const settingsStr = localStorage.getItem('userSettings');
      const settings = settingsStr ? JSON.parse(settingsStr) : {};
      const hourlyRate = settings.hourlyRate || DEFAULT_HOURLY_RATE;

      const newEntry = await upsertWIPEntry({
        ...entry,
        partner: activePartner,
        hourly_rate: entry.hourly_rate || hourlyRate,
        date: new Date().toISOString(),
      });
      await fetchWIPEntries();
      return newEntry;
    } catch (error) {
      console.error('Error creating WIP entry:', error);
      throw error;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Work In Progress (WIP) Dashboard
        </h1>
        <WorkSessionButton onStart={startWorkSession} onEnd={endWorkSession} />
      </div>

      <WIPTable
        entries={wipEntries}
        onEntryUpdate={handleEntryUpdate}
        onDelete={handleEntryDelete}
        isEditable={true}
      />
    </div>
  );
}
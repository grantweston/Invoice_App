"use client";

import { useState, useEffect } from 'react';
import { ClientScreenRecorder } from '@/src/services/clientScreenRecorder';
import type { ScreenAnalysis } from '@/src/services/screenAnalysisService';
import WIPTable from "@/app/components/WIPTable";
import type { WIPEntry } from "@/src/types";
import { useDailyLogs } from "@/src/store/dailyLogs";
import { useNormalizedNames } from "@/src/store/normalizedNames";
import { isSameProject, isSameClient } from '@/src/backend/services/intelligentAggregationService';
import WorkSessionButton from './components/WorkSessionButton';
import { useRecordingState } from '@/src/store/recordingState';
import { upsertWIPEntry, getWIPEntries, updateWIPEntry, deleteWIPEntry } from '@/src/services/wipEntryService';
import { supabase } from '@/src/lib/supabase';
import { getActivePartner, getDefaultHourlyRate } from '@/src/backend/services/screenActivityProcessor';

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

      // Get settings
      const partner = getActivePartner();
      const hourlyRate = getDefaultHourlyRate();

      // Create WIP entry from analysis
      const entry: WIPEntry = {
        id: crypto.randomUUID(),
        description: data.description,
        time_in_minutes: 1,
        hourly_rate: hourlyRate,
        date: new Date().toISOString(),
        client_id: '',
        client_name: data.client_name || 'Unknown',
        client_address: '',
        project_name: data.project_name || '',
        partner: partner,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await upsertWIPEntry(entry);
      await fetchWIPEntries(); // Refresh entries after creating new one
    } catch (error) {
      console.error('Failed to analyze screenshots:', error);
    }
  };

  const findMatchingEntry = async (analysis: ScreenAnalysis): Promise<WIPEntry | undefined> => {
    // Try to find a matching entry using intelligent comparison
    for (const entry of wipEntries) {
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
      
      // Get settings first
      const partner = getActivePartner();
      const hourlyRate = getDefaultHourlyRate();
      
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
        partner: partner,
        category: 'automatic',
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
        
        const savedEntry = await updateWIPEntry(matchingEntry.id, updatedEntry);
        setWipEntries(prev => prev.map(entry => 
          entry.id === matchingEntry.id ? savedEntry : entry
        ));
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
          partner: partner,
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
    // Get settings
    const settingsStr = localStorage.getItem('userSettings');
    const settings = settingsStr ? JSON.parse(settingsStr) : {};
    const partner = settings.userName || 'Unknown';
    const hourlyRate = settings.defaultRate || 150;

    const newEntry: WIPEntry = {
      id: crypto.randomUUID(),
      description: entry.description || '',
      time_in_minutes: entry.time_in_minutes || 0,
      hourly_rate: entry.hourly_rate || hourlyRate,
      date: entry.date || new Date().toISOString(),
      client_id: entry.client_id || '',
      client_name: entry.client_name || 'Unknown',
      client_address: entry.client_address || '',
      project_name: entry.project_name || '',
      partner: entry.partner || partner,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await upsertWIPEntry(newEntry);
    return newEntry;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Work In Progress (WIP) Dashboard</h1>
          <div className="flex items-center">
            <WorkSessionButton
              onStart={startWorkSession}
              onEnd={endWorkSession}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <WIPTable 
          entries={wipEntries}
          onEntryUpdate={handleEntryUpdate}
          onDelete={handleEntryDelete}
          isEditable={true}
        />
      </div>
    </div>
  );
}
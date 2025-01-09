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
import { exportToExcel } from '@/src/services/excelExportService';

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

  return (
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
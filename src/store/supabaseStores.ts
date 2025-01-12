import { create } from 'zustand';
import type { WIPEntry } from '@/src/types';
import { supabase } from '@/src/lib/supabase';

interface DailyLogsState {
  logs: WIPEntry[];
  addLog: (entry: WIPEntry) => Promise<WIPEntry | null>;
  clearLogs: () => void;
  updateMatchingLogs: (oldEntry: WIPEntry, newEntry: WIPEntry) => void;
  setLogs: (logs: WIPEntry[]) => void;
  deleteLogs: (entryToDelete: WIPEntry) => void;
  loadLogs: () => Promise<void>;
}

interface WIPState {
  entries: WIPEntry[];
  setEntries: (entries: WIPEntry[] | ((prev: WIPEntry[]) => WIPEntry[])) => void;
  addEntry: (entry: WIPEntry) => void;
  updateEntry: (id: string, updates: Partial<WIPEntry>) => void;
  deleteEntry: (id: string) => void;
  clearEntries: () => void;
  loadEntries: () => Promise<void>;
}

export const useDailyLogs = create<DailyLogsState>((set) => ({
  logs: [],
  addLog: async (entry) => {
    console.log('➕ Adding daily log:', entry);
    
    // Convert to database format, omitting id to let Supabase generate it
    const dbEntry = {
      client: entry.client,
      project: entry.project,
      description: entry.description,
      time_in_minutes: entry.timeInMinutes,
      hours: entry.hours,
      partner: entry.partner,
      hourly_rate: entry.hourlyRate,
      associated_daily_ids: entry.associatedDailyIds?.map(id => id.toString()),
      start_date: entry.startDate,
      last_worked_date: entry.lastWorkedDate,
      sub_entries: entry.subEntries || []
    };
    
    console.log('📝 Sending to Supabase:', dbEntry);
    
    const { data, error } = await supabase
      .from('daily_logs')
      .insert([dbEntry])
      .select();
    
    if (error) {
      console.error('❌ Error adding daily log:', error);
      return null;
    }
    
    // Convert back to TypeScript format
    const newLog = {
      ...entry,
      id: data[0].id,
      timeInMinutes: data[0].time_in_minutes,
      hourlyRate: data[0].hourly_rate,
      associatedDailyIds: (data[0].associated_daily_ids || []).map(id => parseInt(id)),
      startDate: data[0].start_date,
      lastWorkedDate: data[0].last_worked_date,
      subEntries: data[0].sub_entries || []
    };
    
    console.log('✅ Successfully added daily log:', newLog);
    set((state) => ({ logs: [...state.logs, newLog] }));
    return newLog;
  },
  clearLogs: async () => {
    const { error } = await supabase
      .from('daily_logs')
      .delete()
      .neq('id', 0); // Delete all records
    
    if (error) {
      console.error('Error clearing daily logs:', error);
      return;
    }
    
    set({ logs: [] });
  },
  updateMatchingLogs: async (oldEntry, newEntry) => {
    // Convert to database format
    const dbEntry = {
      client: newEntry.client,
      project: newEntry.project,
      description: newEntry.description,
      time_in_minutes: newEntry.timeInMinutes,
      hours: newEntry.hours,
      partner: newEntry.partner,
      hourly_rate: newEntry.hourlyRate,
      associated_daily_ids: newEntry.associatedDailyIds?.map(id => id.toString()),
      start_date: newEntry.startDate,
      last_worked_date: newEntry.lastWorkedDate,
      sub_entries: newEntry.subEntries || []
    };
    
    console.log('📝 Sending update to Supabase:', dbEntry);
    
    const { error } = await supabase
      .from('daily_logs')
      .update(dbEntry)
      .eq('id', oldEntry.id);
    
    if (error) {
      console.error('Error updating daily logs:', error);
      return;
    }
    
    set((state) => ({
      logs: state.logs.map((log) =>
        log.id === oldEntry.id ? newEntry : log
      ),
    }));
  },
  setLogs: async (logs) => {
    // Convert to database format
    const dbLogs = logs.map(log => ({
      client: log.client,
      project: log.project,
      description: log.description,
      time_in_minutes: log.timeInMinutes,
      hours: log.hours,
      partner: log.partner,
      hourly_rate: log.hourlyRate,
      associated_daily_ids: log.associatedDailyIds?.map(id => id.toString()),
      start_date: log.startDate,
      last_worked_date: log.lastWorkedDate,
      sub_entries: log.subEntries || []
    }));
    
    console.log('📝 Sending to Supabase:', dbLogs);
    
    const { error } = await supabase
      .from('daily_logs')
      .upsert(dbLogs);
    
    if (error) {
      console.error('Error setting daily logs:', error);
      return;
    }
    
    set({ logs });
  },
  deleteLogs: async (entryToDelete) => {
    const { error } = await supabase
      .from('daily_logs')
      .delete()
      .eq('id', entryToDelete.id);
    
    if (error) {
      console.error('Error deleting daily logs:', error);
      return;
    }
    
    set((state) => ({
      logs: state.logs.filter((log) => log.id !== entryToDelete.id),
    }));
  },
  loadLogs: async () => {
    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .order('id', { ascending: false });
    
    if (error) {
      console.error('Error loading daily logs:', error);
      return;
    }
    
    // Convert from database format to TypeScript format
    const logs = (data || []).map(log => ({
      ...log,
      id: log.id,
      timeInMinutes: log.time_in_minutes,
      hourlyRate: log.hourly_rate,
      associatedDailyIds: (log.associated_daily_ids || []).map(id => parseInt(id)),
      startDate: log.start_date,
      lastWorkedDate: log.last_worked_date,
      subEntries: log.sub_entries || []
    }));
    
    set({ logs });
  },
}));

export const useWIPStore = create<WIPState>((set) => ({
  entries: [],
  setEntries: async (entries) => {
    if (typeof entries === 'function') {
      const newEntries = entries(useWIPStore.getState().entries);
      console.log('🔄 Setting WIP entries with function:', newEntries);
      
      // Convert to database format
      const dbEntries = newEntries.map(entry => ({
        client: entry.client,
        project: entry.project,
        description: entry.description,
        time_in_minutes: entry.timeInMinutes,
        hours: entry.hours,
        partner: entry.partner,
        hourly_rate: entry.hourlyRate,
        associated_daily_ids: entry.associatedDailyIds?.map(id => id.toString()),
        start_date: entry.startDate,
        last_worked_date: entry.lastWorkedDate,
        sub_entries: entry.subEntries || []
      }));
      
      console.log('📝 Sending to Supabase:', dbEntries);
      
      const { error } = await supabase
        .from('wip_entries')
        .upsert(dbEntries, { onConflict: 'id' });
      
      if (error) {
        console.error('❌ Error upserting WIP entries:', error);
        return;
      }
      
      console.log('✅ Successfully upserted WIP entries');
      set({ entries: newEntries });
    } else {
      console.log('🔄 Setting WIP entries directly:', entries);
      
      // Convert to database format
      const dbEntries = entries.map(entry => ({
        client: entry.client,
        project: entry.project,
        description: entry.description,
        time_in_minutes: entry.timeInMinutes,
        hours: entry.hours,
        partner: entry.partner,
        hourly_rate: entry.hourlyRate,
        associated_daily_ids: entry.associatedDailyIds?.map(id => id.toString()),
        start_date: entry.startDate,
        last_worked_date: entry.lastWorkedDate,
        sub_entries: entry.subEntries || []
      }));
      
      console.log('📝 Sending to Supabase:', dbEntries);
      
      const { error } = await supabase
        .from('wip_entries')
        .upsert(dbEntries, { onConflict: 'id' });
      
      if (error) {
        console.error('❌ Error upserting WIP entries:', error);
        return;
      }
      
      console.log('✅ Successfully upserted WIP entries');
      set({ entries });
    }
  },
  addEntry: async (entry) => {
    console.log('➕ Adding WIP entry:', entry);
    
    // Convert to database format, omitting id to let Supabase generate it
    const dbEntry = {
      client: entry.client,
      project: entry.project,
      description: entry.description,
      time_in_minutes: entry.timeInMinutes,
      hours: entry.hours,
      partner: entry.partner,
      hourly_rate: entry.hourlyRate,
      associated_daily_ids: entry.associatedDailyIds?.map(id => id.toString()),
      start_date: entry.startDate,
      last_worked_date: entry.lastWorkedDate,
      sub_entries: entry.subEntries
    };
    
    console.log('📝 Sending to Supabase:', dbEntry);
    
    const { data, error } = await supabase
      .from('wip_entries')
      .insert([dbEntry])
      .select();
    
    if (error) {
      console.error('❌ Error adding WIP entry:', error);
      return;
    }
    
    // Convert the returned data back to our TypeScript format
    const newEntry = {
      ...entry,
      id: data[0].id,
      timeInMinutes: data[0].time_in_minutes,
      hourlyRate: data[0].hourly_rate,
      associatedDailyIds: (data[0].associated_daily_ids || []).map(id => parseInt(id)),
      startDate: data[0].start_date,
      lastWorkedDate: data[0].last_worked_date,
      subEntries: data[0].sub_entries || []
    };
    
    console.log('✅ Successfully added WIP entry:', newEntry);
    set((state) => ({ entries: [...state.entries, newEntry] }));
  },
  updateEntry: async (id, updates) => {
    const numericId = typeof id === 'string' ? parseInt(id) : id;
    
    // Convert updates to Supabase format
    const dbUpdates = {
      client: updates.client,
      project: updates.project,
      description: updates.description,
      time_in_minutes: updates.timeInMinutes,
      hours: updates.hours,
      partner: updates.partner,
      hourly_rate: updates.hourlyRate,
      associated_daily_ids: updates.associatedDailyIds?.map(id => id.toString()),
      start_date: updates.startDate,
      last_worked_date: updates.lastWorkedDate,
      sub_entries: updates.subEntries || []
    };
    
    console.log('📝 Sending update to Supabase:', dbUpdates);
    
    const { error } = await supabase
      .from('wip_entries')
      .update(dbUpdates)
      .eq('id', numericId);
    
    if (error) {
      console.error('Error updating WIP entry:', error);
      return;
    }
    
    set((state) => ({
      entries: state.entries.map((entry) =>
        entry.id.toString() === id.toString() ? { ...entry, ...updates } : entry
      ),
    }));
  },
  deleteEntry: async (id) => {
    const numericId = typeof id === 'string' ? parseInt(id) : id;
    const { error } = await supabase
      .from('wip_entries')
      .delete()
      .eq('id', numericId);
    
    if (error) {
      console.error('Error deleting WIP entry:', error);
      return;
    }
    
    set((state) => ({
      entries: state.entries.filter((entry) => entry.id.toString() !== id.toString()),
    }));
  },
  clearEntries: async () => {
    const { error } = await supabase
      .from('wip_entries')
      .delete()
      .neq('id', 0); // Delete all records
    
    if (error) {
      console.error('Error clearing WIP entries:', error);
      return;
    }
    
    set({ entries: [] });
  },
  loadEntries: async () => {
    const { data, error } = await supabase
      .from('wip_entries')
      .select('*')
      .order('id', { ascending: false });
    
    if (error) {
      console.error('Error loading WIP entries:', error);
      return;
    }
    
    // Convert the data from Supabase format to our TypeScript format
    const entries = (data || []).map(entry => ({
      ...entry,
      id: entry.id,
      associatedDailyIds: (entry.associated_daily_ids || []).map(id => parseInt(id)),
      timeInMinutes: entry.time_in_minutes,
      hourlyRate: entry.hourly_rate,
      startDate: entry.start_date,
      lastWorkedDate: entry.last_worked_date,
      subEntries: entry.sub_entries || []
    }));
    
    set({ entries });
  },
})); 
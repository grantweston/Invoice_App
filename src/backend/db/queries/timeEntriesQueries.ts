"use server";

import { getSupabase } from '../supabaseClient';
import { TimeEntry } from '@/src/backend/models/TimeEntry';

export async function insertTimeEntry(entry: TimeEntry) {
  const supabase = await getSupabase();
  const dbEntry = {
    client_id: entry.clientId,
    project_id: entry.projectId,
    hours: entry.hours,
    description: entry.description,
    date: entry.date,
  };
  const { data, error } = await supabase.from('time_entries').insert(dbEntry).select();
  if (error) throw error;
  return data;
}

export async function fetchAllTimeEntries() {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from('time_entries').select('*');
  if (error) throw error;
  return data;
}

export async function fetchClientWithProjects(clientId: string) {
  // Mock return for now
  return {
    name: "Mock Client",
    projects: [
      { name: "Mock Project A", totalHours: 5, description: "Mocked data" },
      { name: "Mock Project B", totalHours: 3, description: "Mocked data" }
    ]
  };
}
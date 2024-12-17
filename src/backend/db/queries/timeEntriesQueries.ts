"use server";

import { supabase } from '../supabaseClient';
import { TimeEntry } from '@/src/backend/models/TimeEntry';

export async function insertTimeEntry(entry: TimeEntry) {
  const { data, error } = await supabase.from('time_entries').insert(entry).select();
  if (error) throw error;
  return data;
}

export async function fetchAllTimeEntries() {
  const { data, error } = await supabase.from('time_entries').select('*');
  if (error) throw error;
  return data;
}

// For getting client and project details, we might join tables in a real scenario.
// Here we assume a simplified structure.
export async function fetchClientWithProjects(clientId: string) {
  // Mock return
  return {
    name: "Mock Client",
    projects: [
      { name: "Mock Project A", totalHours: 5, description: "Mocked data" },
      { name: "Mock Project B", totalHours: 3, description: "Mocked data" }
    ]
  };
}
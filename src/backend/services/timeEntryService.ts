import { insertTimeEntry, fetchAllTimeEntries, fetchClientWithProjects } from '../db/queries/timeEntriesQueries';
import { TimeEntry } from '../models/TimeEntry';

export async function createTimeEntry(data: Partial<TimeEntry>) {
  if (!data.clientId || !data.projectId || data.hours === undefined || !data.description || !data.date) {
    throw new Error("Missing required fields for time entry creation.");
  }
  return await insertTimeEntry(data as TimeEntry);
}

export async function listTimeEntries() {
  return await fetchAllTimeEntries();
}

export async function getClientWithProjects(clientId: string) {
  return await fetchClientWithProjects(clientId);
}
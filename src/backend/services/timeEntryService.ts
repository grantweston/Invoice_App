"use server";

import { insertTimeEntry, fetchAllTimeEntries, fetchClientWithProjects } from '../db/queries/timeEntriesQueries';
import { TimeEntry } from '../models/TimeEntry';

// Creates a new time entry in the database.
export async function createTimeEntry(data: Partial<TimeEntry>) {
  if (!data.clientId || !data.projectId || data.hours === undefined || !data.description) {
    throw new Error("Missing required fields for time entry creation.");
  }
  return await insertTimeEntry(data as TimeEntry);
}

// Lists all time entries (for demo; in reality, you might filter by date/client).
export async function listTimeEntries() {
  return await fetchAllTimeEntries();
}

// Fetches a client with their projects from the DB, used by the clientData endpoint.
export async function getClientWithProjects(clientId: string) {
  return await fetchClientWithProjects(clientId);
}
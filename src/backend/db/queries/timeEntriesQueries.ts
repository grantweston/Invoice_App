"use server";

import { TimeEntry } from '@/src/backend/models/TimeEntry';

// Mock data store
let mockTimeEntries: TimeEntry[] = [];

export async function insertTimeEntry(entry: TimeEntry) {
  const newEntry = {
    ...entry,
    id: Date.now().toString() // Mock ID generation
  };
  mockTimeEntries.push(newEntry);
  return [newEntry];
}

export async function fetchAllTimeEntries() {
  return mockTimeEntries;
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
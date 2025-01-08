"use server";

import { TimeEntry } from '@/src/backend/models/TimeEntry';

export async function insertTimeEntry(entry: TimeEntry) {
  // Mock implementation
  console.log('Mock inserting time entry:', entry);
  return [{
    id: Date.now(),
    ...entry
  }];
}

export async function fetchAllTimeEntries() {
  // Mock implementation
  return [{
    id: 1,
    clientId: 'mock-client',
    projectId: 'mock-project',
    hours: 2,
    description: 'Mock entry',
    date: new Date().toISOString()
  }];
}

export async function fetchClientWithProjects(clientId: string) {
  // Mock implementation
  return {
    name: "Mock Client",
    projects: [
      { name: "Mock Project A", totalHours: 5, description: "Mocked data" },
      { name: "Mock Project B", totalHours: 3, description: "Mocked data" }
    ]
  };
}
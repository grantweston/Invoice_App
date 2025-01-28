export interface SubEntry {
  id: number;
  description: string;
  dates: number[]; // Array of timestamps when this task was worked on
  timeInMinutes: number;
  associatedDailyIds: number[];
}

export interface WIPEntry {
  id: number;
  client: string;
  project: string;
  timeInMinutes: number;   // single source of truth for duration
  description: string;
  partner: string;
  hourlyRate: number;
  associatedDailyIds: number[];
  subEntries: SubEntry[]; // Array of distinct tasks within this project
  startDate: number; // Timestamp of first work
  lastWorkedDate: number; // Timestamp of most recent work
} 
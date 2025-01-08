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
  hours?: number;
  timeInMinutes?: number;
  description: string;
  partner: string;
  hourlyRate: number;
  associatedDailyIds: number[];
  subEntries: SubEntry[]; // Array of distinct tasks within this project
  startDate: number; // Timestamp of first work
  lastWorkedDate: number; // Timestamp of most recent work
}

export interface Activity {
  timestamp: string;
  description: string;
  type: 'screen_capture' | 'manual';
  duration: number; // in minutes
} 
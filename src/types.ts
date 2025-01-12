export interface SubEntry {
  id: number;
  description: string;
  dates: number[]; // Array of timestamps when this task was worked on
  timeInMinutes: number;
  associatedDailyIds: number[];
}

export interface WIPEntry {
  id?: number;
  client: string;
  project: string;
  timeInMinutes: number;
  hours: number;
  partner: string;
  hourlyRate: number;
  description: string;
  associatedDailyIds: number[];
  subEntries: any[];
  startDate: number;
  lastWorkedDate: number;
} 
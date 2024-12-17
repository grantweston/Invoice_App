export interface TimeEntry {
  id?: string;
  clientId: string;
  projectId: string;
  hours: number;
  description: string;
  date?: string;
  paid?: boolean;
  created_at?: string;
}
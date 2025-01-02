export interface WIPEntry {
  id: string;
  description: string;
  timeInMinutes: number;
  hourlyRate: number;
  date: string;
  client: {
    id: string;
    name: string;
    address: string;
  };
  category?: string;
  retainerAmount?: number;
  adjustments?: {
    description: string;
    amount: number;
  }[];
}

export interface DailyActivity {
  id: string;
  description: string;
  timeInMinutes: number;
  date: string;
  category?: string;
}

export interface WorkCategory {
  name: string;
  description?: string;
  entries: WIPEntry[];
  activities: DailyActivity[];
  totalMinutes: number;
  totalAmount: number;
}

export interface DetailedInvoice {
  client: {
    name: string;
    address: string;
    clientNumber?: string;
  };
  invoiceNumber: string;
  dateRange: {
    start: string;
    end: string;
  };
  categories: WorkCategory[];
  totalAmount: number;
  retainerAmount?: number;
  adjustments?: {
    description: string;
    amount: number;
  }[];
} 
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WIPEntry } from '@/src/types';

export interface GeneratedInvoice {
  id: string;
  googleDocId: string;
  client: string;
  project: string;
  date: string;
  amount: number;
  wipEntries: WIPEntry[];
  dailyActivities: any[]; // TODO: Add proper type
}

interface GeneratedInvoicesState {
  invoices: GeneratedInvoice[];
  addInvoice: (invoice: GeneratedInvoice) => void;
  deleteInvoice: (id: string) => void;
}

export const useGeneratedInvoices = create<GeneratedInvoicesState>()(
  persist(
    (set) => ({
      invoices: [],
      addInvoice: (invoice) => set((state) => ({
        invoices: [...state.invoices, invoice]
      })),
      deleteInvoice: (id) => set((state) => ({
        invoices: state.invoices.filter((invoice) => invoice.id !== id)
      }))
    }),
    {
      name: 'generated-invoices'
    }
  )
); 
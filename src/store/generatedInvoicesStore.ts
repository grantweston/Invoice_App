import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GeneratedInvoice {
  id: string;  // Google Doc ID
  client: string;
  date: string;
  amount: number;
  url: string;
}

interface GeneratedInvoicesState {
  invoices: GeneratedInvoice[];
  addInvoice: (invoice: GeneratedInvoice) => void;
  deleteInvoice: (id: string) => void;
  getInvoices: () => GeneratedInvoice[];
}

export const useGeneratedInvoices = create<GeneratedInvoicesState>()(
  persist(
    (set, get) => ({
      invoices: [],
      addInvoice: (invoice) => {
        set((state) => ({
          invoices: [invoice, ...state.invoices]
        }));
      },
      deleteInvoice: (id) => {
        set((state) => ({
          invoices: state.invoices.filter((invoice) => invoice.id !== id)
        }));
      },
      getInvoices: () => {
        return get().invoices;
      }
    }),
    {
      name: 'generated-invoices-storage'
    }
  )
); 
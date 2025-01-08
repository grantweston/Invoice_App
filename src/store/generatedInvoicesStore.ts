import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
        set((state) => {
          const newState = {
            ...state,
            invoices: [invoice, ...state.invoices]
          };
          return newState;
        });
      },
      deleteInvoice: (id) => {
        set((state) => {
          const newState = {
            ...state,
            invoices: state.invoices.filter((invoice) => invoice.id !== id)
          };
          return newState;
        });
      },
      getInvoices: () => {
        return get().invoices;
      }
    }),
    {
      name: 'generated-invoices-storage',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      onRehydrateStorage: () => {
        console.log('Hydrating invoices store...');
        return (state) => {
          console.log('Hydrated state:', state);
        };
      }
    }
  )
); 
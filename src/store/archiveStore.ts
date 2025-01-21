import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WIPEntry } from '@/src/types';

interface ArchivedInvoice {
  id: string;
  googleDocId: string;
  client: string;
  project: string;
  date: string;
  amount: number;
  wipEntries: WIPEntry[];
  dailyActivities: any[]; // TODO: Add proper type
  archivedAt: string;
}

interface ArchiveState {
  archivedInvoices: ArchivedInvoice[];
  archiveInvoice: (invoice: ArchivedInvoice) => void;
  unarchiveInvoice: (invoiceId: string) => ArchivedInvoice | null;
  getArchivedInvoice: (invoiceId: string) => ArchivedInvoice | null;
}

export const useArchiveStore = create<ArchiveState>()(
  persist(
    (set, get) => ({
      archivedInvoices: [],
      
      archiveInvoice: (invoice) => set((state) => ({
        archivedInvoices: [...state.archivedInvoices, {
          ...invoice,
          archivedAt: new Date().toISOString()
        }]
      })),
      
      unarchiveInvoice: (invoiceId) => {
        const invoice = get().archivedInvoices.find(i => i.id === invoiceId);
        if (invoice) {
          set((state) => ({
            archivedInvoices: state.archivedInvoices.filter(i => i.id !== invoiceId)
          }));
        }
        return invoice || null;
      },
      
      getArchivedInvoice: (invoiceId) => 
        get().archivedInvoices.find(i => i.id === invoiceId) || null
    }),
    {
      name: 'archive-storage'
    }
  )
); 
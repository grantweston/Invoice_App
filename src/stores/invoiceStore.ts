import { create } from 'zustand';

interface Template {
  id: string;
  name: string;
  placeholders?: number;
}

interface Client {
  id: string;
  name: string;
}

interface WIPEntry {
  date: string;
  description: string;
  timeInMinutes: number;
  hourlyRate: number;
}

interface DailyActivity {
  date: string;
  description: string;
  timeInMinutes: number;
}

interface InvoiceStore {
  templates: Template[];
  selectedTemplate: Template | null;
  selectedClient: Client | null;
  entries: {
    wip: WIPEntry[];
    daily: DailyActivity[];
  };
  addTemplate: (template: Template) => void;
  removeTemplate: (templateId: string) => void;
  setSelectedTemplate: (template: Template | null) => void;
  setSelectedClient: (client: Client | null) => void;
  addWIPEntry: (entry: WIPEntry) => void;
  addDailyActivity: (activity: DailyActivity) => void;
  clearEntries: () => void;
}

export const useInvoiceStore = create<InvoiceStore>((set) => ({
  templates: [],
  selectedTemplate: null,
  selectedClient: null,
  entries: {
    wip: [],
    daily: []
  },
  addTemplate: (template) => set((state) => ({
    templates: [...state.templates, template]
  })),
  removeTemplate: (templateId) => set((state) => ({
    templates: state.templates.filter(t => t.id !== templateId),
    selectedTemplate: state.selectedTemplate?.id === templateId ? null : state.selectedTemplate
  })),
  setSelectedTemplate: (template) => set({ selectedTemplate: template }),
  setSelectedClient: (client) => set({ selectedClient: client }),
  addWIPEntry: (entry) => set((state) => ({
    entries: {
      ...state.entries,
      wip: [...state.entries.wip, entry]
    }
  })),
  addDailyActivity: (activity) => set((state) => ({
    entries: {
      ...state.entries,
      daily: [...state.entries.daily, activity]
    }
  })),
  clearEntries: () => set((state) => ({
    entries: {
      wip: [],
      daily: []
    }
  }))
})); 
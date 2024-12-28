import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Template {
  id: string;
  name: string;
  placeholders: {
    client: string[];
    project: string[];
    billing: string[];
    dates: string[];
    custom: string[];
  };
}

interface InvoiceState {
  templates: Template[];
  selectedTemplate: string | null;
  addTemplate: (template: Template) => void;
  removeTemplate: (id: string) => void;
  setSelectedTemplate: (id: string | null) => void;
}

export const useInvoiceStore = create<InvoiceState>()(
  persist(
    (set) => ({
      templates: [],
      selectedTemplate: null,
      addTemplate: (template) => set((state) => ({
        templates: [...state.templates, template]
      })),
      removeTemplate: (id) => set((state) => ({
        templates: state.templates.filter((t) => t.id !== id),
        selectedTemplate: state.selectedTemplate === id ? null : state.selectedTemplate
      })),
      setSelectedTemplate: (id) => set({ selectedTemplate: id }),
    }),
    {
      name: 'invoice-storage',
    }
  )
); 
import { create } from 'zustand';

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
  setTemplates: (templates: Template[]) => void;
  addTemplate: (template: Template) => void;
  removeTemplate: (id: string) => void;
}

export const useInvoiceStore = create<InvoiceState>((set) => ({
  templates: [],
  setTemplates: (templates) => set({ templates }),
  addTemplate: (template) => set((state) => ({ 
    templates: [...state.templates, template] 
  })),
  removeTemplate: (id) => set((state) => ({
    templates: state.templates.filter(t => t.id !== id)
  }))
})); 
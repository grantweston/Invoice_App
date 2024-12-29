import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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

interface InvoiceStore {
  templates: Template[];
  selectedTemplate: Template | null;
  addTemplate: (template: Template) => void;
  removeTemplate: (id: string) => void;
  setSelectedTemplate: (template: Template | null) => void;
}

export const useInvoiceStore = create<InvoiceStore>()(
  persist(
    (set) => ({
      templates: [],
      selectedTemplate: null,
      addTemplate: (template) => {
        set((state) => {
          const existingTemplate = state.templates.find(t => t.id === template.id);
          if (existingTemplate) {
            const newTemplates = state.templates.map(t => 
              t.id === template.id ? template : t
            );
            return { templates: newTemplates };
          } else {
            const newTemplates = [...state.templates, template];
            return { templates: newTemplates };
          }
        });
      },
      removeTemplate: (id) => {
        set((state) => ({
          templates: state.templates.filter(t => t.id !== id),
          selectedTemplate: state.selectedTemplate?.id === id ? null : state.selectedTemplate
        }));
      },
      setSelectedTemplate: (template) => {
        set({ selectedTemplate: template });
      }
    }),
    {
      name: 'invoice-store',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('Store rehydrated with:', state);
        }
      }
    }
  )
); 
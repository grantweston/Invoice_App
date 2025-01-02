import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { WIPEntry, DailyActivity } from '@/src/types';
import { getWIPEntries, getDailyActivities } from '@/src/services/supabaseDB';

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
  entries: {
    wip: WIPEntry[];
    daily: DailyActivity[];
  };
  addTemplate: (template: Template) => void;
  removeTemplate: (id: string) => void;
  setSelectedTemplate: (template: Template | null) => void;
  loadEntries: () => Promise<void>;
}

export const useInvoiceStore = create<InvoiceStore>()(
  persist(
    (set) => ({
      templates: [],
      selectedTemplate: null,
      entries: {
        wip: [],
        daily: []
      },

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
      },

      loadEntries: async () => {
        try {
          const [wipEntries, dailyActivities] = await Promise.all([
            getWIPEntries(),
            getDailyActivities()
          ]);
          
          set((state) => ({
            entries: {
              wip: wipEntries,
              daily: dailyActivities
            }
          }));
        } catch (error) {
          console.error('Failed to load entries:', error);
          // Keep existing entries on error
        }
      }
    }),
    {
      name: 'invoice-store',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        templates: state.templates,
        selectedTemplate: state.selectedTemplate
      })
    }
  )
); 
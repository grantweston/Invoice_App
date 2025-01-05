import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { WIPEntry, DailyActivity, Template, TemplateAnalysis } from '@/src/types';
import { getWIPEntries, getDailyActivities } from '@/src/services/supabaseDB';
import { uploadAndAnalyzeTemplate, getTemplate } from '@/src/services/templateService';

interface InvoiceStore {
  templates: Template[];
  selectedTemplate: Template | null;
  entries: {
    wip: WIPEntry[];
    daily: DailyActivity[];
  };
  addTemplate: (file: File, name: string) => Promise<void>;
  removeTemplate: (id: string) => void;
  setSelectedTemplate: (template: Template | null) => void;
  loadEntries: () => Promise<void>;
  reanalyzeTemplate: (templateId: string) => Promise<void>;
}

export const useInvoiceStore = create<InvoiceStore>()(
  persist(
    (set, get) => ({
      templates: [],
      selectedTemplate: null,
      entries: {
        wip: [],
        daily: []
      },

      addTemplate: async (file: File, name: string) => {
        try {
          const template = await uploadAndAnalyzeTemplate(file, name);
          set((state) => ({
            templates: [...state.templates, template]
          }));
        } catch (error) {
          console.error('Failed to add template:', error);
          throw error;
        }
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
      },

      reanalyzeTemplate: async (templateId: string) => {
        try {
          // Get template file from storage
          const template = await getTemplate(templateId);
          if (!template) throw new Error('Template not found');

          // Update templates list
          set((state) => ({
            templates: state.templates.map(t => 
              t.id === templateId ? template : t
            ),
            selectedTemplate: state.selectedTemplate?.id === templateId ? 
              template : state.selectedTemplate
          }));
        } catch (error) {
          console.error('Failed to reanalyze template:', error);
          throw error;
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
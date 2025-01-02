import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/src/lib/supabaseClient';
import { getTemplate } from '@/src/services/supabaseStorage';
import { 
  WIPEntry, 
  DailyActivity,
  createWIPEntry,
  createDailyActivity,
  getWIPEntries,
  getDailyActivities,
  deleteWIPEntry,
  deleteDailyActivity
} from '@/src/services/supabaseDB';

interface Template {
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

interface Client {
  id: string;
  name: string;
}

interface InvoiceStore {
  templates: Template[];
  selectedTemplate: Template | null;
  selectedClient: Client | null;
  entries: {
    wip: WIPEntry[];
    daily: DailyActivity[];
  };
  userId: string | null;
  addTemplate: (template: Template) => void;
  removeTemplate: (templateId: string) => void;
  setSelectedTemplate: (template: Template | null) => void;
  setSelectedClient: (client: Client | null) => void;
  addWIPEntry: (entry: Omit<WIPEntry, 'userId'>) => Promise<void>;
  addDailyActivity: (activity: Omit<DailyActivity, 'userId'>) => Promise<void>;
  deleteWIPEntry: (id: string) => Promise<void>;
  deleteDailyActivity: (id: string) => Promise<void>;
  loadEntries: (userId: string) => Promise<void>;
  setUserId: (userId: string) => void;
  clearEntries: () => void;
  checkTemplateExists: (templateId: string) => Promise<boolean>;
  syncTemplatesWithStorage: () => Promise<void>;
}

export const useInvoiceStore = create<InvoiceStore>()(
  persist(
    (set, get) => ({
      templates: [],
      selectedTemplate: null,
      selectedClient: null,
      entries: {
        wip: [],
        daily: []
      },
      userId: null,

      setUserId: (userId) => set({ userId }),

      addTemplate: async (template) => {
        await get().syncTemplatesWithStorage(); // Sync before adding
        set((state) => {
          const existingTemplate = state.templates.find(t => t.id === template.id);
          if (existingTemplate) {
            const newTemplates = state.templates.map(t => 
              t.id === template.id ? template : t
            );
            return { templates: newTemplates };
          } else {
            return { templates: [...state.templates, template] };
          }
        });
      },

      removeTemplate: async (templateId) => {
        try {
          // Delete from Supabase storage
          const { error } = await supabase.storage
            .from('invoice-templates')
            .remove([`${templateId}.docx`]);

          if (error) {
            console.error('Error deleting template from storage:', error);
            throw error;
          }

          // Update local state
          set((state) => ({
            templates: state.templates.filter(t => t.id !== templateId),
            selectedTemplate: state.selectedTemplate?.id === templateId ? null : state.selectedTemplate
          }));

          // Sync after removal to ensure consistency
          await get().syncTemplatesWithStorage();
        } catch (error) {
          console.error('Error removing template:', error);
          throw error; // Re-throw to handle in the UI
        }
      },

      setSelectedTemplate: async (template) => {
        if (template) {
          const exists = await get().checkTemplateExists(template.id);
          if (!exists) {
            const { data: fileData, error } = await getTemplate(template.id);
            if (fileData && !error) {
              const formData = new FormData();
              formData.append('file', new Blob([fileData], { 
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
              }), `${template.id}.docx`);
              
              try {
                const response = await fetch('/api/upload-template', {
                  method: 'POST',
                  body: formData
                });
                
                if (!response.ok) {
                  console.error('Failed to sync template to server');
                  return;
                }
              } catch (error) {
                console.error('Error syncing template to server:', error);
                return;
              }
            }
          }
        }
        set({ selectedTemplate: template });
      },

      setSelectedClient: (client) => set({ selectedClient: client }),

      addWIPEntry: async (entry) => {
        const newEntry = await createWIPEntry(entry);
        set((state) => ({
          entries: {
            ...state.entries,
            wip: [...state.entries.wip, newEntry]
          }
        }));
      },

      addDailyActivity: async (activity) => {
        const newActivity = await createDailyActivity(activity);
        set((state) => ({
          entries: {
            ...state.entries,
            daily: [...state.entries.daily, newActivity]
          }
        }));
      },

      deleteWIPEntry: async (id) => {
        await deleteWIPEntry(id);
        set((state) => ({
          entries: {
            ...state.entries,
            wip: state.entries.wip.filter(entry => entry.id !== id)
          }
        }));
      },

      deleteDailyActivity: async (id) => {
        await deleteDailyActivity(id);
        set((state) => ({
          entries: {
            ...state.entries,
            daily: state.entries.daily.filter(activity => activity.id !== id)
          }
        }));
      },

      loadEntries: async () => {
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
      },

      clearEntries: () => set((state) => ({
        entries: {
          wip: [],
          daily: []
        }
      })),

      checkTemplateExists: async (templateId: string) => {
        try {
          const response = await fetch(`/api/check-template/${templateId}`);
          if (!response.ok) return false;
          const data = await response.json();
          return data.exists;
        } catch (error) {
          console.error('Error checking template existence:', error);
          return false;
        }
      },

      syncTemplatesWithStorage: async () => {
        try {
          const { data: files, error } = await supabase.storage
            .from('invoice-templates')
            .list();

          if (error) {
            console.error('Error fetching templates:', error);
            return;
          }

          // Convert storage files to template format
          const templates = files.map(file => ({
            id: file.name.replace('.docx', ''),
            name: file.name,
            placeholders: {
              client: [],
              project: [],
              billing: [],
              dates: [],
              custom: []
            }
          }));

          set({ templates });
        } catch (error) {
          console.error('Error syncing templates:', error);
        }
      }
    }),
    {
      name: 'invoice-store',
      version: 1
    }
  )
); 
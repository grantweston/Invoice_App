import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getFile } from '@/src/services/fileStorage';

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
  checkTemplateExists: (templateId: string) => Promise<boolean>;
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
      addTemplate: (template) => {
        console.log('Adding template to store:', template);
        set((state) => {
          const existingTemplate = state.templates.find(t => t.id === template.id);
          if (existingTemplate) {
            console.log('Template already exists, updating:', template.id);
            const newTemplates = state.templates.map(t => 
              t.id === template.id ? template : t
            );
            return { templates: newTemplates };
          } else {
            console.log('Adding new template:', template.id);
            const newTemplates = [...state.templates, template];
            return { templates: newTemplates };
          }
        });
        console.log('Current store state:', get());
      },
      removeTemplate: (templateId) => {
        console.log('Removing template:', templateId);
        set((state) => {
          const newState = {
            templates: state.templates.filter(t => t.id !== templateId),
            selectedTemplate: state.selectedTemplate?.id === templateId ? null : state.selectedTemplate
          };
          console.log('New state after removal:', newState);
          return newState;
        });
      },
      setSelectedTemplate: async (template) => {
        console.log('Setting selected template:', template?.id);
        
        if (template) {
          // Check if template exists on server
          const exists = await get().checkTemplateExists(template.id);
          if (!exists) {
            // If not on server, try to get from IndexedDB and upload
            const fileData = await getFile(template.id);
            if (fileData) {
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
            } else {
              console.error('Template not found in IndexedDB');
              return;
            }
          }
        }
        
        set({ selectedTemplate: template });
      },
      setSelectedClient: (client) => {
        console.log('Setting selected client:', client?.name);
        set({ selectedClient: client });
      },
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
      }
    }),
    {
      name: 'invoice-store',
      version: 1,
      onRehydrateStorage: () => {
        console.log('Store rehydrated from storage');
        return (state) => {
          console.log('Rehydrated state:', state);
        };
      }
    }
  )
); 
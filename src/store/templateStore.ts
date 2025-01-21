import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Template } from '@/src/services/templateService';

interface TemplateMetadata {
  originalId: string;
  googleDocId: string;
}

interface TemplateState {
  templates: Template[];
  templateMetadata: Record<string, TemplateMetadata>;
  defaultTemplateId: string | null;
  setTemplates: (templates: Template[]) => void;
  setTemplateMetadata: (metadata: Record<string, TemplateMetadata>) => void;
  storeTemplateMetadata: (metadata: TemplateMetadata) => void;
  getTemplateMetadata: (originalId: string) => TemplateMetadata | null;
  setDefaultTemplateId: (id: string | null) => void;
}

// Only use persist middleware if window is defined (client-side)
const storage = typeof window !== 'undefined' 
  ? createJSONStorage(() => localStorage)
  : createJSONStorage(() => ({
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }));

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set, get) => ({
      templates: [],
      templateMetadata: {},
      defaultTemplateId: null,
      setTemplates: (templates) => set({ templates }),
      setTemplateMetadata: (metadata) => set({ templateMetadata: metadata }),
      storeTemplateMetadata: (metadata) => set((state) => ({
        templateMetadata: {
          ...state.templateMetadata,
          [metadata.originalId]: metadata
        }
      })),
      getTemplateMetadata: (originalId) => get().templateMetadata[originalId] || null,
      setDefaultTemplateId: (id) => set({ defaultTemplateId: id })
    }),
    {
      name: 'template-storage',
      storage,
    }
  )
); 
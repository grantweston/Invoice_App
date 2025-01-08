import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface TemplateMetadata {
  originalId: string;
  googleDocId: string;
}

interface TemplateState {
  defaultTemplateId: string | null;
  templateMetadata: Record<string, TemplateMetadata>;
  setDefaultTemplateId: (id: string | null) => void;
  storeTemplateMetadata: (metadata: TemplateMetadata) => void;
  setTemplateMetadata: (metadata: Record<string, TemplateMetadata>) => void;
  getTemplateMetadata: (originalId: string) => TemplateMetadata | null;
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
      defaultTemplateId: null,
      templateMetadata: {},
      
      setDefaultTemplateId: (id: string | null) => 
        set({ defaultTemplateId: id }),
      
      storeTemplateMetadata: (metadata: TemplateMetadata) =>
        set((state) => ({
          templateMetadata: {
            ...state.templateMetadata,
            [metadata.originalId]: metadata,
          },
        })),

      setTemplateMetadata: (metadata: Record<string, TemplateMetadata>) =>
        set({ templateMetadata: metadata }),
      
      getTemplateMetadata: (originalId: string) => {
        const state = get();
        return state.templateMetadata[originalId] || null;
      },
    }),
    {
      name: 'template-storage',
      storage,
    }
  )
); 
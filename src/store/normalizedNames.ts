import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NormalizedNames {
  clients: Record<string, string>; // original -> normalized
  projects: Record<string, string>; // original -> normalized
  addNormalizedName: (type: 'clients' | 'projects', original: string, normalized: string) => void;
  getNormalizedName: (type: 'clients' | 'projects', original: string) => string;
}

export const useNormalizedNames = create<NormalizedNames>()(
  persist(
    (set, get) => ({
      clients: {},
      projects: {},
      addNormalizedName: (type, original, normalized) => 
        set((state) => ({
          [type]: {
            ...state[type],
            [original.toLowerCase()]: normalized
          }
        })),
      getNormalizedName: (type, original) => {
        const state = get();
        const normalizedMap = state[type];
        const key = original.toLowerCase();
        
        // Check for exact match
        if (normalizedMap[key]) {
          return normalizedMap[key];
        }
        
        // Check for similar names using more strict matching
        const entries = Object.entries(normalizedMap);
        for (const [origKey, normValue] of entries) {
          // Only match if the strings are very similar (>80% match)
          const similarity = Math.max(
            origKey.length / key.length,
            key.length / origKey.length
          );
          
          if (similarity > 0.8 && (
            key.includes(origKey) || 
            origKey.includes(key) ||
            // Handle cases like "Eisner Amper" vs "Eisner & Amper"
            key.replace(/[&\s]/g, '').includes(origKey.replace(/[&\s]/g, '')) ||
            origKey.replace(/[&\s]/g, '').includes(key.replace(/[&\s]/g, ''))
          )) {
            return normValue;
          }
        }
        
        return original;
      }
    }),
    {
      name: 'normalized-names-storage'
    }
  )
); 
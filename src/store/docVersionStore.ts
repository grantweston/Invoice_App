import { create } from 'zustand';

interface DocVersion {
  content: string;
  timestamp: number;
}

interface DocVersionState {
  versions: DocVersion[];
  currentIndex: number;
  addVersion: (content: string) => void;
  undo: () => DocVersion | null;
  redo: () => DocVersion | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useDocVersionStore = create<DocVersionState>((set, get) => ({
  versions: [],
  currentIndex: -1,

  addVersion: (content: string) => {
    const { versions, currentIndex } = get();
    const newVersion = { content, timestamp: Date.now() };
    
    // Remove any redo versions
    const newVersions = versions.slice(0, currentIndex + 1);
    
    set({
      versions: [...newVersions, newVersion],
      currentIndex: currentIndex + 1
    });
  },

  undo: () => {
    const { versions, currentIndex } = get();
    if (currentIndex <= 0) return null;
    
    set({ currentIndex: currentIndex - 1 });
    return versions[currentIndex - 1];
  },

  redo: () => {
    const { versions, currentIndex } = get();
    if (currentIndex >= versions.length - 1) return null;
    
    set({ currentIndex: currentIndex + 1 });
    return versions[currentIndex + 1];
  },

  canUndo: () => {
    const { currentIndex } = get();
    return currentIndex > 0;
  },

  canRedo: () => {
    const { versions, currentIndex } = get();
    return currentIndex < versions.length - 1;
  }
})); 
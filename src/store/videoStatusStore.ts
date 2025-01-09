import { create } from 'zustand';

interface VideoStatus {
  state: string;
  message: string;
}

interface VideoStatusStore {
  status: VideoStatus;
  setStatus: (status: VideoStatus) => void;
}

export const useVideoStatusStore = create<VideoStatusStore>((set) => ({
  status: {
    state: 'idle',
    message: ''
  },
  setStatus: (status) => set({ status })
})); 
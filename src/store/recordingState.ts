import { create } from 'zustand';

interface RecordingState {
  isRecording: boolean;
  isPending: boolean;
  setIsRecording: (isRecording: boolean) => void;
  setIsPending: (isPending: boolean) => void;
}

export const useRecordingState = create<RecordingState>((set) => ({
  isRecording: false,
  isPending: false,
  setIsRecording: (isRecording) => set({ isRecording }),
  setIsPending: (isPending) => set({ isPending }),
})); 
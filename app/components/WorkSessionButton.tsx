'use client';

import { Play, Square, Circle } from 'lucide-react';
import { useRecordingState } from '@/src/store/recordingState';

interface WorkSessionButtonProps {
  onStart: () => void;
  onEnd: () => void;
}

export default function WorkSessionButton({ onStart, onEnd }: WorkSessionButtonProps) {
  const { isRecording, isPending, setIsRecording, setIsPending } = useRecordingState();

  const handleClick = async () => {
    if (isRecording) {
      onEnd();
      setIsRecording(false);
    } else {
      setIsPending(true);
      try {
        await onStart();
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start recording:', error);
      } finally {
        setIsPending(false);
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`
        relative px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all duration-150 hover:scale-105
        ${isRecording 
          ? 'bg-red-500/40 hover:bg-red-500/50 text-red-300 border border-red-500/30 hover:border-red-500/40' 
          : isPending
            ? 'bg-gray-500/30 text-gray-300 border border-gray-500/30'
            : 'bg-emerald-500/50 hover:bg-emerald-500/60 text-emerald-200 border border-emerald-500/30 hover:border-emerald-500/40'}
        ${isPending ? 'cursor-wait' : 'cursor-pointer'}
      `}
      disabled={isPending}
    >
      {isRecording && (
        <div className="absolute -left-4 top-1/2 -translate-y-1/2 flex items-center">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400/75 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400"></span>
          </span>
        </div>
      )}

      {/* Icon container */}
      <div className="relative w-5 h-5">
        <div className={`
          absolute inset-0 transform transition-all duration-500
          ${isRecording ? 'scale-100 rotate-0' : 'scale-0 rotate-180'}
        `}>
          <Square className="w-5 h-5" />
        </div>
        <div className={`
          absolute inset-0 transform transition-all duration-500
          ${!isRecording && !isPending ? 'scale-100 rotate-0' : 'scale-0 -rotate-180'}
        `}>
          <Play className="w-5 h-5" />
        </div>
        <div className={`
          absolute inset-0 transform transition-all duration-500
          ${isPending ? 'scale-100 rotate-0' : 'scale-0 -rotate-180'}
        `}>
          <Circle className="w-5 h-5 animate-pulse" />
        </div>
      </div>

      {/* Text */}
      <span className="relative overflow-hidden">
        <span className={`
          inline-block transition-all duration-500 transform
          ${isRecording ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0 absolute'}
        `}>
          End Work Session
        </span>
        <span className={`
          inline-block transition-all duration-500 transform
          ${!isRecording && !isPending ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0 absolute'}
        `}>
          Begin Work Session
        </span>
        <span className={`
          inline-block transition-all duration-500 transform
          ${isPending ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0 absolute'}
        `}>
          Requesting Access...
        </span>
      </span>

      {/* Hover glow effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg bg-gradient-to-r from-white/0 via-white/5 to-white/0" />
    </button>
  );
} 
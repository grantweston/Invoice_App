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
        relative px-6 h-[38px] rounded-lg font-medium text-white text-xs
        transition-all duration-500 ease-in-out
        flex items-center gap-2 group shadow-lg
        ${isRecording 
          ? 'bg-gradient-to-r from-red-500/30 to-red-600/30 hover:from-red-500/40 hover:to-red-600/40 text-red-300 border border-red-500/30 hover:border-red-500/40' 
          : isPending
            ? 'bg-gradient-to-r from-gray-500/30 to-gray-600/30 text-gray-300 border border-gray-500/30'
            : 'bg-gradient-to-r from-blue-500/30 to-blue-600/30 hover:from-blue-500/40 hover:to-blue-600/40 text-blue-300 border border-blue-500/30 hover:border-blue-500/40'}
        hover:scale-105
        ${isPending ? 'cursor-wait' : 'cursor-pointer'}
      `}
      disabled={isPending}
    >
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

      {isRecording && (
        <div className="absolute -bottom-6 left-0 right-0 flex items-center justify-center gap-2 text-red-400 text-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400/75 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400"></span>
          </span>
          Recording...
        </div>
      )}
    </button>
  );
} 
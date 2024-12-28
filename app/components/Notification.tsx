'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface NotificationProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export default function Notification({ message, type, onClose, duration = 5000 }: NotificationProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 300); // Wait for exit animation
    }, duration);

    return () => clearTimeout(timeout);
  }, [duration, onClose]);

  return (
    <div
      className={`fixed top-4 right-4 flex items-center p-4 rounded-lg shadow-lg
        ${type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white
        ${isExiting ? 'animate-slide-out' : 'animate-slide-in'}`}
    >
      {type === 'success' ? (
        <CheckCircle className="w-5 h-5 mr-2 animate-success-bounce" />
      ) : (
        <XCircle className="w-5 h-5 mr-2 animate-error-shake" />
      )}
      <span className="mr-4">{message}</span>
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(onClose, 300);
        }}
        className="hover:bg-white/20 rounded-full p-1 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
} 
'use client';

import { ClipboardList } from 'lucide-react';

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center animate-fade-in-up">
      <div className="relative mb-6">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
          <ClipboardList className="w-8 h-8 text-emerald-500" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full animate-pulse" />
      </div>
      
      <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">
        No Work Items Yet
      </h3>
      
      <p className="text-gray-600 dark:text-gray-400 max-w-sm">
        Start a work session using the green button above, and we'll automatically create your WIP report as you work!
      </p>
    </div>
  );
} 
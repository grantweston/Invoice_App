"use client";

// A simple loading spinner component to display while waiting for async operations.
export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center">
      <div className="relative">
        {/* Outer ring */}
        <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin" />
        {/* Inner ring */}
        <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-500 rounded-full animate-spin border-t-transparent" />
        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-blue-500 rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      </div>
    </div>
  );
}
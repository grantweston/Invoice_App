"use client";

// A simple loading spinner component to display while waiting for async operations.
export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-600"></div>
    </div>
  );
}
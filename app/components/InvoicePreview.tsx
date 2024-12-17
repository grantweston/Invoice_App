"use client";

import { useGoogleDocSync } from "../hooks/useGoogleDocSync";

interface InvoicePreviewProps {
  docUrl: string;
}

// This component shows a preview of the invoice Google Doc.
// In a real scenario, it might embed an iframe or render doc content if allowed.
// The useGoogleDocSync hook would handle real-time updates to the doc.
export default function InvoicePreview({ docUrl }: InvoicePreviewProps) {
  // Initialize syncing logic (currently just a placeholder)
  useGoogleDocSync(docUrl);

  return (
    <div className="border border-gray-200 p-4 rounded bg-white">
      <p className="mb-2 text-sm text-gray-600">Invoice Document Preview:</p>
      {/* Placeholder area where the doc would be shown */}
      <div className="w-full h-64 bg-gray-50 flex items-center justify-center">
        <span className="text-gray-400">[Google Doc Preview Placeholder]</span>
      </div>
    </div>
  );
}
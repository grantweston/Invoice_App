"use client";

import { useEffect, useRef } from 'react';

interface InvoicePreviewProps {
  html: string;
  isLoading?: boolean;
}

export default function InvoicePreview({ html, isLoading = false }: InvoicePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current && html) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }
    }
  }, [html]);

  return (
    <div className="relative w-full h-full min-h-[600px] bg-white rounded-lg shadow-lg">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        className="w-full h-full"
        title="Invoice Preview"
      />
    </div>
  );
}
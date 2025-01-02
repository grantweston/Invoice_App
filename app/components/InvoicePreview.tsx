"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabaseClient';

interface InvoicePreviewProps {
  templateId: string;
  isLoading?: boolean;
}

export default function InvoicePreview({ templateId, isLoading = false }: InvoicePreviewProps) {
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadPreview() {
      if (!templateId) return;
      
      setError(null);

      try {
        // Get signed URL from Supabase (valid for 1 hour)
        const { data: { signedUrl }, error: signedUrlError } = await supabase.storage
          .from('invoice-templates')
          .createSignedUrl(`${templateId}.docx`, 3600);

        if (signedUrlError || !signedUrl) {
          throw new Error('Failed to get signed URL for template');
        }

        console.log('Template signed URL:', signedUrl);

        // Use Word view mode with page view
        const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}&embed=true&wdWordView=1&wdPageView=1&wdToolbar=0&wdAllowInteractivity=True&wdPrint=0&wdDownloadButton=0`;
        console.log('Office viewer URL:', officeUrl);

        if (mounted) {
          setPreviewUrl(officeUrl);
        }

      } catch (error: any) {
        console.error('Preview error:', {
          error,
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        setError(error.message || 'Failed to preview template');
      }
    }

    loadPreview();

    return () => {
      mounted = false;
    };
  }, [templateId]);

  if (error) {
    return (
      <div className="text-red-600 dark:text-red-400 p-4">
        <div className="font-bold mb-2">Error previewing template:</div>
        <div>{error}</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="animate-pulse flex space-x-4 p-4">
        <div className="flex-1 space-y-4 py-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!previewUrl) {
    return null;
  }

  return (
    <div className="relative w-full h-full p-2">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden max-w-6xl mx-auto">
        <div className="aspect-[8.5/11] w-full">
          <iframe 
            src={previewUrl}
            className="w-full h-full border-0"
            title="Document Preview"
            style={{ 
              minHeight: '842px',
              width: '100%',
              height: '100%'
            }}
          />
        </div>
      </div>
    </div>
  );
}
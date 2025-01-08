'use client';

import { useState, useEffect } from 'react';
import { WIPEntry } from '@/src/types';
import { useRouter } from 'next/navigation';

interface DocGeneratorProps {
  client: string;
  entries: WIPEntry[];
}

export default function DocGenerator({ client, entries }: DocGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const generateDoc = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user settings from localStorage
      const userSettings = localStorage.getItem('userSettings');
      const settings = userSettings ? JSON.parse(userSettings) : {};
      
      // Generate invoice using template
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client,
          entries: entries.map(entry => ({
            description: entry.description,
            timeInMinutes: entry.timeInMinutes,
            hourlyRate: entry.hourlyRate,
            date: entry.startDate
          })),
          userSettings: settings
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate invoice');
      }

      const data = await response.json();
      if (data.documentId) {
        setDocumentId(data.documentId);
      }
    } catch (error) {
      console.error('Error generating document:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate document');
    } finally {
      setLoading(false);
    }
  };

  const handleEditWithAI = () => {
    if (documentId) {
      router.push(`/invoices/edit/${documentId}`);
    }
  };

  const handleDownload = () => {
    if (documentId) {
      window.open(`https://docs.google.com/document/d/${documentId}/export?format=pdf`, '_blank');
    }
  };

  return (
    <div className="space-y-4">
      {!documentId ? (
        <button
          onClick={generateDoc}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <span className="animate-spin">⚪</span>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generate Invoice
            </>
          )}
        </button>
      ) : (
        <div className="flex gap-4">
          <button
            onClick={handleEditWithAI}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit with AI
          </button>
          <button
            onClick={handleDownload}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Invoice
          </button>
        </div>
      )}

      {error && (
        <div className="text-red-500 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
} 
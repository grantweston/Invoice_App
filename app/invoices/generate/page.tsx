'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWIPStore } from '@/src/store/wipStore';
import { useGeneratedInvoices } from '@/src/store/generatedInvoicesStore';
import DocGenerator from '../../components/DocGenerator';
import { WIPEntry } from '@/src/types';

export default function GenerateInvoicePage() {
  const [generatingInvoices, setGeneratingInvoices] = useState<Record<string, boolean>>({});
  const wipEntries = useWIPStore((state) => state.entries);
  const addInvoice = useGeneratedInvoices((state) => state.addInvoice);

  // Format currency helper
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format time helper
  const formatTime = (hours: number): string => {
    const totalMinutes = Math.round(hours * 60);
    if (totalMinutes === 0) return '0 min';
    
    const displayHours = Math.floor(totalMinutes / 60);
    const displayMinutes = totalMinutes % 60;
    
    if (displayHours === 0) return `${displayMinutes} min`;
    if (displayMinutes === 0) return displayHours === 1 ? '1 hour' : `${displayHours} hours`;
    return `${displayHours} ${displayHours === 1 ? 'hour' : 'hours'}, ${displayMinutes} min`;
  };

  // Group entries by client
  const clientProjects = wipEntries.reduce((acc, entry) => {
    if (!acc[entry.client]) {
      acc[entry.client] = {
        projects: {},
        totalAmount: 0,
        totalHours: 0
      };
    }
    
    if (!acc[entry.client].projects[entry.project]) {
      acc[entry.client].projects[entry.project] = {
        entries: [],
        totalHours: 0,
        totalAmount: 0
      };
    }
    
    const timeInMinutes = entry.timeInMinutes || 0;
    const hours = timeInMinutes / 60;
    const amount = hours * entry.hourlyRate;
    
    acc[entry.client].projects[entry.project].entries.push({
      ...entry,
      id: typeof entry.id === 'string' ? parseInt(entry.id) : entry.id,
      associatedDailyIds: entry.associatedDailyIds.map(id => typeof id === 'string' ? parseInt(id) : id),
      subEntries: [],
      startDate: Date.now(),
      lastWorkedDate: Date.now()
    });
    acc[entry.client].projects[entry.project].totalHours += hours;
    acc[entry.client].projects[entry.project].totalAmount += amount;
    acc[entry.client].totalHours += hours;
    acc[entry.client].totalAmount += amount;
    
    return acc;
  }, {} as Record<string, {
    projects: Record<string, {
      entries: WIPEntry[];
      totalHours: number;
      totalAmount: number;
    }>;
    totalAmount: number;
    totalHours: number;
  }>);

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Generate New Invoice</h1>
          <p className="text-xs text-gray-600 dark:text-gray-400">Select a client to generate an invoice</p>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(clientProjects).map(([clientName, data]) => (
          <div 
            key={clientName} 
            className="bg-white dark:bg-[#1f2937] rounded-xl border border-gray-200 dark:border-[#374151] 
              shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden group"
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                    {clientName}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      {Object.keys(data.projects).length} projects
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatTime(data.totalHours)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatCurrency(data.totalAmount)}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setGeneratingInvoices(prev => ({ ...prev, [clientName]: true }));
                    const entries = Object.values(data.projects).flatMap(p => p.entries);
                    // Generate invoice for client
                    fetch('/api/invoices', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        client: clientName,
                        entries: entries,
                        date: new Date().toISOString()
                      })
                    })
                    .then(response => response.json())
                    .then(data => {
                      if (data.error) {
                        throw new Error(data.error);
                      }
                      // Add to generated invoices store
                      const totalAmount = entries.reduce((sum, entry) => 
                        sum + ((entry.timeInMinutes || 0) / 60 * entry.hourlyRate), 0
                      );
                      
                      // Check if we have the documentId in the response
                      if (!data.documentId) {
                        throw new Error('No document ID returned from server');
                      }
                      
                      try {
                        addInvoice({
                          id: data.documentId,
                          googleDocId: data.documentId,
                          client: clientName,
                          project: Object.keys(data.projects || {})[0] || entries[0]?.project || 'Unknown', // Fallback to first entry's project or 'Unknown'
                          date: new Date().toISOString(),
                          amount: totalAmount,
                          wipEntries: entries,
                          dailyActivities: []
                        });
                        window.location.href = '/invoices';
                      } catch (error) {
                        console.error('Error adding invoice to store:', error);
                        throw new Error('Failed to save invoice data');
                      }
                    })
                    .catch(error => {
                      console.error('Failed to generate invoice:', error);
                      alert('Failed to generate invoice. Please try again.');
                      setGeneratingInvoices(prev => ({ ...prev, [clientName]: false }));
                    });
                  }}
                  disabled={generatingInvoices[clientName]}
                  className={`${
                    generatingInvoices[clientName] 
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-blue-200 dark:hover:bg-blue-500/50 hover:border-blue-400 dark:hover:border-blue-500/50 hover:scale-105'
                  } bg-blue-100 dark:bg-blue-500/40
                    text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-500/40 
                    px-4 py-1.5 rounded text-xs h-[38px] flex items-center gap-1.5 transition-all duration-150 shadow-lg`}
                >
                  {generatingInvoices[clientName] ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Generate Invoice
                    </>
                  )}
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {Object.entries(data.projects).map(([projectName, projectData]) => (
                  <div key={projectName} className="pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{projectName}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1">
                        <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatTime(projectData.totalHours)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatCurrency(projectData.totalAmount)}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {Object.keys(clientProjects).length === 0 && (
          <div className="text-center py-16 rounded-xl border border-gray-200 dark:border-[#374151] 
            bg-white dark:bg-[#1f2937]">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600 dark:text-gray-400 mb-2 text-xs">No WIP entries found</p>
            <p className="text-xs text-gray-500">Start tracking work to generate invoices</p>
          </div>
        )}
      </div>
    </div>
  );
} 
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWIPStore } from '@/src/store/wipStore';
import { useGeneratedInvoices } from '@/src/store/generatedInvoicesStore';
import DocGenerator from '../../components/DocGenerator';
import { WIPEntry } from '@/src/types';
import FileDropZone from '@/app/components/FileDropZone';

interface ProjectData {
  entries: WIPEntry[];
  totalHours: number;
  totalAmount: number;
}

interface ClientData {
  projects: Record<string, ProjectData>;
  totalAmount: number;
  totalHours: number;
}

export default function GenerateInvoicePage() {
  const [generatingInvoices, setGeneratingInvoices] = useState<Record<string, boolean>>({});
  const [isAnalyzingWIP, setIsAnalyzingWIP] = useState(false);
  const [analyzedWIPData, setAnalyzedWIPData] = useState<any>(null);
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
    // Convert hours to minutes, handling both decimal hours and hour:minute format
    const totalMinutes = Math.round(hours * 60);
    
    // Calculate hours and remaining minutes
    const displayHours = Math.floor(totalMinutes / 60);
    const displayMinutes = totalMinutes % 60;
    
    // Format the output
    if (totalMinutes === 0) return '0 min';
    if (displayHours === 0) return `${displayMinutes} min`;
    if (displayMinutes === 0) return `${displayHours} ${displayHours === 1 ? 'hour' : 'hours'}`;
    return `${displayHours} ${displayHours === 1 ? 'hour' : 'hours'}, ${displayMinutes} min`;
  };

  const handleWIPFileAnalyzed = async (data: any) => {
    setIsAnalyzingWIP(true);
    try {
      // Data is already analyzed from FileDropZone, just use it directly
      console.log('Received analyzed WIP data:', data);
      
      // Log hours for each project
      if (Array.isArray(data)) {
        // Group by client and project
        const groupedData = data.reduce((acc, entry) => {
          const clientId = entry.client;
          if (!acc[clientId]) {
            acc[clientId] = {
              projects: {},
              totalAmount: 0,
              totalHours: 0
            };
          }
          
          const projectName = entry.project;
          if (!acc[clientId].projects[projectName]) {
            acc[clientId].projects[projectName] = {
              entries: [],
              totalHours: 0,
              totalAmount: 0
            };
          }
          
          // Add entry
          acc[clientId].projects[projectName].entries.push(entry);
          
          // Update totals
          const hours = entry.timeInMinutes / 60;
          acc[clientId].projects[projectName].totalHours += hours;
          acc[clientId].projects[projectName].totalAmount += entry.amount;
          acc[clientId].totalHours += hours;
          acc[clientId].totalAmount += entry.amount;
          
          return acc;
        }, {});

        setAnalyzedWIPData(groupedData);
      } else {
        throw new Error('Invalid data format received');
      }
    } catch (error) {
      console.error('Error processing WIP data:', error);
      alert('Failed to process WIP data. Please try again.');
    } finally {
      setIsAnalyzingWIP(false);
    }
  };

  const handleGenerateInvoice = async (clientName: string, data: ClientData) => {
    setGeneratingInvoices(prev => ({ ...prev, [clientName]: true }));
    try {
      const entries = Object.values(data.projects).flatMap(p => p.entries);
      // Generate invoice for client
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: clientName,
          entries: entries,
          date: new Date().toISOString()
        })
      });

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      // Add to generated invoices store
      const totalAmount = entries.reduce((sum, entry) => 
        sum + ((entry.timeInMinutes || 0) / 60 * entry.hourlyRate), 0
      );
      
      // Check if we have the documentId in the response
      if (!result.documentId) {
        throw new Error('No document ID returned from server');
      }
      
      try {
        addInvoice({
          id: result.documentId,
          googleDocId: result.documentId,
          client: clientName,
          project: Object.keys(data.projects || {})[0] || entries[0]?.project || 'Unknown', // Fallback to first entry's project or 'Unknown'
          date: new Date().toISOString(),
          amount: totalAmount,
          wipEntries: entries.map(entry => ({
            ...entry,
            associatedDailyIds: entry.associatedDailyIds?.map(id => Number(id)) || []
          })),
          dailyActivities: [],
          wip: totalAmount
        });
        window.location.href = '/invoices';
      } catch (error) {
        console.error('Error adding invoice to store:', error);
        throw new Error('Failed to save invoice data');
      }
    } catch (error) {
      console.error('Failed to generate invoice:', error);
      alert('Failed to generate invoice. Please try again.');
    } finally {
      setGeneratingInvoices(prev => ({ ...prev, [clientName]: false }));
    }
  };

  const handleGenerateInvoiceFromWIP = async (clientName: string, data: ClientData) => {
    setGeneratingInvoices(prev => ({ ...prev, [clientName]: true }));
    try {
      const entries = Object.values(data.projects).flatMap(p => p.entries);
      
      // Get all daily log IDs associated with these entries
      const dailyLogIds = new Set(entries.flatMap(entry => 
        entry.associatedDailyIds || []
      ));
      
      // Calculate total amount and hours from entries using the exact values from Excel
      let totalAmount = 0;
      let totalHours = 0;
      
      entries.forEach(entry => {
        const amount = (entry as any).amount || 0;
        const hours = (entry as any).timeInMinutes ? (entry as any).timeInMinutes / 60 : 0;
        console.log(`Entry: ${entry.description || 'Unknown'}`);
        console.log(`Amount: ${amount}, Hours: ${hours}`);
        totalAmount += amount;
        totalHours += hours;
      });
      
      console.log('\nSummary:');
      console.log('Total amount:', totalAmount);
      console.log('Total hours:', totalHours);
      console.log('Number of entries:', entries.length);
      
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: clientName,
          entries: entries.map(entry => ({
            ...entry,
            amount: (entry as any).amount || 0,
            timeInMinutes: (entry as any).timeInMinutes || 0
          })),
          date: new Date().toISOString(),
          amount: totalAmount,
          totalHours: totalHours
        })
      });

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.documentId) {
        throw new Error('No document ID returned from server');
      }

      addInvoice({
        id: result.documentId,
        googleDocId: result.documentId,
        client: clientName,
        project: Object.keys(data.projects)[0] || 'General',
        date: new Date().toISOString(),
        amount: totalAmount,
        wip: totalAmount,
        wipEntries: entries,
        dailyActivities: []
      });

      window.location.href = '/invoices';
    } catch (error) {
      console.error('Failed to generate invoice:', error);
      alert('Failed to generate invoice. Please try again.');
    } finally {
      setGeneratingInvoices(prev => ({ ...prev, [clientName]: false }));
    }
  };

  // Group entries by client
  const clientProjects = wipEntries.reduce((acc, entry) => {
    console.log('\nProcessing entry:', entry);
    
    if (!acc[entry.client]) {
      console.log('Creating new client:', entry.client);
      acc[entry.client] = {
        projects: {},
        totalAmount: 0,
        totalHours: 0
      };
    }
    
    if (!acc[entry.client].projects[entry.project]) {
      console.log('Creating new project:', entry.project);
      acc[entry.client].projects[entry.project] = {
        entries: [],
        totalHours: 0,
        totalAmount: 0
      };
    }
    
    const timeInMinutes = entry.timeInMinutes || 0;
    const hours = timeInMinutes / 60;
    const amount = hours * entry.hourlyRate;
    
    console.log('Entry details:');
    console.log('- Time in minutes:', timeInMinutes);
    console.log('- Hours:', hours);
    console.log('- Amount:', amount);
    
    acc[entry.client].projects[entry.project].entries.push({
      ...entry,
      id: typeof entry.id === 'string' ? parseInt(entry.id) : entry.id,
      associatedDailyIds: entry.associatedDailyIds.map(id => 
        typeof id === 'string' ? parseInt(id) : id
      ),
      subEntries: [],
      startDate: Date.now(),
      lastWorkedDate: Date.now()
    });
    
    // Update project totals
    acc[entry.client].projects[entry.project].totalHours += hours;
    acc[entry.client].projects[entry.project].totalAmount += amount;
    
    console.log('Project totals after update:');
    console.log('- Project hours:', acc[entry.client].projects[entry.project].totalHours);
    console.log('- Project amount:', acc[entry.client].projects[entry.project].totalAmount);
    
    // Update client totals
    acc[entry.client].totalHours += hours;
    acc[entry.client].totalAmount += amount;
    
    console.log('Client totals after update:');
    console.log('- Client hours:', acc[entry.client].totalHours);
    console.log('- Client amount:', acc[entry.client].totalAmount);
    
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

  // Log final totals for verification
  Object.entries(clientProjects).forEach(([clientName, data]) => {
    console.log(`\nFinal totals for client ${clientName}:`);
    console.log('Total hours:', data.totalHours);
    console.log('Total amount:', data.totalAmount);
    
    Object.entries(data.projects).forEach(([projectName, projectData]) => {
      console.log(`\n${projectName}:`);
      console.log('Hours:', projectData.totalHours);
      console.log('Amount:', projectData.totalAmount);
      console.log('Number of entries:', projectData.entries.length);
    });
  });

  const renderClientCard = (clientName: string, data: any, isFromExcel: boolean = false) => {
    // Calculate total hours for display - use exact hours from data
    const totalHours = data.totalHours;
    
    return (
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
                  {formatTime(totalHours)}
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
              onClick={() => isFromExcel ? 
                handleGenerateInvoiceFromWIP(clientName, data) : 
                handleGenerateInvoice(clientName, data)
              }
              disabled={generatingInvoices[clientName]}
              className={`${
                generatingInvoices[clientName] 
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-blue-200 dark:hover:bg-blue-500/50 hover:border-blue-400 dark:hover:border-blue-500/50 hover:scale-105'
              } bg-blue-100 dark:bg-blue-500/40
                text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-500/40 
                px-4 py-1.5 rounded-lg text-xs h-[38px] flex items-center gap-1.5 transition-all duration-150 shadow-lg`}
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
            {Object.entries(data.projects).map(([projectName, projectData]: [string, any]) => {
              // Use exact hours from project data
              const projectHours = projectData.totalHours;
              
              return (
                <div key={projectName} className="pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{projectName}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatTime(projectHours)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatCurrency(projectData.totalAmount)}
                    </span>
                  </p>
                  {isFromExcel && projectData.entries.map((entry: any, index: number) => (
                    <div key={index} className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                      <p>{entry.description}</p>
                      {entry.comments && entry.comments !== entry.description && (
                        <p className="text-gray-500 dark:text-gray-500 mt-1">{entry.comments}</p>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Generate New Invoice</h1>
          <p className="text-xs text-gray-600 dark:text-gray-400">Select a client or upload a WIP file to generate an invoice</p>
        </div>
      </div>

      {/* File Drop Zone */}
      <div className="bg-white dark:bg-[#1f2937] rounded-xl border border-gray-200 dark:border-[#374151] shadow-lg p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Upload WIP Excel File</h2>
        <FileDropZone onFileAnalyzed={handleWIPFileAnalyzed} />
        
        {isAnalyzingWIP && (
          <div className="mt-6 flex items-center justify-center">
            <div className="space-y-3">
              <svg className="w-8 h-8 mx-auto text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <p className="text-sm text-gray-600 dark:text-gray-400">Analyzing WIP data...</p>
            </div>
          </div>
        )}
        
        {analyzedWIPData && (
          <div className="mt-6 space-y-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Analyzed WIP Data</h3>
            <div className="space-y-4">
              {Object.entries(analyzedWIPData).map(([clientName, data]: [string, any]) => 
                renderClientCard(clientName, data, true)
              )}
            </div>
          </div>
        )}
      </div>

      {(!analyzedWIPData || Object.keys(clientProjects).length > 0) && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 bg-gray-50 dark:bg-[rgb(17,17,17)] text-sm text-gray-500">
                {analyzedWIPData ? 'or select from existing WIP' : 'or select from existing WIP'}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {Object.entries(clientProjects).map(([clientName, data]) => 
              renderClientCard(clientName, data)
            )}

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
        </>
      )}
    </div>
  );
} 
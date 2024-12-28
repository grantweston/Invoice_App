'use client';

import { useState, useEffect } from 'react';
import InvoiceTemplateUpload from '../components/InvoiceTemplateUpload';
import { useInvoiceStore } from '@/src/store/invoiceStore';
import { useWIPStore } from '@/src/store/wipStore';
import { formatTime, formatCurrency } from '@/src/utils/formatting';

export default function InvoicePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(),
    end: new Date()
  });
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const templates = useInvoiceStore((state) => state.templates);
  const selectedTemplate = useInvoiceStore((state) => state.selectedTemplate);
  const wipEntries = useWIPStore((state) => state.entries);

  // Add loading state
  useEffect(() => {
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Group entries by client and project
  const clientProjects = wipEntries.reduce((acc, entry) => {
    if (!entry.client) return acc;
    
    if (!acc[entry.client]) {
      acc[entry.client] = {
        totalAmount: 0,
        projects: {}
      };
    }

    if (!acc[entry.client].projects[entry.project]) {
      acc[entry.client].projects[entry.project] = {
        entries: [],
        totalAmount: 0
      };
    }

    const timeInHours = entry.timeInMinutes / 60;
    const amount = timeInHours * (entry.hourlyRate || 0);
    
    acc[entry.client].projects[entry.project].entries.push(entry);
    acc[entry.client].projects[entry.project].totalAmount += amount;
    acc[entry.client].totalAmount += amount;

    return acc;
  }, {} as Record<string, { 
    totalAmount: number;
    projects: Record<string, {
      entries: typeof wipEntries;
      totalAmount: number;
    }>;
  }>);

  const handleGenerateInvoice = async () => {
    if (!selectedTemplate || !selectedClient || !invoiceNumber) {
      alert('Please select a template, client, and provide an invoice number');
      return;
    }
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: selectedTemplate,
          client: selectedClient,
          invoiceNumber,
          dateRange,
          entries: clientProjects[selectedClient]
        }),
      });

      if (!response.ok) throw new Error('Failed to generate invoice');

      // Check content type to ensure we're getting a document
      const contentType = response.headers.get('Content-Type');
      if (!contentType?.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
        throw new Error('Invalid response format');
      }

      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link and click it to download
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoiceNumber}-${selectedClient}.docx`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Failed to generate invoice. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Invoice Generation
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Generate professional invoices from your work sessions
        </p>
      </div>

      {/* Template Section */}
      <div className="space-y-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Invoice Templates
            </h2>
            
            {templates.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Available Templates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {template.name}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {Object.values(template.placeholders).flat().length} placeholders
                          </p>
                        </div>
                        <button
                          onClick={() => useInvoiceStore.getState().removeTemplate(template.id)}
                          className="text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={templates.length > 0 ? 'border-t border-gray-200 dark:border-gray-700 pt-6' : ''}>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {templates.length > 0 ? 'Upload New Template' : 'Get Started'}
              </h3>
              <InvoiceTemplateUpload />
            </div>
          </div>
        </div>

        {/* Invoice Configuration Card - Only show if templates exist */}
        {templates.length > 0 && (
          <>
            {/* Invoice Configuration Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
                Invoice Configuration
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Template Selection */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Template
                  </label>
                  <select
                    value={selectedTemplate || ''}
                    onChange={(e) => useInvoiceStore.getState().setSelectedTemplate(e.target.value || null)}
                    className="w-full p-2.5 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors duration-150"
                  >
                    <option value="">Select a template...</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </select>
                </div>

                {/* Invoice Number */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="INV-001"
                    className="w-full p-2.5 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors duration-150"
                  />
                </div>

                {/* Client Selection */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Client
                  </label>
                  <select
                    value={selectedClient || ''}
                    onChange={(e) => setSelectedClient(e.target.value || null)}
                    className="w-full p-2.5 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors duration-150"
                  >
                    <option value="">Select a client...</option>
                    {Object.keys(clientProjects).map((client) => (
                      <option key={client} value={client}>{client}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.start.toISOString().split('T')[0]}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
                    className="w-full p-2.5 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors duration-150"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.end.toISOString().split('T')[0]}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
                    className="w-full p-2.5 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors duration-150"
                  />
                </div>
              </div>
            </div>

            {/* Preview Section */}
            {selectedClient && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="border-b border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Invoice Preview for {selectedClient}
                  </h2>
                </div>
                
                <div className="p-6">
                  <div className="space-y-8">
                    {Object.entries(clientProjects[selectedClient].projects).map(([project, data]) => (
                      <div key={project} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">
                            {project}
                          </h3>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {formatCurrency(data.totalAmount)}
                          </span>
                        </div>
                        <div className="pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                          {data.entries.map((entry) => (
                            <div key={entry.id} className="py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                              <div className="text-sm text-gray-700 dark:text-gray-300">
                                {entry.description}
                              </div>
                              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                  {formatTime(entry.timeInMinutes / 60)}
                                </span>
                                <span>•</span>
                                <span>{formatCurrency(entry.hourlyRate || 0)}/hr</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Total Amount</span>
                        <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                          {formatCurrency(clientProjects[selectedClient].totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 flex justify-end space-x-4">
                  <button
                    onClick={() => {/* Handle preview */}}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                      border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-150"
                  >
                    Preview Invoice
                  </button>
                  <button
                    onClick={handleGenerateInvoice}
                    disabled={isGenerating || !selectedTemplate || !selectedClient}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isGenerating || !selectedTemplate || !selectedClient
                        ? 'bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed'
                        : 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800'
                    }`}
                  >
                    {isGenerating ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Generating...
                      </span>
                    ) : (
                      'Generate Invoice'
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 
"use client";

import { useState, useEffect, useCallback } from 'react';
import InvoicePreview from '../components/InvoicePreview';
import InvoiceTemplateUpload from '../components/InvoiceTemplateUpload';
import { useInvoiceStore } from '@/src/store/invoiceStore';

export default function GenerateInvoicePage() {
  // Local state
  const [isGenerating, setIsGenerating] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('INV-001');
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [isFilled, setIsFilled] = useState(false);
  
  // Store subscriptions
  const templates = useInvoiceStore((state) => state.templates);
  const selectedTemplate = useInvoiceStore((state) => state.selectedTemplate);
  const setSelectedTemplate = useInvoiceStore((state) => state.setSelectedTemplate);
  const entries = useInvoiceStore((state) => state.entries);
  const loadEntries = useInvoiceStore((state) => state.loadEntries);

  // Load entries on mount
  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Handle template selection
  const handleTemplateSelect = useCallback((templateId: string) => {
    const store = useInvoiceStore.getState();
    const template = store.templates.find(t => t.id === templateId);
    
    if (template) {
      store.setSelectedTemplate(template);
    }
  }, []);

  // Handle template upload completion
  const handleUploadComplete = useCallback(async (templateId: string) => {
    const store = useInvoiceStore.getState();
    const template = store.templates.find(t => t.id === templateId);
    
    if (template) {
      setIsGenerating(true);
      await new Promise(resolve => setTimeout(resolve, 0));
      store.setSelectedTemplate(template);
      setIsGenerating(false);
    }
  }, []);

  // Filter entries by date range
  const getFilteredEntries = useCallback(() => {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    return {
      wipEntries: entries.wip.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= startDate && entryDate <= endDate;
      }),
      dailyActivities: entries.daily.filter(activity => {
        const activityDate = new Date(activity.date);
        return activityDate >= startDate && activityDate <= endDate;
      })
    };
  }, [entries, dateRange]);

  // Fill template with data
  const fillTemplate = async () => {
    if (!selectedTemplate?.id) {
      alert('Please select a template first');
      return;
    }
    
    try {
      setIsGenerating(true);
      const { wipEntries, dailyActivities } = getFilteredEntries();

      // Validate we have entries in the date range
      if (wipEntries.length === 0 && dailyActivities.length === 0) {
        throw new Error('No entries found in the selected date range');
      }

      // Get client info from first WIP entry
      const clientInfo = wipEntries[0]?.client || {
        name: 'Client Name Required',
        address: 'Client Address Required',
        id: 'client-id-required'
      };

      const response = await fetch('/api/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          client: clientInfo,
          invoiceNumber,
          dateRange,
          wipEntries,
          dailyActivities,
          retainerAmount: wipEntries[0]?.retainerAmount,
          adjustments: wipEntries[0]?.adjustments
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate invoice: ${errorText}`);
      }

      // Handle the docx file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceNumber}-${clientInfo.name.replace(/\s+/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setIsFilled(true);
    } catch (error) {
      console.error('Failed to fill template:', error);
      alert('Failed to fill template: ' + (error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex min-h-screen relative overflow-hidden bg-white dark:bg-[#121212]">
      {/* Left side - Configuration */}
      <div 
        className={`transition-all duration-300 ease-in-out ${
          selectedTemplate ? 'w-1/2' : 'w-full'
        } p-6 overflow-y-auto border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e]`}
      >
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">Invoice Generation</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">Generate professional invoices from your work sessions</p>

          {/* Templates Section */}
          <div className="bg-gray-50 dark:bg-[#2a2a2a] rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Invoice Templates</h2>
            
            {/* Available Templates */}
            {templates.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Available Templates</h3>
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div 
                      key={template.id} 
                      className={`flex items-center justify-between p-3 border rounded-lg transition-all duration-200 ${
                        selectedTemplate?.id === template.id 
                          ? 'border-gray-400 bg-gray-100 dark:bg-[#323232] dark:border-gray-600' 
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2a2a2a]'
                      }`}
                    >
                      <div className="flex-1 cursor-pointer" onClick={() => handleTemplateSelect(template.id)}>
                        <div className="font-medium text-gray-900 dark:text-white">{template.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {Object.values(template.placeholders).flat().length} placeholders
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const store = useInvoiceStore.getState();
                          store.removeTemplate(template.id);
                        }}
                        className="ml-4 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                      >
                        <span className="sr-only">Remove template</span>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload New Template */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {templates.length > 0 ? 'Upload New Template' : 'Get Started'}
              </h3>
              <InvoiceTemplateUpload onUploadComplete={handleUploadComplete} />
            </div>
          </div>

          {/* Configuration Section */}
          {templates.length > 0 && (
            <div className="bg-gray-50 dark:bg-[#2a2a2a] rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Configuration</h2>
              <div className="space-y-6">
                {/* Template Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Template</label>
                  <select
                    value={selectedTemplate?.id || ''}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full p-2 border rounded bg-white dark:bg-[#323232] text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent"
                  >
                    <option value="">Select a template...</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Invoice Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Invoice Number</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full p-2 border rounded bg-white dark:bg-[#323232] text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent"
                  />
                </div>

                {/* Client Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Client</label>
                  <select className="w-full p-2 border rounded bg-white dark:bg-[#323232] text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent">
                    <option>Jack & Michelle Goldberg</option>
                  </select>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full p-2 border rounded bg-white dark:bg-[#323232] text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full p-2 border rounded bg-white dark:bg-[#323232] text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Fill Template Button */}
                <button
                  onClick={fillTemplate}
                  disabled={isGenerating || !selectedTemplate}
                  className={`w-full py-2 px-4 rounded-lg text-white transition-colors ${
                    isGenerating || !selectedTemplate
                      ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700'
                  }`}
                >
                  {isGenerating ? 'Generating...' : 'Fill Template'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right side - Preview */}
      <div 
        className={`absolute top-0 right-0 w-1/2 h-full transition-all duration-300 ease-in-out transform ${
          selectedTemplate ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedTemplate && (
          <div className="h-full p-6 bg-gray-50 dark:bg-[#1e1e1e] animate-fade-in">
            <div className="h-full">
              <InvoicePreview
                templateId={selectedTemplate.id}
                isLoading={isGenerating}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
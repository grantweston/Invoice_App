"use client";

import { useState, useEffect } from 'react';
import InvoicePreview from '../components/InvoicePreview';
import { useInvoiceStore } from '@/src/stores/invoiceStore';

export default function GenerateInvoicePage() {
  const [previewHtml, setPreviewHtml] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { 
    templates,
    selectedTemplate, 
    selectedClient, 
    entries,
    setSelectedTemplate,
    setSelectedClient,
    addWIPEntry,
    addDailyActivity,
    clearEntries
  } = useInvoiceStore();

  // New state for form inputs
  const [newWIPEntry, setNewWIPEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    timeInMinutes: 0,
    hourlyRate: 300
  });

  const [newDailyActivity, setNewDailyActivity] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    timeInMinutes: 0
  });

  // Load template preview when template is selected
  const loadTemplatePreview = async (templateId: string) => {
    try {
      console.log('Loading template preview for:', templateId);
      const response = await fetch('/api/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          client: { name: 'Sample Client', id: 'sample' },
          invoiceNumber: 'PREVIEW',
          dateRange: {
            start: new Date().toISOString().split('T')[0],
            end: new Date().toISOString().split('T')[0]
          },
          wipEntries: [],
          dailyActivities: []
        })
      });

      console.log('Preview response status:', response.status);
      const data = await response.json();
      console.log('Preview response data:', {
        hasError: !!data.error,
        previewLength: data.preview?.length,
        error: data.error
      });

      if (data.error) throw new Error(data.error);

      console.log('Setting preview HTML...');
      setPreviewHtml(data.preview);
      setShowPreview(true);
    } catch (error) {
      console.error('Failed to load template preview:', error);
    }
  };

  // Handle template selection
  const handleTemplateSelect = async (templateId: string) => {
    console.log('Selecting template:', templateId);
    setSelectedTemplate({
      id: templateId,
      name: 'EisnerAmperTemplate.docx'
    });
    if (templateId) {
      await loadTemplatePreview(templateId);
    }
  };

  // Load preview when component mounts if template is already selected
  useEffect(() => {
    console.log('Component mounted, checking for template:', selectedTemplate);
    if (selectedTemplate?.id) {
      loadTemplatePreview(selectedTemplate.id);
    }
  }, [selectedTemplate]);

  // Handle client selection
  const handleClientSelect = (clientName: string) => {
    console.log('Selecting client:', clientName);
    setSelectedClient({
      id: 'client-1',
      name: clientName
    });
  };

  // Handle adding WIP entry
  const handleAddWIPEntry = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Adding WIP entry:', newWIPEntry);
    addWIPEntry(newWIPEntry);
    setNewWIPEntry({
      ...newWIPEntry,
      description: ''
    });
  };

  // Handle adding daily activity
  const handleAddDailyActivity = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Adding daily activity:', newDailyActivity);
    addDailyActivity(newDailyActivity);
    setNewDailyActivity({
      ...newDailyActivity,
      description: ''
    });
  };

  const generateInvoice = async (isPreview = false) => {
    console.log('Starting invoice generation...', {
      isPreview,
      selectedTemplate,
      selectedClient,
      entriesCount: {
        wip: entries.wip.length,
        daily: entries.daily.length
      }
    });

    if (!selectedTemplate || !selectedClient) {
      console.log('Missing required data:', { selectedTemplate, selectedClient });
      alert('Please select a template and client first');
      return;
    }

    setIsGenerating(true);
    try {
      const requestData = {
        templateId: selectedTemplate.id,
        client: selectedClient,
        invoiceNumber: `INV-${Date.now()}`,
        dateRange: {
          start: new Date().toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0]
        },
        wipEntries: entries.wip,
        dailyActivities: entries.daily
      };
      console.log('Sending request to generate invoice:', requestData);

      const response = await fetch('/api/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      console.log('Received response:', {
        status: response.status,
        statusText: response.statusText
      });

      const data = await response.json();
      console.log('Parsed response data:', {
        hasError: !!data.error,
        hasPreview: !!data.preview,
        hasDocument: !!data.document,
        previewLength: data.preview?.length
      });

      if (data.error) {
        console.error('Error in response:', data.error);
        throw new Error(data.error);
      }

      console.log('Setting preview HTML, length:', data.preview?.length);
      setPreviewHtml(data.preview);
      setShowPreview(true);

      if (!isPreview && data.document) {
        console.log('Preparing document download...');
        const docxBlob = new Blob(
          [Buffer.from(data.document, 'base64')],
          { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
        );
        const url = URL.createObjectURL(docxBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice-${selectedClient.name}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('Document download triggered');
      }
    } catch (error) {
      console.error('Failed to generate invoice:', error);
      alert('Failed to generate invoice. Please try again.');
    } finally {
      setIsGenerating(false);
      console.log('Invoice generation completed');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
            <select
              value={selectedTemplate?.id || ''}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Select a template...</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.placeholders || 0} placeholders)
                </option>
              ))}
            </select>
            <div className="mt-2 text-sm text-gray-500">
              {selectedTemplate ? 
                `Selected template: ${selectedTemplate.name} (${selectedTemplate.id})` : 
                'No template selected'
              }
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
            <select
              value={selectedClient?.name || ''}
              onChange={(e) => handleClientSelect(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Select a client...</option>
              <option value="Jack & Michelle Goldberg">Jack & Michelle Goldberg</option>
            </select>
          </div>
        </div>

        {/* Show template preview at the top */}
        {showPreview && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Template Preview</h2>
            <InvoicePreview 
              html={previewHtml} 
              isLoading={isGenerating}
            />
          </div>
        )}

        {/* WIP Entries Section */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">WIP Entries</h2>
          <form onSubmit={handleAddWIPEntry} className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newWIPEntry.date}
                  onChange={(e) => setNewWIPEntry({ ...newWIPEntry, date: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newWIPEntry.description}
                  onChange={(e) => setNewWIPEntry({ ...newWIPEntry, description: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="Enter work description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time (minutes)</label>
                <input
                  type="number"
                  value={newWIPEntry.timeInMinutes}
                  onChange={(e) => setNewWIPEntry({ ...newWIPEntry, timeInMinutes: parseInt(e.target.value) })}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add WIP Entry
              </button>
            </div>
          </form>
          
          {/* Display WIP Entries */}
          <div className="mt-4">
            {entries.wip.map((entry, index) => (
              <div key={index} className="p-2 border-b last:border-b-0">
                <div className="flex justify-between">
                  <span className="font-medium">{entry.date}</span>
                  <span>{entry.timeInMinutes} minutes</span>
                </div>
                <p className="text-gray-600">{entry.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Activities Section */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Daily Activities</h2>
          <form onSubmit={handleAddDailyActivity} className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newDailyActivity.date}
                  onChange={(e) => setNewDailyActivity({ ...newDailyActivity, date: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newDailyActivity.description}
                  onChange={(e) => setNewDailyActivity({ ...newDailyActivity, description: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="Enter activity description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time (minutes)</label>
                <input
                  type="number"
                  value={newDailyActivity.timeInMinutes}
                  onChange={(e) => setNewDailyActivity({ ...newDailyActivity, timeInMinutes: parseInt(e.target.value) })}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add Daily Activity
              </button>
            </div>
          </form>
          
          {/* Display Daily Activities */}
          <div className="mt-4">
            {entries.daily.map((activity, index) => (
              <div key={index} className="p-2 border-b last:border-b-0">
                <div className="flex justify-between">
                  <span className="font-medium">{activity.date}</span>
                  <span>{activity.timeInMinutes} minutes</span>
                </div>
                <p className="text-gray-600">{activity.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between">
          <button
            onClick={clearEntries}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear All Entries
          </button>
          <div className="space-x-4">
            <button
              onClick={() => {
                console.log('Preview button clicked');
                generateInvoice(true);
              }}
              disabled={isGenerating}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
            >
              {isGenerating ? 'Previewing...' : 'Update Preview'}
            </button>
            <button
              onClick={() => {
                console.log('Generate & Download button clicked');
                generateInvoice(false);
              }}
              disabled={isGenerating}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : 'Generate & Download'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
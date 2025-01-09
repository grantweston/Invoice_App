"use client";

import { useState, useEffect } from 'react';

export default function GenerateInvoicePage() {
  const [previewHtml, setPreviewHtml] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
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
    if (templateId) {
      await loadTemplatePreview(templateId);
    }
  };

  // Load preview when component mounts if template is already selected
  useEffect(() => {
    console.log('Component mounted');
  }, []);

  // Handle client selection
  const handleClientSelect = (clientName: string) => {
    console.log('Selecting client:', clientName);
  };

  // Handle adding WIP entry
  const handleAddWIPEntry = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Adding WIP entry:', newWIPEntry);
    setNewWIPEntry({
      ...newWIPEntry,
      description: ''
    });
  };

  // Handle adding daily activity
  const handleAddDailyActivity = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Adding daily activity:', newDailyActivity);
    setNewDailyActivity({
      ...newDailyActivity,
      description: ''
    });
  };

  const generateInvoice = async (isPreview = false) => {
    console.log('Starting invoice generation...', {
      isPreview
    });

    setIsGenerating(true);
    try {
      const requestData = {
        templateId: 'temp-id',
        client: { name: 'Sample Client', id: 'sample' },
        invoiceNumber: `INV-${Date.now()}`,
        dateRange: {
          start: new Date().toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0]
        },
        wipEntries: [],
        dailyActivities: []
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
        a.download = `Invoice.docx`;
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
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Select a template...</option>
              <option value="template1">Template 1</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
            <select
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
            <div 
              className="invoice-preview bg-white p-4 rounded shadow"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
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
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => {
              console.log('Clear button clicked');
            }}
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
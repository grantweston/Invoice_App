'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Template } from '@/src/services/templateService';
import { Trash2 } from 'lucide-react';

export default function TemplateManager() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [defaultTemplateId, setDefaultTemplateId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      
      // Update both states at once to prevent multiple rerenders
      setTemplates(data.templates || []);
      setDefaultTemplateId(data.defaultTemplateId || null);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('template', selectedFile);

      const response = await fetch('/api/templates', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload template');
      }

      // Set as default template if none exists
      if (!defaultTemplateId) {
        await fetch('/api/templates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId: data.originalId }),
        });
        setDefaultTemplateId(data.originalId);
      }

      // Clear selection
      setSelectedFile(null);
      if (event.target) {
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (input) input.value = '';
      }

      // Refresh template list
      await fetchTemplates();
    } catch (error) {
      console.error('Error uploading template:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload template. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const setAsDefault = async (templateId: string) => {
    // Optimistically update UI immediately
    setDefaultTemplateId(templateId);

    try {
      const response = await fetch('/api/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set default template');
      }
    } catch (error) {
      console.error('Error setting default template:', error);
      // Revert optimistic update on error
      alert('Failed to set default template. Please try again.');
      await fetchTemplates(); // Refresh to get correct state
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template? This cannot be undone.')) {
      return;
    }

    setIsDeleting(templateId);
    
    // Optimistically update UI immediately
    setTemplates(prev => prev.filter(t => t.id !== templateId));
    if (templateId === defaultTemplateId) {
      setDefaultTemplateId(null);
    }

    try {
      // Run delete operation in background
      const deletePromise = fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      });

      // Run template refresh in parallel
      const refreshPromise = fetch('/api/templates')
        .then(res => res.json())
        .then(data => {
          if (data.templates) {
            setTemplates(data.templates);
          }
          if (data.defaultTemplateId) {
            setDefaultTemplateId(data.defaultTemplateId);
          }
        });

      // Wait for both operations to complete
      const [deleteResponse] = await Promise.all([
        deletePromise,
        refreshPromise
      ]);

      if (!deleteResponse.ok) {
        const data = await deleteResponse.json();
        throw new Error(data.error || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete template. Please try again.');
      // Refresh templates list in case of error
      await fetchTemplates();
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700">
      <div className="space-y-6">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Upload New Template
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="file"
              accept=".doc,.docx,.pdf"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 dark:text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 dark:file:bg-blue-900 file:text-blue-700 dark:file:text-blue-200
                hover:file:bg-blue-100 dark:hover:file:bg-blue-800"
            />
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg
                disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed
                hover:bg-blue-700 transition-colors"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>

        {/* Templates List */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Available Templates</h3>
          {isLoading ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
              Loading templates...
            </div>
          ) : templates.length > 0 ? (
            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div>
                    <div className="font-medium dark:text-gray-200">{template.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {template.googleDocId ? 'Converted to Google Doc' : 'Original Document'}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <a
                      href={template.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      View
                    </a>
                    {template.id !== defaultTemplateId && (
                      <button
                        onClick={() => setAsDefault(template.id)}
                        className="text-sm px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-full
                          hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                      >
                        Set as Default
                      </button>
                    )}
                    {template.id === defaultTemplateId && (
                      <span className="text-sm px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded-full">
                        Default Template
                      </span>
                    )}
                    <button
                      onClick={() => handleDelete(template.id)}
                      disabled={isDeleting === template.id}
                      className="p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 disabled:text-gray-400
                        dark:disabled:text-gray-600 disabled:cursor-not-allowed transition-colors rounded-full
                        hover:bg-red-50 dark:hover:bg-red-900"
                      title="Delete template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              No templates available. Upload one to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
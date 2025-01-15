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
    <div className="p-6 bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg border border-gray-700">
      <h2 className="text-xl font-semibold text-white mb-6">Invoice Template</h2>
      
      <div className="space-y-8">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Upload New Template
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="file"
              accept=".doc,.docx,.pdf"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-300
                file:mr-4 file:py-2.5 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-medium
                file:bg-blue-600/20 file:text-blue-400
                hover:file:bg-blue-600/30 file:transition-all file:shadow-sm
                file:border file:border-blue-500/30"
            />
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="px-4 py-2.5 bg-blue-600/20 text-blue-400 rounded-lg
                disabled:bg-gray-700/20 disabled:text-gray-400 disabled:cursor-not-allowed
                hover:bg-blue-600/30 transition-all shadow-sm
                font-medium min-w-[100px] border border-blue-500/30"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>

        {/* Templates List */}
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-3">Available Templates</h3>
          {isLoading ? (
            <div className="text-sm text-gray-400 animate-pulse">
              Loading templates...
            </div>
          ) : templates.length > 0 ? (
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-4 bg-gray-700/50 backdrop-blur-sm rounded-lg
                    border border-gray-600 hover:border-gray-500 transition-colors"
                >
                  <div>
                    <div className="font-medium text-white">{template.name}</div>
                    <div className="text-sm text-gray-400 mt-0.5">
                      {template.googleDocId ? 'Converted to Google Doc' : 'Original Document'}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <a
                      href={template.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm px-4 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg
                        hover:bg-blue-600/30 transition-all font-medium border border-blue-500/30"
                    >
                      View
                    </a>
                    {template.id !== defaultTemplateId && (
                      <button
                        onClick={() => setAsDefault(template.id)}
                        className="text-sm px-4 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg
                          hover:bg-blue-600/30 transition-all font-medium border border-blue-500/30"
                      >
                        Set as Default
                      </button>
                    )}
                    {template.id === defaultTemplateId && (
                      <span className="text-sm px-4 py-1.5 bg-green-600/20 text-green-400 rounded-lg
                        font-medium border border-green-500/30">
                        Default Template
                      </span>
                    )}
                    <button
                      onClick={() => handleDelete(template.id)}
                      disabled={isDeleting === template.id}
                      className="p-2 text-red-400 hover:text-red-300 disabled:text-gray-600
                        disabled:cursor-not-allowed transition-colors rounded-lg
                        hover:bg-red-400/10 bg-red-500/10 border border-red-500/30"
                      title="Delete template"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-400 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
              No templates available. Upload one to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
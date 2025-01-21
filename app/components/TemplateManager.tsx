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
    <div className="p-4 bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="space-y-6">
        {/* File Upload */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Upload New Template
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="file"
              accept=".doc,.docx,.pdf"
              onChange={handleFileSelect}
              className="block w-full text-xs text-gray-700 dark:text-gray-300
                file:mr-4 file:py-2 file:px-3
                file:rounded-lg file:border-0
                file:text-xs file:font-medium
                file:bg-blue-50 dark:file:bg-blue-600/20 file:text-blue-600 dark:file:text-blue-400
                hover:file:bg-blue-100 dark:hover:file:bg-blue-600/30 file:transition-all file:shadow-sm
                file:border file:border-blue-200 dark:file:border-blue-500/30"
            />
            {selectedFile && (
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 rounded-lg
                  hover:bg-blue-100 dark:hover:bg-blue-600/30 transition-all font-medium border border-blue-200 dark:border-blue-500/30
                  disabled:bg-gray-100 dark:disabled:bg-gray-700/20 disabled:text-gray-400 disabled:cursor-not-allowed
                  shadow-sm hover:scale-105"
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            )}
          </div>
        </div>

        {/* Templates List */}
        <div>
          <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Available Templates</h3>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 backdrop-blur-sm rounded-lg
                    border border-gray-200 dark:border-gray-600 animate-pulse"
                >
                  <div className="space-y-2">
                    <div className="h-4 w-48 bg-gray-200 dark:bg-gray-600 rounded" />
                    <div className="h-3 w-32 bg-gray-200 dark:bg-gray-600 rounded" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-[30px] w-16 bg-gray-200 dark:bg-gray-600 rounded-lg" />
                    <div className="h-[30px] w-24 bg-gray-200 dark:bg-gray-600 rounded-lg" />
                    <div className="h-[30px] w-8 bg-gray-200 dark:bg-gray-600 rounded-lg" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent -translate-x-full animate-shimmer" />
                </div>
              ))}
            </div>
          ) : templates.length > 0 ? (
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 backdrop-blur-sm rounded-lg
                    border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{template.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {template.googleDocId ? 'Converted to Google Doc' : 'Original Document'}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <a
                      href={template.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 rounded-lg
                        hover:bg-blue-100 dark:hover:bg-blue-600/30 transition-all font-medium border border-blue-200 dark:border-blue-500/30"
                    >
                      View
                    </a>
                    {template.id !== defaultTemplateId && (
                      <button
                        onClick={() => setAsDefault(template.id)}
                        className="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 rounded-lg
                          hover:bg-blue-100 dark:hover:bg-blue-600/30 transition-all font-medium border border-blue-200 dark:border-blue-500/30"
                      >
                        Set as Default
                      </button>
                    )}
                    {template.id === defaultTemplateId && (
                      <span className="text-xs px-3 py-1.5 bg-green-50 dark:bg-green-600/20 text-green-600 dark:text-green-400 rounded-lg
                        font-medium border border-green-200 dark:border-green-500/30">
                        Default Template
                      </span>
                    )}
                    <button
                      onClick={() => handleDelete(template.id)}
                      disabled={isDeleting === template.id}
                      className="p-1.5 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 
                        disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed transition-colors rounded-lg
                        hover:bg-red-50 dark:hover:bg-red-400/10 bg-red-50 dark:bg-red-500/10 
                        border border-red-200 dark:border-red-500/30"
                      title="Delete template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg 
              border border-gray-200 dark:border-gray-600">
              No templates available. Upload one to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
"use client";

import { useEffect, useCallback } from 'react';
import { useInvoiceStore } from '@/src/stores/invoiceStore';

export default function InvoiceTemplates() {
  const { templates, removeTemplate, syncTemplatesWithStorage } = useInvoiceStore();

  // Sync templates whenever component mounts or window gains focus
  const syncTemplates = useCallback(async () => {
    await syncTemplatesWithStorage();
  }, [syncTemplatesWithStorage]);

  useEffect(() => {
    syncTemplates();

    // Sync when window gains focus
    window.addEventListener('focus', syncTemplates);
    
    // Set up interval to sync every 30 seconds
    const interval = setInterval(syncTemplates, 30000);

    return () => {
      window.removeEventListener('focus', syncTemplates);
      clearInterval(interval);
    };
  }, [syncTemplates]);

  const handleRemoveTemplate = async (templateId: string, templateName: string) => {
    const isConfirmed = window.confirm(`Are you sure you want to delete "${templateName}"? This cannot be undone.`);
    
    if (isConfirmed) {
      try {
        await removeTemplate(templateId);
        await syncTemplates();
      } catch (error) {
        console.error('Failed to delete template:', error);
        alert('Failed to delete template. Please try again.');
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Available Templates
      </div>
      {templates.map((template) => (
        <div key={template.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
          <span className="text-sm">{template.name}</span>
          <button 
            onClick={() => handleRemoveTemplate(template.id, template.name)}
            className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded"
            title="Delete template"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
} 
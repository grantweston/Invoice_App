"use client";

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { storeFile } from '@/src/services/fileStorage';
import { useInvoiceStore } from '@/src/stores/invoiceStore';

export default function InvoiceTemplateUpload() {
  const { addTemplate } = useInvoiceStore();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Content = reader.result?.toString().split(',')[1];
        if (!base64Content) return;

        // Store file in IndexedDB
        const templateId = crypto.randomUUID();
        await storeFile(templateId, file);
        console.log('Generated template ID:', templateId);

        // Analyze template
        const response = await fetch('/api/analyze-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            content: base64Content
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to analyze template: ${response.status}`);
        }

        const analysis = await response.json();
        console.log('Template analysis:', analysis);

        // Add template to store
        addTemplate({
          id: templateId,
          name: file.name,
          placeholders: Object.values(analysis.placeholders || {}).flat().length
        });

        console.log('Template upload completed successfully');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to upload template:', error);
    }
  }, [addTemplate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: false
  });

  return (
    <div 
      {...getRootProps()} 
      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400"
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center">
        <svg 
          className="w-12 h-12 text-gray-400 mb-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
          />
        </svg>
        <p className="text-gray-600">
          {isDragActive
            ? "Drop the template here..."
            : "Click to upload or drag and drop"}
        </p>
        <p className="text-sm text-gray-500 mt-2">Only .docx files are supported</p>
      </div>
    </div>
  );
} 
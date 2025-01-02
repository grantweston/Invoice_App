"use client";

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { v4 as uuidv4 } from 'uuid';
import { useInvoiceStore } from '@/src/stores/invoiceStore';

function generateFileId(filename: string): string {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  // Sanitize the filename (remove special chars, spaces to dashes)
  const sanitized = nameWithoutExt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  // Add a short unique suffix (first 8 chars of UUID)
  const uniqueSuffix = uuidv4().split('-')[0];
  return `${sanitized}-${uniqueSuffix}`;
}

interface InvoiceTemplateUploadProps {
  onUploadComplete?: (templateId: string) => void;
}

export default function InvoiceTemplateUpload({ onUploadComplete }: InvoiceTemplateUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addTemplate = useInvoiceStore((state) => state.addTemplate);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      // Generate a more readable ID using the filename
      const fileId = generateFileId(file.name);

      // Upload to server
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileId', fileId);
      
      const uploadResponse = await fetch('/api/upload-template', {
        method: 'POST',
        body: formData
      });

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || 'Failed to upload template');
      }

      // Convert file to base64 for analysis
      const base64Content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result?.toString().split(',')[1];
          if (base64) resolve(base64);
          else reject(new Error('Failed to get base64 content'));
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Analyze template
      const analysisResponse = await fetch('/api/analyze-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          content: base64Content
        })
      });

      const analysis = await analysisResponse.json();

      if (!analysisResponse.ok) {
        throw new Error(analysis.error || 'Failed to analyze template');
      }

      // Create template object
      const template = {
        id: fileId,
        name: file.name,
        placeholders: analysis.placeholders || {
          client: [],
          project: [],
          billing: [],
          dates: [],
          custom: []
        }
      };
      
      await addTemplate(template);
      
      // Update selected template
      const store = useInvoiceStore.getState();
      store.setSelectedTemplate(template);

      // Notify parent
      onUploadComplete?.(fileId);

    } catch (error: any) {
      console.error('Failed to upload template:', error);
      setError(error.message || 'Failed to upload template');
    } finally {
      setIsUploading(false);
    }
  }, [addTemplate, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: false,
    disabled: isUploading
  });

  return (
    <div>
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-gray-400 bg-gray-100 dark:border-gray-500 dark:bg-[#323232]' 
            : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500 bg-white dark:bg-[#2a2a2a]'}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center">
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mb-4" />
              <p className="text-gray-600 dark:text-gray-300">Processing template...</p>
            </>
          ) : (
            <>
              <svg 
                className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" 
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
              <p className="text-gray-600 dark:text-gray-300">
                {isDragActive ? "Drop the template here..." : "Click to upload or drag and drop"}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Only .docx files are supported</p>
            </>
          )}
        </div>
      </div>
      {error && (
        <div className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
} 
"use client";

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { v4 as uuidv4 } from 'uuid';
import { storeFile } from '@/src/services/fileStorage';
import { useInvoiceStore } from '@/src/stores/invoiceStore';

interface InvoiceTemplateUploadProps {
  onUploadComplete?: (templateId: string) => void;
}

export default function InvoiceTemplateUpload({ onUploadComplete }: InvoiceTemplateUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const addTemplate = useInvoiceStore((state) => state.addTemplate);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    console.log('🟦 Starting template upload process:', file.name);
    setIsUploading(true);
    try {
      // Generate a unique ID for the template
      const fileId = uuidv4();
      console.log('🟦 Generated fileId:', fileId);

      // First, store in client-side IndexedDB
      console.log('🟦 Storing file in IndexedDB...');
      await storeFile(fileId, file);
      console.log('🟦 File stored in IndexedDB successfully');

      // Then, upload to server
      console.log('🟦 Uploading to server...');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileId', fileId);
      
      const uploadResponse = await fetch('/api/upload-template', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload template to server');
      }
      console.log('🟦 Server upload successful');

      // Convert file to base64 for analysis
      console.log('🟦 Converting file to base64...');
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
      console.log('🟦 Base64 conversion complete');

      // Analyze template
      console.log('🟦 Analyzing template...');
      const analysisResponse = await fetch('/api/analyze-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          content: base64Content
        })
      });

      if (!analysisResponse.ok) {
        throw new Error('Failed to analyze template');
      }

      const analysis = await analysisResponse.json();
      console.log('🟦 Template analysis complete:', analysis);

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
      
      console.log('🟦 Adding template to store:', template);
      await addTemplate(template);
      
      // Force an immediate store update
      const store = useInvoiceStore.getState();
      console.log('🟦 Store before setting selected template:', store);
      
      // Update selected template
      store.setSelectedTemplate(template);
      console.log('🟦 Store after setting selected template:', store);

      // Notify parent
      console.log('🟦 Notifying parent with template ID:', fileId);
      onUploadComplete?.(fileId);

      // Force a window reload after a short delay to ensure store is persisted
      console.log('🟦 Scheduling page reload...');
      setTimeout(() => {
        console.log('🟦 Reloading page...');
        window.location.reload();
      }, 100);

    } catch (error) {
      console.error('🔴 Failed to upload template:', error);
      alert(`Failed to upload template: ${error.message}`);
    } finally {
      console.log('🟦 Upload process complete, setting isUploading to false');
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
  );
} 
"use client";

import { useEffect, useState, useRef } from 'react';
import { getFile } from '@/src/services/fileStorage';
import * as docx from 'docx-preview';

interface InvoicePreviewProps {
  templateId?: string;
  isLoading?: boolean;
}

export default function InvoicePreview({ templateId, isLoading = false }: InvoicePreviewProps) {
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Add highlighting to placeholders after render
  const highlightPlaceholders = () => {
    if (!previewRef.current) {
      console.log('🔍 No preview ref found');
      return;
    }
    console.log('🔍 Starting placeholder highlighting');

    // Find all text-containing elements
    const elements = previewRef.current.querySelectorAll('p, span');
    console.log('🔍 Found elements:', elements.length);

    elements.forEach((element) => {
      const text = element.textContent || '';
      if (!text.includes('{')) return;

      // Create a temporary container
      const temp = document.createElement('div');
      temp.innerHTML = text.replace(/(\{[^}]+\})/g, (match) => {
        return `<mark class="placeholder-highlight" style="
          background-color: rgba(22, 163, 74, 0.1);
          border: 1px solid rgba(22, 163, 74, 0.3);
          border-radius: 3px;
          padding: 0 2px;
          margin: 0 1px;
          color: rgb(22, 163, 74);
          font-family: inherit;
          font-size: inherit;
          display: inline-block;
        ">${match}</mark>`;
      });

      // Only replace if we found and highlighted something
      if (temp.innerHTML !== text) {
        element.innerHTML = temp.innerHTML;
      }
    });
  };

  // Calculate scale based on container dimensions
  const updateScale = () => {
    if (containerRef.current && previewRef.current) {
      const container = containerRef.current;
      const preview = previewRef.current;
      
      // Get the natural dimensions of the rendered document
      const docWidth = preview.scrollWidth;
      const docHeight = preview.scrollHeight;
      
      // Calculate scales for both dimensions
      const widthScale = (container.clientWidth - 64) / docWidth;
      const heightScale = (container.clientHeight - 64) / docHeight;
      
      // Use the smaller scale to ensure document fits
      const newScale = Math.min(widthScale, heightScale, 1);
      setScale(newScale);
    }
  };

  useEffect(() => {
    const resizeObserver = new ResizeObserver(updateScale);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!templateId) {
      console.log('📘 No templateId provided');
      return;
    }

    let isMounted = true;
    console.log('📘 Template ID changed, loading template:', templateId);
    
    const loadTemplate = async () => {
      try {
        console.log('📘 Starting template load process');

        const fileData = await getFile(templateId);
        if (!isMounted) return;
        
        console.log('📘 File data received:', !!fileData, 'Length:', fileData?.byteLength);

        if (!fileData) {
          console.error('📘 Template not found in storage');
          throw new Error('Template not found');
        }

        // Create blob for the DOCX file
        const blob = new Blob([fileData], { 
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        });
        console.log('📘 Created blob for DOCX file');

        // Clear previous content
        if (previewRef.current && isMounted) {
          console.log('📘 Clearing previous content');
          previewRef.current.innerHTML = '';
        }

        // Render the document using docx-preview
        if (isMounted) {
          console.log('📘 Starting docx-preview render');
          await docx.renderAsync(blob, previewRef.current!);
          console.log('📘 Render complete');

          // Add a small delay to ensure the content is fully rendered
          setTimeout(() => {
            if (isMounted) {
              highlightPlaceholders();
              updateScale();
            }
          }, 100);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('📘 Error loading template:', err);
        setError(err.message);
      }
    };

    loadTemplate();

    return () => {
      isMounted = false;
      console.log('📘 Cleaning up preview for templateId:', templateId);
      if (previewRef.current) {
        previewRef.current.innerHTML = '';
      }
    };
  }, [templateId]);

  // Add styles for placeholder highlighting
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .placeholder-highlight {
        background-color: rgba(22, 163, 74, 0.1) !important;
        border: 1px solid rgba(22, 163, 74, 0.3) !important;
        border-radius: 3px !important;
        padding: 0 2px !important;
        margin: 0 1px !important;
        color: rgb(22, 163, 74) !important;
        display: inline !important;
        position: relative !important;
        z-index: 1 !important;
      }
      .placeholder-highlight * {
        color: rgb(22, 163, 74) !important;
      }
      @media (prefers-color-scheme: dark) {
        .placeholder-highlight {
          background-color: rgba(34, 197, 94, 0.1) !important;
          border-color: rgba(34, 197, 94, 0.3) !important;
          color: rgb(34, 197, 94) !important;
        }
        .placeholder-highlight * {
          color: rgb(34, 197, 94) !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-center text-red-600">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!templateId) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-center">
          <div className="mb-4">
            <svg 
              className="mx-auto h-12 w-12 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">No template selected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Upload a template or select an existing one to preview it here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="h-full bg-white relative flex flex-col items-center p-8 overflow-auto"
    >
      <div 
        ref={previewRef}
        className="docx-preview"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          marginTop: '1rem'
        }}
      />
    </div>
  );
}
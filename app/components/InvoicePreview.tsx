"use client";

import { useEffect, useState, useRef } from 'react';
import { getFile } from '@/src/services/fileStorage';
import { useInvoiceStore } from '@/src/stores/invoiceStore';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocumentProxy } from 'pdfjs-dist';

interface InvoicePreviewProps {
  templateId?: string;
  isLoading?: boolean;
}

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function InvoicePreview({ templateId, isLoading = false }: InvoicePreviewProps) {
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [highlightPositions, setHighlightPositions] = useState<Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
  }>>([]);
  const selectedTemplate = useInvoiceStore(state => state.templates.find(t => t.id === templateId));

  // Function to scan for placeholders in the PDF viewer
  const scanForPlaceholders = async (pdfUrl: string) => {
    console.log('🔍 Starting PDF scan');
    
    try {
      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;
      console.log('📄 PDF loaded, pages:', pdf.numPages);

      const positions: Array<{x: number; y: number; width: number; height: number; text: string}> = [];
      
      // Process each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Get page viewport for scaling
        const viewport = page.getViewport({ scale: 1.0 });
        const scale = containerRef.current ? containerRef.current.clientWidth / viewport.width : 1;
        
        // Look for placeholders in text items
        textContent.items.forEach((item: any) => {
          const text = item.str;
          const matches = text.match(/\{[^}]+\}/g);
          
          if (matches) {
            console.log(`✨ Found placeholders in text: "${text}"`, matches);
            
            // Convert PDF coordinates to screen coordinates
            const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
            const width = item.width * scale;
            const height = (item.height || 20) * scale;
            
            const position = {
              x: x * scale,
              y: (viewport.height - y) * scale, // Flip Y coordinate
              width,
              height,
              text: matches.join(', ')
            };
            
            console.log('📍 Adding highlight at:', position);
            positions.push(position);
          }
        });
      }

      console.log('✅ Found positions for highlights:', positions);
      setHighlightPositions(positions);
      
    } catch (error) {
      console.error('❌ Error scanning PDF:', error);
    }
  };

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

        // First try to get the preview
        let previewResponse = await fetch(`/api/preview-template/${templateId}`);
        if (!previewResponse.ok) {
          // If preview fails, try to force a re-upload from IndexedDB
          console.log('📘 Preview failed, attempting to re-sync template');
          const fileData = await getFile(templateId);
          if (fileData) {
            const formData = new FormData();
            formData.append('file', new Blob([fileData], { 
              type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
            }), `${templateId}.docx`);
            
            const uploadResponse = await fetch('/api/upload-template', {
              method: 'POST',
              body: formData
            });
            
            if (uploadResponse.ok) {
              // Try preview again after re-upload
              previewResponse = await fetch(`/api/preview-template/${templateId}`);
              if (!previewResponse.ok) {
                throw new Error('Failed to load template preview after re-sync');
              }
            } else {
              throw new Error('Failed to re-sync template');
            }
          } else {
            throw new Error('Template not found in storage');
          }
        }

        // Create blob URL for the PDF
        const pdfBlob = await previewResponse.blob();
        const url = URL.createObjectURL(pdfBlob);
        
        if (isMounted) {
          setPdfUrl(url);
          // Force a scan after setting the URL
          setTimeout(scanForPlaceholders, 1000);
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
      // Clean up blob URL
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [templateId]);

  // Effect to handle iframe load and scanning for placeholders
  useEffect(() => {
    if (!iframeRef.current || !selectedTemplate) {
      console.log('⏳ Waiting for iframe and template...');
      return;
    }
    
    console.log('🎯 Setting up iframe load handler');
    const iframe = iframeRef.current;
    iframe.onload = () => {
      console.log('🌟 Iframe loaded, starting scan');
      scanForPlaceholders(pdfUrl);
    };

    // Also try scanning immediately
    scanForPlaceholders(pdfUrl);

    return () => {
      console.log('🧹 Cleaning up iframe load handler');
      iframe.onload = null;
    };
  }, [selectedTemplate, pdfUrl]);

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

  console.log('🎨 Current highlight positions:', highlightPositions);

  return (
    <div 
      ref={containerRef}
      className="h-full bg-white"
    >
      {pdfUrl && (
        <div className="relative w-full h-full overflow-auto p-8">
          <iframe
            ref={iframeRef}
            src={`${pdfUrl}#view=FitH`}
            className="w-full h-full border-0"
            title="Template Preview"
          />
          <div 
            className="absolute inset-8 pointer-events-none"
            style={{
              position: 'absolute',
              overflow: 'hidden'
            }}
          >
            {highlightPositions.map((pos, index) => (
              <div
                key={index}
                className="pdf-preview-highlight"
                style={{
                  position: 'absolute',
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  width: `${pos.width}px`,
                  height: `${pos.height}px`,
                  backgroundColor: 'rgba(255, 255, 0, 0.3)',
                  border: '2px solid rgba(255, 200, 0, 0.5)',
                  pointerEvents: 'auto',
                  zIndex: 1000
                }}
                title={pos.text}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
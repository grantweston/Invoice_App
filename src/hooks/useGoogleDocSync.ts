"use client";

import { useEffect, useState, useRef } from "react";
import { clientDocsService } from '@/src/services/clientDocsService';

export function useGoogleDocSync(docId: string) {
  const [documentAmount, setDocumentAmount] = useState<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const checkDocumentAmount = async () => {
    try {
      console.log('🔄 Checking document:', docId);
      const doc = await clientDocsService.getDocument(docId);
      const amount = await clientDocsService.extractAmount(doc);
      
      console.log('💵 Extracted amount:', amount);

      if (amount !== documentAmount) {
        console.log('📊 Amount changed:', {
          from: documentAmount,
          to: amount,
          difference: amount - (documentAmount || 0)
        });
        setDocumentAmount(amount);
      } else {
        console.log('🔄 Amount unchanged:', amount);
      }
      
    } catch (error) {
      console.error('❌ Error in document sync:', error);
    }
  };

  useEffect(() => {
    console.log('🚀 Starting document sync for:', docId);
    
    // Initial check
    checkDocumentAmount();

    // Listen for messages from the iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'documentChanged') {
        console.log('📝 Document changed, scheduling check...');
        
        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Wait 2 seconds after the last change before checking
        timeoutRef.current = setTimeout(() => {
          console.log('⏰ Debounce timer elapsed, checking amount...');
          checkDocumentAmount();
        }, 2000);
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [docId]);

  return { documentAmount, checkDocumentAmount };
} 
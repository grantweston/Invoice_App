'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useDocVersionStore } from '@/src/store/docVersionStore';
import { docChatService, ChatMessage } from '@/src/services/docChatService';
import { clientDocsService } from '@/src/services/clientDocsService';
import { useGeneratedInvoices } from '@/src/store/generatedInvoicesStore';
import { useWIPStore } from '@/src/store/wipStore';
import { useGoogleDocSync } from '@/src/hooks/useGoogleDocSync';
import { formatCurrency, formatDate } from "@/src/utils/formatters";
import { useDailyLogs } from '@/src/store/dailyLogs';
import { useArchiveStore } from '@/src/store/archiveStore';

export default function EditInvoicePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { addVersion, undo, redo, canUndo, canRedo } = useDocVersionStore();
  const invoice = useGeneratedInvoices(state => state.invoices.find(inv => inv.id === params.id));
  const wipEntries = useWIPStore(state => state.entries);
  const { documentAmount } = useGoogleDocSync(params.id);

  // Calculate WIP total
  const wipTotal = invoice?.wipEntries.reduce((total, entry) => {
    const timeInHours = (entry.timeInMinutes || 0) / 60;
    return total + (timeInHours * entry.hourlyRate);
  }, 0) || 0;

  // Calculate other amounts
  const onAccount = 0; // For now this is 0
  const netWip = wipTotal - onAccount;
  const toBill = documentAmount || wipTotal;
  const writeOff = netWip - toBill;
  const realization = wipTotal ? (onAccount + toBill) / wipTotal : 0;

  // Format percentage helper
  const formatPercentage = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value);
  };

  // Log amount changes for debugging
  useEffect(() => {
    console.log('Amount values:', {
      documentAmount,
      wipTotal,
      onAccount,
      netWip,
      toBill,
      writeOff,
      realization
    });
  }, [documentAmount, wipTotal, onAccount, netWip, toBill, writeOff, realization]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Save initial version
  useEffect(() => {
    const saveInitialVersion = async () => {
      try {
        const doc = await clientDocsService.getDocument(params.id);
        const content = doc.body.content
          .map((item: any) => item.paragraph?.elements?.[0]?.textRun?.content || '')
          .join('');
        addVersion(content);
      } catch (error) {
        console.error('Error saving initial version:', error);
      }
    };
    saveInitialVersion();
  }, [params.id, addVersion]);

  const handleSendMessage = async () => {
    if (!message.trim() || isProcessing) return;

    setIsProcessing(true);
    // Add user message to chat
    setChatHistory(prev => [...prev, { role: 'user', content: message }]);
    setMessage('');

    try {
      const { response, documentUpdated } = await docChatService.processMessage(
        params.id,
        message,
        chatHistory
      );

      // If document was updated, save new version and check amount
      if (documentUpdated) {
        const doc = await clientDocsService.getDocument(params.id);
        const content = doc.body.content
          .map((item: any) => item.paragraph?.elements?.[0]?.textRun?.content || '')
          .join('');
        addVersion(content);
        
        // Check for new amount after chat update
        console.log('💬 Chat updated document, checking amount...');
        window.postMessage({ type: 'documentChanged' }, '*');
      }

      setChatHistory(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Error processing message:', error);
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error while processing your request.' 
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUndo = async () => {
    const previousVersion = undo();
    if (previousVersion) {
      try {
        await clientDocsService.updateDocument(params.id, [{
          replaceAllText: {
            containsText: { text: '*' },
            replaceText: previousVersion.content
          }
        }]);
      } catch (error) {
        console.error('Error during undo:', error);
      }
    }
  };

  const handleRedo = async () => {
    const nextVersion = redo();
    if (nextVersion) {
      try {
        await clientDocsService.updateDocument(params.id, [{
          replaceAllText: {
            containsText: { text: '*' },
            replaceText: nextVersion.content
          }
        }]);
      } catch (error) {
        console.error('Error during redo:', error);
      }
    }
  };

  // Track iframe focus state
  const [iframeHasFocus, setIframeHasFocus] = useState(false);

  // Function to check for changes when iframe loses focus
  const checkForChanges = () => {
    if (iframeHasFocus) {
      console.log('📝 Document interaction ended, checking for changes...');
      window.postMessage({ type: 'documentChanged' }, '*');
    }
  };

  const handleSendToClient = async () => {
    try {
      // Prepare email parameters
      const subject = encodeURIComponent(`Invoice - ${invoice.client}`);
      const body = encodeURIComponent(`Please find the invoice attached.\n\nAmount: ${formatCurrency(invoice.amount)}\nDate: ${formatDate(invoice.date)}`);
      const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
      
      // Open email client
      window.location.href = mailtoUrl;

      // Download PDF for attachment
      const response = await fetch(`https://docs.google.com/document/d/${invoice.googleDocId}/export?format=pdf`);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice - ${invoice.client}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error sending invoice:', error);
      alert('Failed to prepare email. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[rgb(17,17,17)]">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-[rgb(24,24,24)] border-b border-gray-200 dark:border-gray-700 p-2 flex-shrink-0 shadow-sm">
        <div className="flex items-center">
          <button
            onClick={() => router.push('/invoices')}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-xs"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Invoices
          </button>
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-3" />
          <a
            href={`https://docs.google.com/document/d/${params.id}/edit`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-xs flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open in Google Docs
          </a>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 grid grid-cols-[30%_70%] bg-white dark:bg-[rgb(17,17,17)]">
        {/* Chat Interface */}
        <div className="relative">
          <div className="sticky top-3 flex flex-col bg-white dark:bg-[rgb(17,17,17)] border-r border-gray-200 dark:border-gray-700 shadow-xl m-3 rounded-xl overflow-hidden h-[calc(100vh-1.5rem)]">
            {/* Header */}
            <div className="p-3 border-b border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  Edit with AI
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleUndo}
                    disabled={!canUndo()}
                    className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-transparent"
                    title="Undo"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={!canRedo()}
                    className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-transparent"
                    title="Redo"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Chat History */}
            <div ref={chatContainerRef} className="h-[45vh] p-3 overflow-y-auto bg-white dark:bg-gray-900 space-y-3">
              {chatHistory.length === 0 && (
                <div className="space-y-4">
                  <div className="text-center text-gray-500 mt-4">
                    <svg className="w-6 h-6 mx-auto mb-2 opacity-30 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-xs">Start a conversation with AI to edit your invoice</p>
                  </div>
                  
                  <div className="opacity-80">
                    <div className="mb-3 text-left">
                      <div className="inline-block p-2 rounded-lg max-w-[80%] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm text-xs">
                        How would you like to edit the document?
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {chatHistory.map((msg, index) => (
                <div
                  key={index}
                  className={`mb-3 ${
                    msg.role === 'user' ? 'text-right' : 'text-left'
                  }`}
                >
                  <div
                    className={`inline-block p-2 rounded-lg max-w-[80%] shadow-sm text-xs ${
                      msg.role === 'user'
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white border border-gray-300 dark:border-gray-600'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="flex-shrink-0 bg-gray-100 dark:bg-gray-800 p-3 border-t border-gray-300 dark:border-gray-700">
              <div className="flex gap-2 px-3">
                <textarea
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    // Auto-resize
                    e.target.style.height = 'inherit';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask me to edit the invoice..."
                  className="flex-1 p-2 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500/50 transition-all duration-200 text-xs min-h-[38px] max-h-[150px] resize-none overflow-y-auto"
                  disabled={isProcessing}
                  rows={1}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-xs transition-all duration-200 flex items-center gap-1.5 font-medium border border-gray-300 dark:border-gray-600 disabled:opacity-50 w-[100px] h-[38px] flex-shrink-0 justify-center overflow-hidden"
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-1">
                      <span>Processing</span>
                      <span className="flex">
                        <span className="animate-[bounce_1s_infinite_100ms]">.</span>
                        <span className="animate-[bounce_1s_infinite_200ms]">.</span>
                        <span className="animate-[bounce_1s_infinite_300ms]">.</span>
                      </span>
                    </div>
                  ) : (
                    <>
                      <span>Send</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Billing Summary Table */}
            <div className="h-[50vh] p-2 border-t border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="h-full overflow-x-auto rounded-xl bg-gray-50 dark:bg-gray-800 shadow-xl">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr className="divide-x divide-gray-200 dark:divide-gray-700">
                      <th scope="col" className="px-1.5 py-2 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">WIP</th>
                      <th scope="col" className="px-1.5 py-2 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">On Acct</th>
                      <th scope="col" className="px-1.5 py-2 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">Net WIP</th>
                      <th scope="col" className="px-1.5 py-2 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">To Bill</th>
                      <th scope="col" className="px-1.5 py-2 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">Write Off</th>
                      <th scope="col" className="px-1.5 py-2 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">Realization</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    <tr className="hover:bg-gray-100 dark:hover:bg-[#374151] transition-colors duration-150 divide-x divide-gray-200 dark:divide-gray-700">
                      <td className="px-1.5 py-2 whitespace-nowrap text-[11px] font-medium text-gray-900 dark:text-white">{formatCurrency(wipTotal)}</td>
                      <td className="px-1.5 py-2 whitespace-nowrap text-[11px] font-medium text-gray-900 dark:text-white">{formatCurrency(onAccount)}</td>
                      <td className="px-1.5 py-2 whitespace-nowrap text-[11px] font-medium text-gray-900 dark:text-white">{formatCurrency(netWip)}</td>
                      <td className="px-1.5 py-2 whitespace-nowrap text-[11px] font-medium text-gray-900 dark:text-white">{formatCurrency(toBill)}</td>
                      <td className="px-1.5 py-2 whitespace-nowrap text-[11px] font-medium text-gray-900 dark:text-white">{formatCurrency(writeOff)}</td>
                      <td className="px-1.5 py-2 whitespace-nowrap text-[11px] font-medium text-gray-900 dark:text-white">{formatPercentage(realization)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Action Buttons */}
                <div className="p-2 border-t border-gray-200 dark:border-[#374151] flex justify-center space-x-2">
                  <button
                    onClick={async () => {
                      // Get the invoice data
                      const invoice = useGeneratedInvoices.getState().invoices.find(i => i.id === params.id);
                      if (!invoice) return;

                      // Ask for confirmation first
                      if (!confirm('Are you sure you want to archive this invoice? Associated entries will be removed from your WIP report.')) {
                        return;
                      }

                      // Get the Google Docs container
                      const docsContainer = document.querySelector('.h-full.overflow-hidden') as HTMLElement;
                      if (!docsContainer) return;

                      // Create stamp overlay
                      const stamp = document.createElement('div');
                      stamp.className = 'fixed bg-red-600/20 flex items-center justify-center z-50 pointer-events-none';
                      stamp.innerHTML = `
                        <div class="text-red-600 border-8 border-red-600 rounded-lg px-8 py-4 text-4xl font-bold rotate-[-20deg] 
                          opacity-0 scale-150 transition-all duration-300 transform origin-center">
                          ARCHIVED
                        </div>
                      `;

                      // Position stamp over the docs container
                      const containerRect = docsContainer.getBoundingClientRect();
                      Object.assign(stamp.style, {
                        top: `${containerRect.top}px`,
                        left: `${containerRect.left}px`,
                        width: `${containerRect.width}px`,
                        height: `${containerRect.height}px`,
                      });

                      // Add stamp to body
                      document.body.appendChild(stamp);

                      // Trigger stamp animation
                      requestAnimationFrame(() => {
                        const stampText = stamp.querySelector('div');
                        if (stampText instanceof HTMLElement) {
                          stampText.classList.remove('opacity-0', 'scale-150');
                          stampText.classList.add('opacity-100', 'scale-100');
                        }
                      });

                      // Add fade out to docs container
                      docsContainer.style.transition = 'all 0.5s ease-in-out';
                      docsContainer.style.opacity = '0.3';

                      // Remove animations after delay
                      setTimeout(() => {
                        stamp.remove();
                        docsContainer.style.opacity = '';
                        docsContainer.style.transition = '';

                        // Get all daily logs
                        const currentDailyLogs = useDailyLogs.getState().logs;
                        
                        // Get all daily log IDs associated with this invoice's WIP entries
                        const dailyLogIds = new Set(invoice.wipEntries.flatMap(entry => 
                          (entry.associatedDailyIds || []).map(id => Number(id))
                        ));
                        
                        // Get the daily logs to archive and the ones to keep
                        const logsToArchive = currentDailyLogs.filter(log => dailyLogIds.has(Number(log.id)));
                        const remainingLogs = currentDailyLogs.filter(log => !dailyLogIds.has(Number(log.id)));
                        
                        // Archive the invoice with both WIP and daily entries
                        useArchiveStore.getState().archiveInvoice({
                          ...invoice,
                          archivedAt: new Date().toISOString(),
                          dailyActivities: logsToArchive
                        });
                        
                        // Remove from generated invoices
                        useGeneratedInvoices.getState().deleteInvoice(invoice.id);

                        // Remove associated WIP entries
                        const wipIds = invoice.wipEntries.map(entry => entry.id);
                        useWIPStore.getState().removeEntries(wipIds);

                        // Update daily logs to remove archived ones
                        useDailyLogs.getState().setLogs(remainingLogs);

                        // Redirect to invoices page
                        window.location.href = '/invoices';
                      }, 800);
                    }}
                    className="px-3 py-1.5 bg-orange-500/30 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-500/40 text-[11px] transition-all duration-200 flex items-center gap-1 font-medium border border-orange-500/40"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Submit Internally
                  </button>
                  <button
                    onClick={handleSendToClient}
                    className="px-3 py-1.5 bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-500/40 text-[11px] transition-all duration-200 flex items-center gap-1 font-medium border border-emerald-500/40"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Submit to Client
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Google Doc */}
        <div className="h-full overflow-hidden bg-[#f8f9fa] dark:bg-[rgb(24,24,24)]">
          <div className="w-[150%] h-[150%] transform scale-[0.67] origin-top-left -translate-x-[10%]">
            <iframe
              src={`https://docs.google.com/document/d/${params.id}/edit?rm=minimal&embedded=true&chrome=false&rm=demo`}
              className="w-full h-full border-0"
              style={{ minHeight: 'calc(100vh * 1.4)' }}
              onMouseEnter={() => setIframeHasFocus(true)}
              onMouseLeave={() => {
                setIframeHasFocus(false);
                checkForChanges();
              }}
              onClick={() => setIframeHasFocus(true)}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 
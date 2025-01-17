'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useDocVersionStore } from '@/src/store/docVersionStore';
import { docChatService, ChatMessage } from '@/src/services/docChatService';
import { clientDocsService } from '@/src/services/clientDocsService';

export default function EditInvoicePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { addVersion, undo, redo, canUndo, canRedo } = useDocVersionStore();

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

      // If document was updated, save new version
      if (documentUpdated) {
        const doc = await clientDocsService.getDocument(params.id);
        const content = doc.body.content
          .map((item: any) => item.paragraph?.elements?.[0]?.textRun?.content || '')
          .join('');
        addVersion(content);
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

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-[#111827] border-b border-gray-200 dark:border-[#1f2937] p-2 flex-shrink-0 shadow-sm">
        <div className="flex items-center">
          <button
            onClick={() => router.push('/invoices')}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#1f2937] text-xs"
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
            className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 rounded-md hover:bg-gray-100 dark:hover:bg-[#1f2937] text-xs flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open in Google Docs
          </a>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 grid grid-cols-[70%_30%] bg-white dark:bg-[#111827]">
        {/* Google Doc */}
        <div className="h-full overflow-auto bg-[#f8f9fa] dark:bg-[#1f2937] flex justify-center p-3">
          <div className="w-[140%] transform scale-[0.7] origin-top rounded-xl overflow-hidden shadow-lg">
            <iframe
              src={`https://docs.google.com/document/d/${params.id}/edit?rm=minimal&embedded=true&chrome=false`}
              className="w-full h-full border-0"
              style={{ minHeight: 'calc(100vh * 1.4)' }}
            />
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex flex-col bg-white dark:bg-[#111827] border-l border-gray-200 dark:border-[#1f2937] shadow-xl h-screen m-3 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-gray-300 dark:border-[#1f2937] bg-gray-100 dark:bg-[#1f2937]">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Edit with AI
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUndo}
                  disabled={!canUndo()}
                  className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 rounded-md hover:bg-gray-200 dark:hover:bg-[#374151] disabled:opacity-40 disabled:hover:bg-transparent"
                  title="Undo"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </button>
                <button
                  onClick={handleRedo}
                  disabled={!canRedo()}
                  className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 rounded-md hover:bg-gray-200 dark:hover:bg-[#374151] disabled:opacity-40 disabled:hover:bg-transparent"
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
          <div ref={chatContainerRef} className="h-[45vh] p-3 overflow-y-auto bg-white dark:bg-[#111827] space-y-3">
            {chatHistory.length === 0 && (
              <div className="space-y-4">
                <div className="text-center text-gray-500 mt-4">
                  <svg className="w-6 h-6 mx-auto mb-2 opacity-30 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-xs">Start a conversation with AI to edit your invoice</p>
                </div>
                
                <div className="opacity-80">
                  <div className="mb-3 text-left">
                    <div className="inline-block p-2 rounded-lg max-w-[80%] bg-gray-200 dark:bg-[#1f2937] text-gray-700 dark:text-gray-200 shadow-sm text-xs">
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
                      ? 'bg-blue-100 dark:bg-blue-600/20 text-blue-700 dark:text-white border border-blue-200 dark:border-blue-500/20'
                      : 'bg-gray-100 dark:bg-[#1f2937] text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="flex-shrink-0 bg-gray-100 dark:bg-[#1f2937] p-3 border-t border-gray-300 dark:border-[#1f2937]">
            <div className="flex gap-2 px-3">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me to help edit the invoice..."
                className="flex-1 p-2 rounded-lg bg-white dark:bg-[#111827] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border border-gray-300 dark:border-[#374151] focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 text-xs"
                disabled={isProcessing}
              />
              <button
                onClick={handleSendMessage}
                disabled={isProcessing}
                className="px-4 py-2 bg-blue-500/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-500/40 text-xs transition-all duration-200 flex items-center gap-1.5 font-medium border border-blue-500/40 disabled:opacity-50 w-[88px]"
              >
                {isProcessing ? (
                  <>
                    <span className="animate-spin">⚪</span>
                    <span>Processing...</span>
                  </>
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
          <div className="h-[50vh] p-3 border-t border-gray-300 dark:border-[#1f2937] bg-white dark:bg-[#111827]">
            <div className="h-full overflow-x-auto rounded-xl bg-gray-50 dark:bg-[#1f2937] shadow-xl">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-[#374151]">
                <thead>
                  <tr>
                    <th scope="col" className="px-2 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-[#1f2937]">WIP</th>
                    <th scope="col" className="px-2 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-[#1f2937]">On Acct</th>
                    <th scope="col" className="px-2 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-[#1f2937]">Net WIP</th>
                    <th scope="col" className="px-2 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-[#1f2937]">To Bill</th>
                    <th scope="col" className="px-2 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-[#1f2937]">Write Off</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-[#374151]">
                  <tr className="hover:bg-gray-100 dark:hover:bg-[#374151] transition-colors duration-150">
                    <td className="px-2 py-3 whitespace-nowrap text-xs font-medium text-gray-900 dark:text-white">$0.00</td>
                    <td className="px-2 py-3 whitespace-nowrap text-xs font-medium text-gray-900 dark:text-white">$0.00</td>
                    <td className="px-2 py-3 whitespace-nowrap text-xs font-medium text-gray-900 dark:text-white">$0.00</td>
                    <td className="px-2 py-3 whitespace-nowrap text-xs font-medium text-gray-900 dark:text-white">$0.00</td>
                    <td className="px-2 py-3 whitespace-nowrap text-xs font-medium text-gray-900 dark:text-white">$0.00</td>
                  </tr>
                </tbody>
              </table>

              {/* Action Buttons */}
              <div className="p-3 border-t border-gray-200 dark:border-[#374151] flex justify-center space-x-3">
                <button
                  onClick={() => {/* TODO: Implement internal submit */}}
                  className="px-4 py-2 bg-orange-500/30 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-500/40 text-xs transition-all duration-200 flex items-center gap-1.5 font-medium border border-orange-500/40"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Submit Invoice Internally
                </button>
                <button
                  onClick={() => {/* TODO: Implement send to client */}}
                  className="px-4 py-2 bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-500/40 text-xs transition-all duration-200 flex items-center gap-1.5 font-medium border border-emerald-500/40"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send Invoice to Client
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
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
      <div className="bg-[#111827] dark:bg-[#111827] border-b border-[#1f2937] dark:border-[#1f2937] p-2 flex-shrink-0 shadow-sm">
        <div className="flex justify-between items-center">
          <button
            onClick={() => router.push('/invoices')}
            className="flex items-center text-gray-400 hover:text-white transition-colors duration-200 px-2 py-1 rounded-md hover:bg-[#1f2937]"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Invoices
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleUndo}
              disabled={!canUndo()}
              className="p-2 text-gray-400 hover:text-white transition-colors duration-200 rounded-md hover:bg-[#1f2937] disabled:opacity-40 disabled:hover:bg-transparent"
              title="Undo"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo()}
              className="p-2 text-gray-400 hover:text-white transition-colors duration-200 rounded-md hover:bg-[#1f2937] disabled:opacity-40 disabled:hover:bg-transparent"
              title="Redo"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 grid grid-cols-[60%_40%] bg-[#111827]">
        {/* Google Doc */}
        <div className="h-full overflow-auto">
          <iframe
            src={`https://docs.google.com/document/d/${params.id}/edit?embedded=true`}
            className="w-full h-full border-0 min-h-[calc(100vh-56px)]"
          />
        </div>

        {/* Chat Interface */}
        <div className="flex flex-col bg-[#111827] border-l border-[#1f2937] shadow-xl h-screen">
          {/* Header */}
          <div className="p-4 border-b border-[#1f2937] bg-[#111827]">
            <h2 className="text-xl font-bold text-white text-center flex items-center justify-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Edit with AI
            </h2>
          </div>

          {/* Chat History */}
          <div ref={chatContainerRef} className="h-[25vh] p-4 overflow-y-auto bg-[#111827] space-y-4">
            {chatHistory.length === 0 && (
              <div className="space-y-6">
                <div className="text-center text-gray-500 mt-4">
                  <svg className="w-8 h-8 mx-auto mb-2 opacity-30 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-sm">Start a conversation with AI to edit your invoice</p>
                </div>
                
                <div className="opacity-80">
                  <div className="mb-4 text-left">
                    <div className="inline-block p-3 rounded-lg max-w-[80%] bg-[#1f2937] text-gray-200 shadow-sm">
                      How would you like to edit the document?
                    </div>
                  </div>
                </div>
              </div>
            )}
            {chatHistory.map((msg, index) => (
              <div
                key={index}
                className={`mb-4 ${
                  msg.role === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                <div
                  className={`inline-block p-3 rounded-lg max-w-[80%] shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-600/20 text-white border border-blue-500/20'
                      : 'bg-[#1f2937] text-gray-200'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="flex-shrink-0 bg-[#111827] p-4 border-t border-[#1f2937]">
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me to help edit the invoice..."
                className="flex-1 p-3 rounded-lg bg-[#1f2937] text-white placeholder-gray-400 border border-[#374151] focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                disabled={isProcessing}
              />
              <button
                onClick={handleSendMessage}
                disabled={isProcessing}
                className="px-6 py-3 bg-blue-600/20 text-white rounded-lg hover:bg-blue-600/30 whitespace-nowrap font-medium transition-all duration-200 flex items-center gap-2 disabled:opacity-50 border border-blue-500/20"
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
          <div className="h-[50vh] p-4 border-t border-[#1f2937] bg-[#111827]">
            <div className="h-full overflow-x-auto rounded-xl bg-[#1f2937] shadow-xl">
              <table className="min-w-full divide-y divide-[#374151]">
                <thead>
                  <tr>
                    <th scope="col" className="px-3 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider bg-[#1f2937]">WIP</th>
                    <th scope="col" className="px-3 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider bg-[#1f2937]">On Acct</th>
                    <th scope="col" className="px-3 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider bg-[#1f2937]">Net WIP</th>
                    <th scope="col" className="px-3 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider bg-[#1f2937]">To Bill</th>
                    <th scope="col" className="px-3 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider bg-[#1f2937]">Write Off</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#374151]">
                  <tr className="hover:bg-[#374151] transition-colors duration-150">
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-white">$0.00</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-white">$0.00</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-white">$0.00</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-white">$0.00</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-white">$0.00</td>
                  </tr>
                </tbody>
              </table>

              {/* Action Buttons */}
              <div className="p-4 border-t border-[#374151] flex justify-center space-x-4">
                <button
                  onClick={() => {/* TODO: Implement internal submit */}}
                  className="px-4 py-2 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-lg hover:from-orange-500 hover:to-orange-600 text-xs transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-orange-500/20"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Submit Invoice Internally
                </button>
                <button
                  onClick={() => {/* TODO: Implement send to client */}}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 text-xs transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-emerald-500/20"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
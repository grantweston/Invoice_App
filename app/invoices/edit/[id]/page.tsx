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
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 flex-shrink-0">
        <div className="flex justify-between items-center">
          <button
            onClick={() => router.push('/invoices')}
            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Invoices
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={!canUndo()}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
              title="Undo"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo()}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
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
      <div className="flex-1 grid grid-cols-[60%_40%]">
        {/* Google Doc */}
        <div className="h-full overflow-auto">
          <iframe
            src={`https://docs.google.com/document/d/${params.id}/edit?embedded=true`}
            className="w-full h-full border-0 min-h-[calc(100vh-56px)]"
          />
        </div>

        {/* Chat Interface */}
        <div className="h-[50vh] flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg">
          {/* Chat History */}
          <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto">
            {chatHistory.map((msg, index) => (
              <div
                key={index}
                className={`mb-4 ${
                  msg.role === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                <div
                  className={`inline-block p-3 rounded-lg max-w-[80%] ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="flex-shrink-0 bg-white dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me to help edit the invoice..."
                className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isProcessing}
              />
              <button
                onClick={handleSendMessage}
                disabled={isProcessing}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap font-medium transition-colors duration-150 flex items-center gap-2 disabled:opacity-50"
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
        </div>
      </div>
    </div>
  );
} 
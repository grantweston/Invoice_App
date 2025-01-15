'use client';

import { useRouter } from 'next/navigation';
import { useGeneratedInvoices, GeneratedInvoice } from '@/src/store/generatedInvoicesStore';

export default function InvoicesPage() {
  const router = useRouter();
  const { invoices, deleteInvoice } = useGeneratedInvoices();

  // Format currency helper
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format date helper
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleDelete = async (invoice: GeneratedInvoice) => {
    if (confirm('Are you sure you want to delete this invoice? This cannot be undone.')) {
      try {
        // Delete from Google Drive
        const response = await fetch(`/api/invoices/${invoice.id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error('Failed to delete from Google Drive');
        }
        
        // Delete from local storage
        deleteInvoice(invoice.id);
        
        // Force refresh the page to ensure store is updated
        router.refresh();
      } catch (error) {
        console.error('Error deleting invoice:', error);
        alert('Failed to delete invoice. Please try again.');
      }
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Invoices</h1>
          <p className="text-xs text-gray-600 dark:text-gray-400">Generate and manage client invoices</p>
        </div>
        <button
          onClick={() => router.push('/invoices/generate')}
          className="bg-blue-100 dark:bg-blue-500/40
            hover:bg-blue-200 dark:hover:bg-blue-500/50 
            text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-500/40 
            hover:border-blue-400 dark:hover:border-blue-500/50
            px-4 py-1.5 rounded text-xs h-[38px] flex items-center gap-1 transition-all duration-150 hover:scale-105 shadow-lg"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Generate New Invoice
        </button>
      </div>

      <div className="space-y-4">
        {invoices.map((invoice) => (
          <div 
            key={invoice.id} 
            className="bg-white dark:bg-[#1f2937] rounded-xl border border-gray-200 dark:border-[#374151] 
              shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden group"
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                    {invoice.client}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(invoice.date)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatCurrency(invoice.amount)}
                    </span>
                  </p>
                </div>
                <div className="flex gap-3">
                  <a
                    href={invoice.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-gray-100 dark:bg-[#374151] hover:bg-gray-200 dark:hover:bg-[#4b5563] 
                      text-gray-800 dark:text-gray-100 rounded-lg flex items-center gap-2 transition-all duration-200 
                      text-sm font-medium border border-gray-300 dark:border-[#4b5563] 
                      hover:border-gray-400 dark:hover:border-[#6b7280]"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open in Google Docs
                  </a>
                  <button
                    onClick={() => router.push(`/invoices/edit/${invoice.id}`)}
                    className="px-4 py-2 bg-emerald-100 dark:bg-emerald-500/30
                      hover:bg-emerald-200 dark:hover:bg-emerald-500/40 
                      text-emerald-700 dark:text-emerald-300 rounded-lg flex items-center gap-2 transition-all duration-200 
                      text-sm font-medium border border-emerald-300 dark:border-emerald-500/30 
                      hover:border-emerald-400 dark:hover:border-emerald-500/40"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit with AI
                  </button>
                  <button
                    onClick={() => handleDelete(invoice)}
                    className="px-4 py-2 bg-red-100 dark:bg-red-500/30
                      hover:bg-red-200 dark:hover:bg-red-500/40 
                      text-red-700 dark:text-red-300 rounded-lg flex items-center gap-2 transition-all duration-200 
                      text-sm font-medium border border-red-300 dark:border-red-500/30 
                      hover:border-red-400 dark:hover:border-red-500/40"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {invoices.length === 0 && (
          <div className="text-center py-16 rounded-xl border border-gray-200 dark:border-[#374151] 
            bg-white dark:bg-[#1f2937]">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600 dark:text-gray-400 mb-2 text-xs">No invoices generated yet</p>
            <p className="text-xs text-gray-500">Click "Generate New Invoice" to create one</p>
          </div>
        )}
      </div>
    </div>
  );
} 
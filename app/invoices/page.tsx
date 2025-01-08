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
        await fetch(`/api/invoices/${invoice.id}`, {
          method: 'DELETE'
        });
        
        // Delete from local storage
        deleteInvoice(invoice.id);
      } catch (error) {
        console.error('Error deleting invoice:', error);
        alert('Failed to delete invoice. Please try again.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-sm text-gray-600">Generate and manage client invoices</p>
        </div>
        <button
          onClick={() => router.push('/invoices/generate')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Generate New Invoice
        </button>
      </div>

      <div className="space-y-4">
        {invoices.map((invoice) => (
          <div key={invoice.id} className="bg-white dark:bg-dark-card p-6 rounded-lg border border-gray-200 dark:border-dark-border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{invoice.client}</h2>
                <p className="text-sm text-gray-500">
                  Generated on {formatDate(invoice.date)} • 
                  {formatCurrency(invoice.amount)}
                </p>
              </div>
              <div className="flex gap-4">
                <a
                  href={invoice.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open in Google Docs
                </a>
                <button
                  onClick={() => router.push(`/invoices/edit/${invoice.id}`)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit with AI
                </button>
                <button
                  onClick={() => handleDelete(invoice)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}

        {invoices.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No invoices generated yet. Click "Generate New Invoice" to create one.
          </div>
        )}
      </div>
    </div>
  );
} 
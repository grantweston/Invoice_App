'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/src/utils/formatting';

interface Invoice {
  id: string;
  invoiceNumber: string;
  client: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid';
  date: string;
}

export default function InvoiceListPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([
    // Sample data - replace with actual API call
    {
      id: '1',
      invoiceNumber: 'INV-001',
      client: 'Jack & Michelle Goldberg',
      amount: 30.00,
      status: 'draft',
      date: '2024-01-28'
    }
  ]);

  useEffect(() => {
    // TODO: Replace with actual API call
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Invoices
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Manage and track your invoices
            </p>
          </div>
          <Link 
            href="/generate" 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Generate New Invoice
          </Link>
        </div>
      </div>

      {/* Invoice List */}
      <div className="space-y-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <div className="grid grid-cols-1 gap-4">
              {invoices.map((invoice) => (
                <Link 
                  key={invoice.id}
                  href={`/invoice/${invoice.id}`}
                  className="block hover:bg-gray-50 dark:hover:bg-gray-700 -mx-6 px-6 py-4 first:-mt-4 last:-mb-4 border-b last:border-b-0 border-gray-200 dark:border-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">
                            {invoice.invoiceNumber}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {invoice.client}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(invoice.amount)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(invoice.date).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${invoice.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400' :
                            invoice.status === 'sent' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400'}`}
                        >
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </div>
                      <div className="text-gray-400 dark:text-gray-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
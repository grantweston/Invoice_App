'use client';

import { useRouter } from 'next/navigation';
import { useGeneratedInvoices, GeneratedInvoice } from '@/src/store/generatedInvoicesStore';
import { useArchiveStore } from '@/src/store/archiveStore';
import { useWIPStore } from '@/src/store/wipStore';
import { Archive } from 'lucide-react';
import { useDailyLogs } from "@/src/store/dailyLogs";

export default function InvoicesPage() {
  const router = useRouter();
  const { invoices, deleteInvoice } = useGeneratedInvoices();
  const archiveInvoice = useArchiveStore((state) => state.archiveInvoice);
  const removeWIPEntries = useWIPStore((state) => state.removeEntries);
  const setDailyLogs = useDailyLogs((state) => state.setLogs);

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

  const handleArchive = async (invoice: GeneratedInvoice, event: React.MouseEvent) => {
    // Get the invoice card
    const card = (event.currentTarget as HTMLElement).closest('.invoice-card') as HTMLElement;
    if (!card) return;

    // Ask for confirmation first
    if (!confirm('Are you sure you want to archive this invoice? Associated entries will be removed from your WIP report.')) {
      return;
    }

    // Create stamp overlay
    const stamp = document.createElement('div');
    stamp.className = 'fixed bg-red-600/20 flex items-center justify-center z-50 pointer-events-none';
    stamp.innerHTML = `
      <div class="text-red-600 border-8 border-red-600 rounded-lg px-8 py-4 text-4xl font-bold rotate-[-20deg] 
        opacity-0 scale-150 transition-all duration-300 transform origin-center">
        ARCHIVED
      </div>
    `;

    // Position stamp over the card
    const cardRect = card.getBoundingClientRect();
    Object.assign(stamp.style, {
      top: `${cardRect.top}px`,
      left: `${cardRect.left}px`,
      width: `${cardRect.width}px`,
      height: `${cardRect.height}px`,
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

    // Add tilt and fade out to card
    card.style.transition = 'all 0.5s ease-in-out';
    card.style.transform = 'rotate(-2deg) scale(0.95)';
    card.style.opacity = '0';

    // Remove animations after delay
    setTimeout(() => {
      stamp.remove();
      card.style.transform = '';
      card.style.opacity = '';
      card.style.transition = '';

      // Get all daily logs
      const currentDailyLogs = useDailyLogs.getState().logs;
      
      // Get all daily log IDs associated with this invoice's WIP entries
      const dailyLogIds = new Set(invoice.wipEntries.flatMap(entry => 
        (entry.associatedDailyIds || []).map(id => Number(id))
      ));
      
      // Get the daily logs to archive and the ones to keep
      const logsToArchive = currentDailyLogs.filter(log => dailyLogIds.has(Number(log.id)));
      const remainingLogs = currentDailyLogs.filter(log => !dailyLogIds.has(Number(log.id)));
      
      console.log('Daily log IDs to archive:', Array.from(dailyLogIds));
      console.log('Current daily log IDs:', currentDailyLogs.map(log => log.id));
      console.log('Archiving daily logs:', logsToArchive.length);
      console.log('Remaining daily logs:', remainingLogs.length);
      
      // Archive the invoice with both WIP and daily entries
      archiveInvoice({
        ...invoice,
        archivedAt: new Date().toISOString(),
        dailyActivities: logsToArchive
      });
      
      // Remove from generated invoices
      deleteInvoice(invoice.id);

      // Remove associated WIP entries
      const wipIds = invoice.wipEntries.map(entry => entry.id);
      removeWIPEntries(wipIds);

      // Update daily logs to remove archived ones
      setDailyLogs(remainingLogs);
    }, 800);
  };

  const handleEmailInvoice = async (invoice: GeneratedInvoice) => {
    console.log('handleEmailInvoice called with invoice:', invoice);
    try {
      // Prepare email parameters
      const subject = encodeURIComponent(`Invoice - ${invoice.client}`);
      const body = encodeURIComponent(`Please find the invoice attached.\n\nAmount: ${formatCurrency(invoice.amount)}\nDate: ${formatDate(invoice.date)}`);
      const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
      
      console.log('Opening mailto URL:', mailtoUrl);
      window.location.href = mailtoUrl;

      // After email client is opened, trigger the PDF download
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
      console.error('Error in handleEmailInvoice:', error);
      alert('Failed to prepare email. Please try again.');
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Invoices</h1>
          <p className="text-xs text-gray-600 dark:text-gray-400">Generate and manage client invoices</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/templates')}
            className="bg-gray-100 dark:bg-gray-500/40
              hover:bg-gray-200 dark:hover:bg-gray-500/50 
              text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-500/40 
              hover:border-gray-400 dark:hover:border-gray-500/50
              px-4 py-1.5 rounded-lg text-xs h-[38px] flex items-center gap-1 transition-all duration-150 hover:scale-105 shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            Templates
          </button>
          <button
            onClick={() => router.push('/invoices/generate')}
            className="bg-blue-100 dark:bg-blue-500/40
              hover:bg-blue-200 dark:hover:bg-blue-500/50 
              text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-500/40 
              hover:border-blue-400 dark:hover:border-blue-500/50
              px-4 py-1.5 rounded-lg text-xs h-[38px] flex items-center gap-1 transition-all duration-150 hover:scale-105 shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Generate New Invoice
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {invoices.map((invoice) => (
          <div 
            key={invoice.id} 
            className="invoice-card bg-white dark:bg-[#1f2937] rounded-xl border border-gray-200 dark:border-[#374151] 
              shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden relative"
          >
            <div className="p-6 pr-16">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200">
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
                    href={`https://docs.google.com/document/d/${invoice.googleDocId}/edit`}
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
                    onClick={() => handleEmailInvoice(invoice)}
                    className="px-4 py-2 bg-blue-100 dark:bg-blue-500/30
                      hover:bg-blue-200 dark:hover:bg-blue-500/40 
                      text-blue-700 dark:text-blue-300 rounded-lg flex items-center gap-2 transition-all duration-200 
                      text-sm font-medium border border-blue-300 dark:border-blue-500/30 
                      hover:border-blue-400 dark:hover:border-blue-500/40"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Send via Email
                  </button>
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
            <div className="absolute right-0 top-0 bottom-0 flex items-stretch">
              <div className="relative">
                <button
                  onClick={(e) => handleArchive(invoice, e)}
                  className="hover:bg-gray-100 dark:hover:bg-gray-700 h-full flex items-center p-4 relative group w-14"
                >
                  <Archive className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-gray-600 text-white text-[10px] rounded px-1.5 py-0.5
                    opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                    Archive
                  </div>
                </button>
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
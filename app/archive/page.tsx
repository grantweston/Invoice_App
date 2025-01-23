'use client';

import { useGeneratedInvoices } from '@/src/store/generatedInvoicesStore';
import { useArchiveStore } from '@/src/store/archiveStore';
import { useWIPStore } from '@/src/store/wipStore';
import { formatCurrency } from '@/src/utils/formatters';
import { Archive, ArchiveRestore } from 'lucide-react';
import { useDailyLogs } from "@/src/store/dailyLogs";

export default function ArchivePage() {
  const archivedInvoices = useArchiveStore((state) => state.archivedInvoices);
  const unarchiveInvoice = useArchiveStore((state) => state.unarchiveInvoice);
  const addWIPEntries = useWIPStore((state) => state.addEntries);
  const addInvoice = useGeneratedInvoices((state) => state.addInvoice);
  const setDailyLogs = useDailyLogs((state) => state.setLogs);

  const handleUnarchive = async (invoiceId: string, event: React.MouseEvent) => {
    // Get the invoice card
    const card = (event.currentTarget as HTMLElement).closest('.invoice-card') as HTMLElement;
    if (!card) return;

    // Create stamp overlay that looks like it's already stamped
    const stamp = document.createElement('div');
    stamp.className = 'fixed bg-emerald-600/20 flex items-center justify-center z-50 pointer-events-none';
    stamp.innerHTML = `
      <div class="text-emerald-600 border-8 border-emerald-600 rounded-lg px-8 py-4 text-4xl font-bold rotate-[-20deg] 
        transition-all duration-500 transform origin-bottom-right">
        UNARCHIVED
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

    // Add initial state to card
    card.style.transition = 'all 0.5s ease-in-out';
    card.style.opacity = '0.7';

    // Trigger peel animation
    requestAnimationFrame(() => {
      const stampText = stamp.querySelector('div') as HTMLElement;
      if (stampText) {
        stampText.style.transform = 'rotate(20deg) scale(0.8) translateX(100%)';
        stampText.style.opacity = '0';
      }
      
      // Restore card
      card.style.opacity = '1';
    });

    // Remove animations after delay
    setTimeout(() => {
      stamp.remove();
      card.style.transform = '';
      card.style.opacity = '';
      card.style.transition = '';

      // Proceed with unarchiving
      const invoice = unarchiveInvoice(invoiceId);
      if (invoice) {
        // Add back to generated invoices
        const { archivedAt, ...invoiceWithoutArchived } = invoice;
        addInvoice({
          ...invoiceWithoutArchived,
          wip: invoice.wipEntries?.reduce((sum, entry) => sum + ((entry.hours || 0) * entry.hourlyRate), 0) || 0
        });
        
        // Restore WIP entries
        addWIPEntries(invoice.wipEntries);

        // Restore daily activities
        const currentDailyLogs = useDailyLogs.getState().logs;
        
        // Get IDs of current logs for comparison
        const currentLogIds = new Set(currentDailyLogs.map(log => Number(log.id)));
        
        // Get IDs of logs we're about to restore
        const restoringLogIds = new Set(invoice.dailyActivities.map(log => Number(log.id)));
        
        console.log('Current daily log IDs:', Array.from(currentLogIds));
        console.log('Restoring daily log IDs:', Array.from(restoringLogIds));
        console.log('Current daily logs:', currentDailyLogs.length);
        console.log('Restoring daily logs:', invoice.dailyActivities.length);
        
        // Only keep logs that don't have IDs we're about to restore
        const remainingLogs = currentDailyLogs.filter(log => !restoringLogIds.has(Number(log.id)));
        
        // Combine remaining logs with restored logs
        setDailyLogs([...remainingLogs, ...invoice.dailyActivities]);
        
        console.log('Final daily logs count:', remainingLogs.length + invoice.dailyActivities.length);
      }
    }, 800);
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Archived Invoices</h1>
          <p className="text-xs text-gray-600 dark:text-gray-400">View and manage your archived invoices</p>
        </div>
      </div>

      <div className="space-y-4">
        {archivedInvoices.map((invoice) => (
          <div 
            key={invoice.id}
            className="invoice-card bg-white dark:bg-[#1f2937] rounded-xl border border-gray-200 dark:border-[#374151] 
              shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    {invoice.client} - {invoice.project}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1">
                      <Archive className="w-4 h-4 opacity-50" />
                      Archived on {new Date(invoice.archivedAt).toLocaleDateString()}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatCurrency(invoice.amount)}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://docs.google.com/document/d/${invoice.googleDocId}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-500/40 text-blue-700 dark:text-blue-200 
                      hover:bg-blue-100 dark:hover:bg-blue-500/50 transition-all rounded-lg border border-blue-200 
                      dark:border-blue-500/40 hover:scale-105"
                  >
                    View Invoice
                  </a>
                  <button
                    onClick={(e) => handleUnarchive(invoice.id, e)}
                    className="text-xs px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/40 text-emerald-700 dark:text-emerald-200 
                      hover:bg-emerald-100 dark:hover:bg-emerald-500/50 transition-all rounded-lg border border-emerald-200 
                      dark:border-emerald-500/40 hover:scale-105 flex items-center gap-1.5"
                  >
                    <ArchiveRestore className="w-4 h-4" />
                    Unarchive
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {archivedInvoices.length === 0 && (
          <div className="text-center py-16 rounded-xl border border-gray-200 dark:border-[#374151] 
            bg-white dark:bg-[#1f2937]">
            <Archive className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
            <p className="text-gray-600 dark:text-gray-400 mb-2 text-xs">No archived invoices</p>
            <p className="text-xs text-gray-500">Archived invoices will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
} 
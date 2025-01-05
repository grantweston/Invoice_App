import { DetailedInvoice } from '@/src/types';

interface PreviewModalProps {
  invoice: DetailedInvoice;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export default function InvoicePreviewModal({ 
  invoice, 
  isOpen, 
  onClose, 
  onConfirm,
  isLoading 
}: PreviewModalProps) {
  if (!isOpen) return null;

  const totalHours = invoice.categories.reduce(
    (sum, cat) => sum + (cat.totalMinutes / 60), 
    0
  ).toFixed(2);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Preview Invoice</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Client Info */}
              <div>
                <h3 className="font-semibold mb-2">Client Information</h3>
                <div className="text-sm space-y-1">
                  <p>{invoice.client.name}</p>
                  <p className="whitespace-pre-line">{invoice.client.address}</p>
                  {invoice.client.clientNumber && (
                    <p>Client #: {invoice.client.clientNumber}</p>
                  )}
                </div>
              </div>

              {/* Invoice Details */}
              <div>
                <h3 className="font-semibold mb-2">Invoice Details</h3>
                <div className="text-sm space-y-1">
                  <p>Invoice #: {invoice.invoiceNumber}</p>
                  <p>Period: {invoice.dateRange.start} to {invoice.dateRange.end}</p>
                  <p>Total Hours: {totalHours}</p>
                </div>
              </div>

              {/* Categories */}
              <div>
                <h3 className="font-semibold mb-2">Work Categories</h3>
                <div className="space-y-4">
                  {invoice.categories.map((category, i) => (
                    <div key={i} className="border border-gray-200 dark:border-gray-700 rounded p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{category.name}</h4>
                        <div className="text-sm">
                          {(category.totalMinutes / 60).toFixed(2)} hours
                        </div>
                      </div>
                      <div className="text-sm space-y-2">
                        {category.entries.map((entry, j) => (
                          <div key={j} className="flex justify-between">
                            <span>{entry.description}</span>
                            <span>{(entry.timeInMinutes / 60).toFixed(2)} hrs</span>
                          </div>
                        ))}
                        {category.activities.map((activity, j) => (
                          <div key={`a${j}`} className="text-gray-600 dark:text-gray-400">
                            • {activity.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financials */}
              <div>
                <h3 className="font-semibold mb-2">Financial Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${invoice.totalAmount.toFixed(2)}</span>
                  </div>
                  {invoice.retainerAmount && (
                    <div className="flex justify-between text-gray-600">
                      <span>Retainer</span>
                      <span>-${invoice.retainerAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {invoice.adjustments?.map((adj, i) => (
                    <div key={i} className="flex justify-between text-gray-600">
                      <span>{adj.description}</span>
                      <span>${adj.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>Total</span>
                    <span>${(
                      invoice.totalAmount - 
                      (invoice.retainerAmount || 0) +
                      (invoice.adjustments?.reduce((sum, adj) => sum + adj.amount, 0) || 0)
                    ).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Generate & Download
          </button>
        </div>
      </div>
    </div>
  );
} 
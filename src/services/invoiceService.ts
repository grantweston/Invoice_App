import { DetailedInvoice } from '@/src/types';

export async function generateInvoice(
  template: File,
  invoice: DetailedInvoice
): Promise<Blob> {
  const formData = new FormData();
  formData.append('template', template);
  formData.append('invoice', JSON.stringify(invoice));

  const response = await fetch('/api/generate-invoice', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to generate invoice');
  }

  return response.blob();
} 
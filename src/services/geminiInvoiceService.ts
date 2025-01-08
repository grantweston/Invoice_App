import { WIPEntry } from '@/src/types';

export async function generateInvoiceContent(client: string, entries: WIPEntry[]) {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ client, entries }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate content');
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }

    return data.content;
  } catch (error) {
    console.error('Error generating invoice content:', error);
    throw error;
  }
} 
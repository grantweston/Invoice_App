'use server';

import { NextResponse } from 'next/server';
import { generateInvoice } from '@/src/utils/docxGenerator';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const docxBuffer = await generateInvoice(data);

    return new NextResponse(docxBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="invoice-${data.invoiceNumber}.docx"`
      }
    });
  } catch (error) {
    console.error('Failed to generate invoice:', error);
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
} 
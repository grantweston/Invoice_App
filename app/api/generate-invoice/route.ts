'use server';

import { NextResponse } from 'next/server';
import { DetailedInvoice } from '@/src/types';
import { fillTemplate } from '@/src/utils/templateHandler';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const templateFile = formData.get('template') as File;
    const invoiceData = JSON.parse(formData.get('invoice') as string) as DetailedInvoice;
    
    if (!templateFile || !invoiceData) {
      return NextResponse.json(
        { error: 'Missing template or invoice data' },
        { status: 400 }
      );
    }

    const templateBuffer = Buffer.from(await templateFile.arrayBuffer());
    const docxBuffer = await fillTemplate(templateBuffer, invoiceData);
    
    // Return the generated DOCX as a blob
    return new Response(docxBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="invoice-${invoiceData.invoiceNumber}.docx"`
      }
    });
  } catch (error) {
    console.error('Invoice generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
} 
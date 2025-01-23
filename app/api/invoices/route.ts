import { NextResponse } from 'next/server';
import { invoiceService } from '@/src/services/invoiceService';

// Mark as dynamic route
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    if (!data.client || !data.entries || !Array.isArray(data.entries)) {
      return NextResponse.json(
        { error: 'Invalid invoice data. Client and entries are required.' },
        { status: 400 }
      );
    }

    const documentId = await invoiceService.generateInvoice(data);
    
    return NextResponse.json({
      documentId,
      message: 'Invoice generated successfully'
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate invoice' },
      { status: 500 }
    );
  }
} 
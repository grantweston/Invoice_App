import { NextResponse } from 'next/server';
import { invoiceService } from '@/src/services/invoiceService';

// Mark as dynamic route
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    console.log('\nInvoice API Received:');
    console.log('Client:', data.client);
    console.log('Total entries:', data.entries.length);
    console.log('Provided total hours:', data.totalHours);
    console.log('Provided total amount:', data.totalAmount);
    
    // Verify totals
    const calculatedHours = data.entries.reduce((sum: number, entry: any) => 
      sum + (entry.timeInMinutes / 60), 0
    );
    const calculatedAmount = data.entries.reduce((sum: number, entry: any) => 
      sum + entry.amount, 0
    );
    
    console.log('\nAPI Calculations:');
    console.log('Calculated hours:', calculatedHours.toFixed(1));
    console.log('Calculated amount:', calculatedAmount.toFixed(2));

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
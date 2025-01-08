import { NextResponse } from 'next/server';
import { invoiceService } from '@/src/services/invoiceService';

export async function POST(request: Request) {
  try {
    const { logs } = await request.json();
    
    console.log('📊 Analyzing logs for invoice...');
    const analysis = await invoiceService.analyzeLogEntries(logs);
    
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Error analyzing logs:', error);
    return NextResponse.json(
      { error: 'Failed to analyze logs' },
      { status: 500 }
    );
  }
} 
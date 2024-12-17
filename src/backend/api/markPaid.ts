"use server";

import { NextRequest, NextResponse } from 'next/server';
import { markInvoiceAsPaid } from '../services/invoiceService';

// This endpoint marks an invoice as paid.
// In a real scenario, it would update invoice and related time entries in the DB.
export async function POST(req: NextRequest) {
  const { invoiceId } = await req.json();
  if (!invoiceId) {
    return NextResponse.json({ error: "Missing invoiceId" }, { status: 400 });
  }
  const result = await markInvoiceAsPaid(invoiceId);
  return NextResponse.json(result);
}
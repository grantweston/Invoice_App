"use server";

import { NextRequest, NextResponse } from 'next/server';
import { getInvoice, createInvoice, updateInvoice } from '../services/invoiceService';

// This endpoint handles invoice-related operations.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const invoiceId = searchParams.get('id');
  if (!invoiceId) {
    return NextResponse.json({ error: "Missing invoice ID" }, { status: 400 });
  }
  const invoice = await getInvoice(invoiceId);
  return NextResponse.json(invoice);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const newInvoice = await createInvoice(data);
  return NextResponse.json(newInvoice, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const data = await req.json();
  const updatedInvoice = await updateInvoice(data);
  return NextResponse.json(updatedInvoice);
}
"use server";

import { createInvoiceRecord, getInvoiceRecord, updateInvoiceRecord, markInvoicePaid } from '../db/queries/invoiceQueries';
import { Invoice } from '../models/Invoice';

// Retrieves a single invoice by ID.
export async function getInvoice(invoiceId: string) {
  return await getInvoiceRecord(invoiceId);
}

// Creates a new invoice.
export async function createInvoice(data: Partial<Invoice>) {
  if (!data.clientId || !data.totalAmount) {
    throw new Error("Missing required fields for invoice creation.");
  }
  return await createInvoiceRecord(data as Invoice);
}

// Updates an existing invoice (e.g., add line items, update descriptions).
export async function updateInvoice(data: Partial<Invoice>) {
  if (!data.id) {
    throw new Error("Missing invoice ID for update.");
  }
  return await updateInvoiceRecord(data);
}

// Marks an invoice as paid and updates related time entries.
export async function markInvoiceAsPaid(invoiceId: string) {
  return await markInvoicePaid(invoiceId);
}
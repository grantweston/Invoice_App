"use server";

import { supabase } from '../supabaseClient';
import { Invoice } from '@/src/backend/models/Invoice';

export async function getInvoiceRecord(invoiceId: string) {
  const { data, error } = await supabase.from('invoices').select('*').eq('id', invoiceId).single();
  if (error) throw error;
  return data;
}

export async function createInvoiceRecord(invoice: Invoice) {
  const { data, error } = await supabase.from('invoices').insert(invoice).select().single();
  if (error) throw error;
  return data;
}

export async function updateInvoiceRecord(invoice: Partial<Invoice>) {
  const { data, error } = await supabase.from('invoices').update(invoice).eq('id', invoice.id).select().single();
  if (error) throw error;
  return data;
}

export async function markInvoicePaid(invoiceId: string) {
  const { data, error } = await supabase.from('invoices').update({ paid: true }).eq('id', invoiceId).select().single();
  if (error) throw error;

  // In reality, also update related time entries here to reflect paid status.
  return data;
}
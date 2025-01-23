"use server";

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Missing Supabase credentials. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local");
}

// Create the client in a separate const
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// Export async functions that use the client
export async function getSupabase() {
  return supabaseClient;
}

export async function query(table: string) {
  return supabaseClient.from(table);
}

export async function insert(table: string, data: any) {
  return supabaseClient.from(table).insert(data);
}

export async function update(table: string, data: any) {
  return supabaseClient.from(table).update(data);
}
"use server";

import { createClient } from '@supabase/supabase-js';

// In a real scenario, these would be loaded from env variables
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn("Supabase credentials are missing. Make sure to set them in the environment.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
import { createClient } from '@supabase/supabase-js';
import { WIPEntry } from '@/src/services/supabaseDB';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function upsertWIPEntry(entry: Partial<WIPEntry>) {
  const { data, error } = await supabase
    .from('wip_entries')
    .upsert({
      id: entry.id,
      description: entry.description,
      time_in_minutes: entry.time_in_minutes,
      hourly_rate: entry.hourly_rate,
      date: entry.date || new Date().toISOString(),
      client_id: entry.client_id,
      client_name: entry.client_name,
      client_address: entry.client_address,
      project_name: entry.project_name,
      partner: entry.partner || 'Unknown',
      created_at: entry.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getWIPEntries() {
  const { data, error } = await supabase
    .from('wip_entries')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function deleteWIPEntry(id: string) {
  const { error } = await supabase
    .from('wip_entries')
    .delete()
    .match({ id });

  if (error) throw error;
}

export async function updateWIPEntry(id: string, updates: Partial<WIPEntry>) {
  const { data, error } = await supabase
    .from('wip_entries')
    .update({
      description: updates.description,
      time_in_minutes: updates.time_in_minutes,
      hourly_rate: updates.hourly_rate,
      client_name: updates.client_name,
      client_address: updates.client_address,
      project_name: updates.project_name,
      partner: updates.partner || 'Unknown',
      updated_at: new Date().toISOString()
    })
    .match({ id })
    .select()
    .single();

  if (error) throw error;
  return data;
} 
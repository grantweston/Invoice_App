import { supabase } from '@/src/lib/supabase'

export interface WIPEntry {
  id: string
  description: string
  time_in_minutes: number
  hourly_rate: number
  date: string
  client_id: string
  client_name: string
  client_address: string
  project_name: string
  partner: string
  created_at: string
  updated_at: string
}

export interface DailyActivity {
  id?: string
  date: string
  description: string
  timeInMinutes: number
  userId?: string
  createdAt?: string
}

// WIP Entries
export async function createWIPEntry(entry: WIPEntry) {
  try {
    console.log('Attempting to create WIP entry:', JSON.stringify(entry, null, 2));
    const { data, error } = await supabase
      .from('wip_entries')
      .insert([entry])
      .select()
      .single()
    
    if (error) {
      console.error('Supabase error creating WIP entry:', error);
      throw error;
    }
    console.log('Successfully created WIP entry:', data);
    return data;
  } catch (error) {
    console.error('Error in createWIPEntry:', error);
    throw error;
  }
}

export async function getWIPEntries() {
  const { data, error } = await supabase
    .from('wip_entries')
    .select('*')
    .order('date', { ascending: false })
  
  if (error) throw error
  return data
}

export async function deleteWIPEntry(id: string) {
  const { error } = await supabase
    .from('wip_entries')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Daily Activities
export async function createDailyActivity(activity: DailyActivity) {
  const { data, error } = await supabase
    .from('daily_activities')
    .insert([activity])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getDailyActivities() {
  const { data, error } = await supabase
    .from('daily_activities')
    .select('*')
    .order('date', { ascending: false })
  
  if (error) throw error
  return data
}

export async function deleteDailyActivity(id: string) {
  const { error } = await supabase
    .from('daily_activities')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Get or create the unknown client
export async function getOrCreateUnknownClient(projectName: string, description: string) {
  try {
    // First try to find similar existing unknown clients
    const { data: existingClients, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('name', 'Unknown');
    
    if (fetchError) throw fetchError;

    // If we found existing unknown clients, check if any are for similar work
    if (existingClients?.length) {
      // Get their WIP entries to check project similarity
      const { data: wipEntries, error: wipError } = await supabase
        .from('wip_entries')
        .select('*')
        .in('client_id', existingClients.map(c => c.id));
      
      if (wipError) throw wipError;

      // Look for entries with similar project/description
      for (const client of existingClients) {
        const clientEntries = wipEntries?.filter(e => e.client_id === client.id) || [];
        const hasSimilarWork = clientEntries.some(entry => 
          entry.project_name === projectName ||
          entry.description.toLowerCase().includes(description.toLowerCase()) ||
          description.toLowerCase().includes(entry.description.toLowerCase())
        );

        if (hasSimilarWork) {
          return client;
        }
      }
    }

    // If no similar client found, create new one
    const { data: newClient, error: createError } = await supabase
      .from('clients')
      .insert([{
        id: crypto.randomUUID(),
        name: 'Unknown',
        address: 'N/A',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (createError) throw createError;
    return newClient;
  } catch (error) {
    console.error('Error in getOrCreateUnknownClient:', error);
    throw error;
  }
} 
import { supabase } from '@/src/lib/supabase'

export interface WIPEntry {
  id?: string
  date: string
  description: string
  timeInMinutes: number
  hourlyRate: number
  userId?: string
  createdAt?: string
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
  const { data, error } = await supabase
    .from('wip_entries')
    .insert([entry])
    .select()
    .single()
  
  if (error) throw error
  return data
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
"use server";

import { query } from '../db/supabaseClient';
import { summarizeFifteenMinutes } from '@/src/integrations/gemini/geminiService';
import { TimeEntry } from '@/src/backend/models/TimeEntry';

/**
 * generateDailyReport(forceReAggregation = false)
 * Now this is called every time a time entry is added (via POST /api/dailyReport).
 * Each entry is only 1 minute, but we treat them similarly and aggregate them all.
 */
export async function generateDailyReport(forceReAggregation = false) {
  const today = new Date().toISOString().split('T')[0];

  if (!forceReAggregation) {
    const supabase = await query('daily_aggregations');
    const { data: existingData } = await supabase
      .select('aggregation')
      .eq('date', today)
      .single();
    if (existingData?.aggregation) {
      return existingData.aggregation;
    }
  }

  const timeEntries = await query('time_entries');
  const { data: entries, error: entriesError } = await timeEntries
    .select('*')
    .gte('date', today)
    .lt('date', today + 'T23:59:59');

  if (entriesError) {
    console.error("Error fetching today's WIP entries:", entriesError);
    throw new Error("Failed to fetch WIP entries for today.");
  }

  if (!entries || entries.length === 0) {
    const emptyAgg = {};
    await storeAggregation(today, emptyAgg);
    return emptyAgg;
  }

  // Group entries by client/project
  const agg: any = {};
  entries.forEach((entry: TimeEntry) => {
    const clientName = `Client ${entry.clientId}`;
    const projectName = `Project ${entry.projectId}`;
    if (!agg[clientName]) agg[clientName] = {};
    const proj = agg[clientName][projectName] || { total_time_hours: 0, description: "" };
    proj.total_time_hours += entry.hours;
    // Now we have a description per entry. Let's just pick the latest entry's description for that project.
    // In a real scenario, we might merge descriptions, but for demo, just overwrite with latest.
    proj.description = entry.description || proj.description;
    agg[clientName][projectName] = proj;
  });

  // Store final aggregation
  await storeAggregation(today, agg);
  return agg;
}

async function storeAggregation(date: string, aggregation: any) {
  const supabase = await query('daily_aggregations');
  const { error } = await supabase
    .upsert({ date, aggregation }, { onConflict: 'date' });

  if (error) {
    console.error("Failed to store daily aggregation:", error);
  }
}
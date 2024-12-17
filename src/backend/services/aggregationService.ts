"use server";

import { supabase } from '@/src/backend/db/supabaseClient';
import { summarizeFifteenMinutes } from '@/src/integrations/gemini/geminiService';
import { TimeEntry } from '@/src/backend/models/TimeEntry';

/**
 * generateDailyReport(forceReAggregation = false)
 * - Fetches today's WIP entries from 'time_entries' in Supabase.
 * - Groups them by client/project.
 * - Calls LLM (summarizeFifteenMinutes) to get a cohesive description.
 * - Stores the aggregation in 'daily_aggregations' table for future retrieval.
 * - If forceReAggregation is false, tries to return existing cached data from the DB before re-calculating.
 */
export async function generateDailyReport(forceReAggregation = false) {
  const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

  // If not forcing re-aggregation, check if we have a cached aggregation for today.
  if (!forceReAggregation) {
    const { data: existingData, error: existingErr } = await supabase
      .from('daily_aggregations')
      .select('aggregation')
      .eq('date', today)
      .single();

    if (!existingErr && existingData?.aggregation) {
      // Return cached aggregation if it exists.
      return existingData.aggregation;
    }
  }

  // No cached aggregation or forced re-aggregation needed, so let's compute fresh data.
  // Fetch today's WIP entries. We assume `date` field is a simple date or datetime column.
  const { data: entries, error: entriesError } = await supabase
    .from('time_entries')
    .select('*')
    .gte('date', today)
    .lt('date', today + 'T23:59:59');

  if (entriesError) {
    console.error("Error fetching today's WIP entries:", entriesError);
    throw new Error("Failed to fetch WIP entries for today.");
  }

  // If no entries found for today, store and return an empty aggregation.
  if (!entries || entries.length === 0) {
    const emptyAgg = {};
    await storeAggregation(today, emptyAgg);
    return emptyAgg;
  }

  // Group entries by client/project
  const agg: any = {};
  entries.forEach((entry: TimeEntry) => {
    // In a real scenario, we'd fetch client/project names from DB, here we mock them:
    const clientName = `Client ${entry.clientId}`;
    const projectName = `Project ${entry.projectId}`;

    // Initialize client object if not present
    if (!agg[clientName]) agg[clientName] = {};

    const proj = agg[clientName][projectName] || { total_time_hours: 0, description: "" };
    proj.total_time_hours += entry.hours;
    agg[clientName][projectName] = proj;
  });

  // Prepare data for LLM prompt. We'll just take a simple approach:
  // Summaries array: each item is "ClientName - ProjectName: Xh"
  const summaries = Object.keys(agg).flatMap(clientName =>
    Object.keys(agg[clientName]).map(projectName =>
      `${clientName} - ${projectName}: ${agg[clientName][projectName].total_time_hours}h`
    )
  );

  // Call LLM to get a descriptive summary for the day's work.
  const llmResponse = await summarizeFifteenMinutes(summaries);
  const generatedDescription = llmResponse; // Use returned text as a description for all projects.

  // Assign the LLM-generated description to each project.
  Object.keys(agg).forEach(clientName => {
    Object.keys(agg[clientName]).forEach(projectName => {
      agg[clientName][projectName].description = generatedDescription;
    });
  });

  // Store the final aggregation in daily_aggregations table.
  await storeAggregation(today, agg);

  return agg;
}

/**
 * storeAggregation(date: string, aggregation: any)
 * Stores the computed aggregation JSON in the daily_aggregations table for the given date.
 */
async function storeAggregation(date: string, aggregation: any) {
  const { error } = await supabase
    .from('daily_aggregations')
    .upsert({ date, aggregation }, { onConflict: 'date' });

  if (error) {
    console.error("Failed to store daily aggregation:", error);
  }
}
"use server";

import { analyze } from "@/src/integrations/gemini/geminiService";

// Mock data store
let mockDailyAggregations: any[] = [];

/**
 * Generates a daily report of all WIP entries.
 * Now this is called every time a time entry is added (via POST /api/dailyReport).
 */
export async function generateDailyReport(forceRegenerate = false) {
  const today = new Date().toISOString().split('T')[0];
  
  // Check for existing aggregation
  const existingAggregation = mockDailyAggregations.find(agg => agg.date === today);
  if (existingAggregation && !forceRegenerate) {
    return existingAggregation;
  }

  // Mock time entries for today
  const mockEntries = [
    { description: "Worked on feature A", hours: 2 },
    { description: "Fixed bug in module B", hours: 1.5 },
    { description: "Team meeting", hours: 1 }
  ];

  // Group entries (in a real app, this would group by project/client)
  const totalHours = mockEntries.reduce((sum, entry) => sum + entry.hours, 0);
  
  // Generate summary using LLM
  const entriesText = mockEntries.map(e => `- ${e.description} (${e.hours} hours)`).join('\n');
  const prompt = `Summarize these work activities into a concise daily report:\n${entriesText}`;
  const summary = await analyze(prompt);

  // Store the aggregation
  const aggregation = {
    date: today,
    entries: mockEntries,
    totalHours,
    summary
  };

  // Update or add new aggregation
  const existingIndex = mockDailyAggregations.findIndex(agg => agg.date === today);
  if (existingIndex >= 0) {
    mockDailyAggregations[existingIndex] = aggregation;
  } else {
    mockDailyAggregations.push(aggregation);
  }

  return aggregation;
}
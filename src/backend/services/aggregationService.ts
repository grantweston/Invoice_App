"use server";

import { summarizeFifteenMinutes } from '@/src/integrations/gemini/geminiService';
import { TimeEntry } from '@/src/backend/models/TimeEntry';

/**
 * generateDailyReport(forceReAggregation = false)
 * Now this is called every time a time entry is added (via POST /api/dailyReport).
 * Each entry is only 1 minute, but we treat them similarly and aggregate them all.
 */
export async function generateDailyReport(forceReAggregation = false) {
  // Mock implementation
  return {
    'Client A': {
      'Project X': {
        total_time_hours: 2.5,
        description: 'Mock project work'
      },
      'Project Y': {
        total_time_hours: 1.5,
        description: 'Another mock project'
      }
    },
    'Client B': {
      'Project Z': {
        total_time_hours: 3,
        description: 'Third mock project'
      }
    }
  };
}
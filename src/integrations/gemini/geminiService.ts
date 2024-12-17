"use server";

import { callGemini } from "./geminiClient";
import { ONE_MINUTE_SUMMARY_PROMPT, FIFTEEN_MINUTE_AGGREGATION_PROMPT } from "./prompts";

export async function summarizeOneMinuteActivities(activities: string[]) {
  const prompt = ONE_MINUTE_SUMMARY_PROMPT(activities);
  const response = await callGemini(prompt);
  return response;
}

export async function summarizeFifteenMinutes(summaries: string[]) {
  const prompt = FIFTEEN_MINUTE_AGGREGATION_PROMPT(summaries);
  const response = await callGemini(prompt);
  return response;
}
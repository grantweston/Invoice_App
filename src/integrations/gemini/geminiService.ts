"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { callGemini } from "./geminiClient";
import { ONE_MINUTE_SUMMARY_PROMPT, FIFTEEN_MINUTE_AGGREGATION_PROMPT } from "./prompts";

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface Activity {
  text: string;
  image?: Buffer;
}

export async function summarizeOneMinuteActivities(activities: Activity[]) {
  const model = client.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
  
  const contents = activities.map(activity => {
    const parts: any[] = [{ text: activity.text }];
    if (activity.image) {
      parts.push({
        inlineData: {
          mimeType: "image/png", 
          data: activity.image.toString("base64")
        }
      });
    }
    return parts;
  }).flat();

  const result = await model.generateContent(contents);
  const response = await result.response;
  return response.text();
}

export async function summarizeFifteenMinutes(summaries: string[]) {
  const prompt = FIFTEEN_MINUTE_AGGREGATION_PROMPT(summaries);
  const response = await callGemini(prompt);
  return response;
}

export async function analyze(prompt: string): Promise<string> {
  try {
    const model = client.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error in Gemini analysis:", error);
    throw error;
  }
}
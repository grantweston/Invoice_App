"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is missing from environment variables.");
}

const client = new GoogleGenerativeAI({
  apiKey
});

export async function callGemini(prompt: string): Promise<string> {
  try {
    const model = await client.getGenerativeModel({
      model: "gemini-2.0-flash"
    });

    const response = await model.generateContent({
      prompt
    });

    if (response && response.candidates && response.candidates.length > 0) {
      return response.candidates[0].output || "";
    } else {
      console.warn("Gemini API returned no candidates.");
      return "";
    }
  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    return "";
  }
}
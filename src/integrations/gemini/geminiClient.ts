"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

// Get API key directly from process.env for server component
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing from environment variables.");
}

const client = new GoogleGenerativeAI(apiKey);

export async function callGemini(prompt: string): Promise<string> {
  try {
    const model = client.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
}
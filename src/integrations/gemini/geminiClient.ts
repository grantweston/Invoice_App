"use server";

// This file sets up a client to talk to the Gemini LLM API.
// Here we mock the calls, but in reality we'd use fetch or axios with an API key.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

export async function geminiRequest(prompt: string) {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }
  // Mock response
  return { response: `Mocked LLM response for prompt: ${prompt}` };
}
"use server";

import { NextResponse } from "next/server";
import { callGemini } from "@/src/integrations/gemini/geminiClient";

export async function GET() {
  try {
    const response = await callGemini("Say 'Hello World' and nothing else.");
    return NextResponse.json({ response }, { status: 200 });
  } catch (error: any) {
    console.error("Gemini test failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 
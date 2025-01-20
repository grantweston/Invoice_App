"use server";

import { NextResponse } from "next/server";
import { callGemini } from "@/src/integrations/gemini/geminiClient";

export async function GET() {
  try {
    console.log('📡 Test-Gemini API called');
    const response = await callGemini("Say 'Hello World' and nothing else.");
    console.log('✨ Gemini response:', response);
    return NextResponse.json({ response }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Gemini test failed:", error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 
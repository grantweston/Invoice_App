"use server";

import { NextResponse } from "next/server";
import { invoiceService } from "@/src/services/invoiceService";

export async function GET() {
  try {
    const isWorking = await invoiceService.testGeminiApiKey();
    return NextResponse.json({ success: isWorking });
  } catch (error) {
    console.error("Error testing Gemini API:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
} 
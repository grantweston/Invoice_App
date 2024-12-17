"use server";

import { NextRequest, NextResponse } from "next/server";
import { generateDailyReport } from "@/src/backend/services/aggregationService";

export async function GET() {
  try {
    const report = await generateDailyReport(false);
    return NextResponse.json(report, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching daily report:", error);
    return NextResponse.json({ error: "Failed to fetch daily report" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const report = await generateDailyReport(true);
    return NextResponse.json(report, { status: 200 });
  } catch (error: any) {
    console.error("Error generating daily report:", error);
    return NextResponse.json({ error: "Failed to generate daily report" }, { status: 500 });
  }
}
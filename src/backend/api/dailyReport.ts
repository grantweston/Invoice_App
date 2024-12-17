"use server";

import { NextRequest, NextResponse } from 'next/server';
import { generateDailyReport } from '../services/aggregationService';

// This endpoint returns a daily aggregated WIP report.
// In reality, we'd fetch data from the DB and aggregate it, possibly using LLM services.
export async function GET(_req: NextRequest) {
  const report = await generateDailyReport();
  return NextResponse.json(report);
}
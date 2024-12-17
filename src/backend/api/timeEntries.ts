"use server";

// Endpoint to handle listing and creating time entries.
// This could be a Next.js serverless route or a standalone server endpoint.
// For demonstration, we provide a handler function that would integrate with timeEntryService.
import { NextRequest, NextResponse } from 'next/server';
import { listTimeEntries, createTimeEntry } from '../services/timeEntryService';

export async function GET(req: NextRequest) {
  // List all time entries (in a real scenario, handle query params for filtering)
  const entries = await listTimeEntries();
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  // Create a new time entry using the data provided
  const newEntry = await createTimeEntry(data);
  return NextResponse.json(newEntry, { status: 201 });
}
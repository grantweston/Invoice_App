"use server";

import { NextRequest, NextResponse } from "next/server";
import { listTimeEntries, createTimeEntry } from "@/src/backend/services/timeEntryService";

export async function GET() {
  try {
    const entries = await listTimeEntries();
    return NextResponse.json(entries, { status: 200 });
  } catch (error: any) {
    console.error("Error listing time entries:", error);
    return NextResponse.json({ error: "Failed to list time entries" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    if (!data.clientId || !data.projectId || data.hours === undefined || !data.description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const created = await createTimeEntry(data);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("Error creating time entry:", error);
    return NextResponse.json({ error: "Failed to create time entry" }, { status: 500 });
  }
}
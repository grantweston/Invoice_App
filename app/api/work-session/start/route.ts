import { NextResponse } from "next/server";
import { createTimeEntry } from "@/src/backend/services/timeEntryService";

export async function POST() {
  try {
    // Create initial time entry
    const entry = await createTimeEntry({
      clientId: 'A',
      projectId: 'Alpha',
      hours: 0,
      description: 'Started work session',
      date: new Date().toISOString()
    });

    console.log('Time entry created:', entry);

    return NextResponse.json({ 
      status: "started",
      timeEntry: entry
    });
  } catch (error: any) {
    console.error("Failed to start work session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to start work session" },
      { status: 500 }
    );
  }
}
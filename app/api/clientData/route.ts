"use server";

import { NextRequest, NextResponse } from "next/server";
import { getClientWithProjects } from "@/src/backend/services/timeEntryService";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing client id" }, { status: 400 });
    }

    const clientData = await getClientWithProjects(id);
    return NextResponse.json(clientData, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching client data:", error);
    return NextResponse.json({ error: "Failed to fetch client data" }, { status: 500 });
  }
}
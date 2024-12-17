"use server";

import { NextRequest, NextResponse } from 'next/server';
import { getClientWithProjects } from '../services/timeEntryService';

// This endpoint returns details for a given client, including their projects.
// Example: /api/clientData?id=123
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('id');
  if (!clientId) {
    return NextResponse.json({ error: "Missing client ID" }, { status: 400 });
  }

  const clientData = await getClientWithProjects(clientId);
  return NextResponse.json(clientData);
}
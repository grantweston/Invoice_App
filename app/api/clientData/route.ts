import { NextRequest, NextResponse } from "next/server";
import { getClientWithProjects } from "@/src/backend/services/timeEntryService";

<<<<<<< HEAD
=======
// Mark route as dynamic
>>>>>>> gemini-updates
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
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
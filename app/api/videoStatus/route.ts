import { NextResponse } from "next/server";
import { screenVideo } from "@/src/services/screenVideoService";

export async function GET() {
  try {
    const status = screenVideo.getStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    console.error("Error getting video status:", error);
    return NextResponse.json({ state: 'error', message: error.message }, { status: 500 });
  }
}
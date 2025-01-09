import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Return a default status since we can't access client state from the server
    return NextResponse.json({
      state: 'idle',
      message: 'Video status is managed client-side'
    });
  } catch (error: any) {
    console.error("Error getting video status:", error);
    return NextResponse.json({ 
      state: 'error', 
      message: error.message 
    }, { status: 500 });
  }
}
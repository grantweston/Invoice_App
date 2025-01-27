import { NextResponse } from "next/server";

export async function GET() {
<<<<<<< HEAD
  // Since screen recording is client-side only, return a default status
  return NextResponse.json({
    state: 'idle',
    message: 'Screen recording is only available in the browser'
  });
=======
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
>>>>>>> gemini-updates
}
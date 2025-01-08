import { NextResponse } from "next/server";

export async function GET() {
  // Since screen recording is client-side only, return a default status
  return NextResponse.json({
    state: 'idle',
    message: 'Screen recording is only available in the browser'
  });
}
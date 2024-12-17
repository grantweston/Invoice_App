import { NextResponse } from "next/server";
import { screenCapture } from "@/src/services/screenCaptureService";

export async function POST() {
  try {
    await screenCapture.startCapturing();
    return NextResponse.json({ 
      success: true, 
      message: "Screen capture started" 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 
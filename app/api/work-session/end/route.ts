import { NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export async function POST(request: Request) {
  try {
    const video = await request.blob();
    if (!video) {
      return NextResponse.json({ error: "No video data received" }, { status: 400 });
    }

    // Use system temp directory instead of local directory
    const tempDir = path.join(os.tmpdir(), 'invoice-app-recordings');
    await fs.mkdir(tempDir, { recursive: true });

    // Use timestamp for unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join(tempDir, `recording-${timestamp}.webm`);

    // Convert blob to buffer and save
    const buffer = Buffer.from(await video.arrayBuffer());
    await fs.writeFile(filename, buffer);

    return NextResponse.json({ 
      success: true,
      message: "Recording saved successfully",
      path: filename
    });
  } catch (error: any) {
    console.error("Error saving recording:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 
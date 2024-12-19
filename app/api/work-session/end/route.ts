import { NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const video = formData.get('video') as File;
    
    if (!video) {
      throw new Error('No video file received');
    }

    // Create recordings directory if it doesn't exist
    const recordingsDir = path.join(process.cwd(), 'recordings');
    await fs.mkdir(recordingsDir, { recursive: true });

    // Save the video file
    const buffer = Buffer.from(await video.arrayBuffer());
    const filename = path.join(recordingsDir, video.name);
    await fs.writeFile(filename, buffer);

    console.log(`Recording saved successfully: ${filename}`);
    console.log(`File size: ${buffer.length} bytes`);

    return NextResponse.json({ 
      success: true, 
      message: "Recording saved successfully",
      filename: video.name,
      size: buffer.length
    });
  } catch (error: any) {
    console.error('Failed to save recording:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 
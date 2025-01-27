import { NextResponse } from "next/server";
import { summarizeOneMinuteActivities } from "@/src/integrations/gemini/geminiService";
import screenshot from 'screenshot-desktop';
import { promises as fs } from 'fs';
import path from 'path';

// Mark as dynamic route
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const capturesDir = path.join(process.cwd(), 'captures');
    await fs.mkdir(capturesDir, { recursive: true });
    const imagePath = path.join(capturesDir, `test-capture-${timestamp}.png`);
    
    try {
      await screenshot({ filename: imagePath });
    } catch (screenshotError) {
      console.error('Screenshot failed:', screenshotError);
      return NextResponse.json({ 
        error: 'Screenshot capture not available in this environment',
        timestamp 
      }, { status: 503 });
    }
    
    const imageData = await fs.readFile(imagePath);
    
    const summary = await summarizeOneMinuteActivities([
      {
        text: `Screen captured at ${timestamp}`,
        image: imageData
      }
    ]);

    // Clean up the image file
    await fs.unlink(imagePath).catch(console.error);
    
    return NextResponse.json({ summary, timestamp });
  } catch (error) {
    console.error('Error in screen capture route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
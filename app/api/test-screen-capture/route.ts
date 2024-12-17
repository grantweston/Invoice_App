import { NextResponse } from "next/server";
import { summarizeOneMinuteActivities } from "@/src/integrations/gemini/geminiService";
import screenshot from 'screenshot-desktop';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const capturesDir = path.join(process.cwd(), 'captures');
    await fs.mkdir(capturesDir, { recursive: true });
    const imagePath = path.join(capturesDir, `test-capture-${timestamp}.png`);
    
    await screenshot({ filename: imagePath });
    
    const imageData = await fs.readFile(imagePath);
    
    const summary = await summarizeOneMinuteActivities([
      {
        text: `Screen captured at ${timestamp}`,
        image: imageData
      }
    ]);

    return NextResponse.json({ 
      isWatching: true,
      lastActivity: [`Screen captured at ${timestamp}`],
      summary,
      screenshotPath: imagePath
    });
  } catch (error: any) {
    console.error("Screen capture test failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 
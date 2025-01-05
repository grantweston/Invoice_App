import { NextResponse } from "next/server";
import { analyzeScreenshots } from "@/src/services/screenAnalysisService";
import { processScreenActivity } from "@/src/backend/services/screenActivityProcessor";
import { createWIPEntry } from "@/src/services/supabaseDB";

export async function POST(request: Request) {
  try {
    const { screenshots, currentTasks = [] } = await request.json();
    
    if (!Array.isArray(screenshots) || screenshots.length === 0) {
      throw new Error('No screenshots received');
    }

    const analysis = await analyzeScreenshots(screenshots, currentTasks);
    
    // Process the analysis into a WIP entry
    const wipEntry = await processScreenActivity(analysis, currentTasks);
    
    // Save to database
    const savedEntry = await createWIPEntry(wipEntry);
    
    return NextResponse.json({ analysis, savedEntry });
  } catch (error: any) {
    console.error('Failed to analyze screenshots:', error);
    return NextResponse.json({ 
      client_name: "Unknown",
      project_name: "Unknown",
      activity_description: "Failed to analyze screen activity",
      confidence_score: 0,
      error: error.message
    }, { status: 500 });
  }
} 
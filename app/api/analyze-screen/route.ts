import { NextResponse } from "next/server";
import { analyzeScreenshots } from "@/src/services/screenAnalysisService";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const screenshots = data.screenshots;
    
    if (!screenshots || !Array.isArray(screenshots)) {
      throw new Error('No screenshots received');
    }

    const analysis = await analyzeScreenshots(screenshots);
    
    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('Failed to analyze screenshots:', error);
    return NextResponse.json({ 
      client_name: "Unknown",
      project_name: "Unknown",
      activity_description: "Failed to analyze screen activity",
      confidence_score: 0
    }, { status: 500 });
  }
} 
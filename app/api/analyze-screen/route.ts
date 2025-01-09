import { NextResponse } from "next/server";
import { analyzeScreenshots } from "@/src/services/screenAnalysisService";

// Add runtime configuration
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { screenshots, currentTasks } = await request.json();
    
    if (!Array.isArray(screenshots) || screenshots.length === 0) {
      throw new Error('No screenshots received');
    }

    const prompt = `
    Analyze the following screenshots of screen activity and determine what work is being done.
    
    IMPORTANT: If you see an interface that looks like a work tracking app with a "Work In Progress (WIP) Dashboard" 
    or client/project lists, IGNORE that content completely. We don't want to pick up client names from the app itself.
    Focus only on the actual work being done in other windows/applications.
    
    Consider:
    1. What application or website is being used?
    2. What type of work is being done?
    3. Who is the client being worked for? (If unclear, use "Unknown")
    4. What project or task is being worked on?
    5. What specific activities can be observed?
    
    Current known tasks:
    ${currentTasks.map(task => `- ${task.client} / ${task.project}: ${task.description}`).join('\n')}
    
    Respond in JSON format:
    {
      "client_name": "string (use 'Unknown' if unclear)",
      "project_name": "string",
      "activity_description": "string (use bullet format, e.g., '• reviewing tax docs • updating client info')",
      "detailed_description": "string (use full sentences for daily activity log, avoid using 'the user')",
      "confidence_score": number (0-1)
    }

    Example response:
    {
      "client_name": "John Smith",
      "project_name": "Tax Preparation",
      "activity_description": "• reviewing 1099 forms • calculating deductions",
      "detailed_description": "Reviewing 1099 tax forms for John Smith and calculating potential deductions for the tax return.",
      "confidence_score": 0.9
    }
    `;

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
"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { WIPEntry } from "@/src/types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing from environment variables");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export interface Activity {
  client_name: string;
  project_name: string;
  activity_description: string;
  time_percentage: number;
  confidence_score: number;
}

export interface ScreenAnalysis {
  activities?: Activity[];
  client_name: string;
  project_name: string;
  activity_description: string;
  detailed_description?: string;
  confidence_score: number;
  partner?: string;
  hourlyRate?: number;
}

// Helper function to find most common variant in a list
function findMostCommonVariant(variants: string[]): string {
  const counts = variants.reduce((acc, variant) => {
    acc[variant] = (acc[variant] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([variant]) => variant)[0];
}

// Helper function to generate a unique ID
function generateUniqueId(): number {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

export async function analyzeScreenshots(screenshots: string[], currentTasks: WIPEntry[] = []): Promise<ScreenAnalysis> {
  if (!Array.isArray(screenshots) || screenshots.length === 0) {
    throw new Error('No screenshots received');
  }

  // Validate screenshot format
  for (const screenshot of screenshots) {
    if (!screenshot.startsWith('data:image/') || !screenshot.includes('base64,')) {
      throw new Error('Invalid screenshot format');
    }
  }

  try {
    console.log(`📸 Analyzing batch of ${screenshots.length} screenshots...`);
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Group existing entries by client and project
    const existingPairs = currentTasks.reduce((acc, task) => {
      acc[task.client_name] = acc[task.client_name] || new Set();
      acc[task.client_name].add(task.project_name || '');
      return acc;
    }, {} as Record<string, Set<string>>);

    const existingContext = Object.entries(existingPairs)
      .map(([client, projects]) => 
        `Client: "${client}" with projects: ${Array.from(projects).map(p => `"${p}"`).join(', ')}`
      ).join('\n');

    const currentTasksContext = currentTasks.map(task => 
      `- Client: "${task.client}", Project: "${task.project}", Description: "${task.description}"`
    ).join('\n');

    const prompt = `I'm showing you ${screenshots.length} screenshots taken over one minute of work.
    
    Current ongoing tasks:
    ${currentTasksContext || "No current tasks."}

    Existing client/project pairs in the database:
    ${existingContext || "No existing entries."}

    Your task is to analyze these screenshots and determine what work is being done and for which client.
    
    Guidelines for client identification:
    1. Look for explicit client information in:
       - Document titles (e.g., "Tax Return - Johnson LLC")
       - File names containing client references
       - Text with "Client:" or "Customer:" prefixes
       - Business names or individual names in content
       - Email addresses or correspondence
    
    2. Client name rules:
       - Use "Unknown" if no clear client is identified
       - Never use application names (VSCode, Chrome, etc.) as clients
       - Client can be a business or individual name
       - Look for context clues in the work being done
       - Prefer existing client names from the database if work is related
    
    3. Confidence scoring for client identification:
       - 1.0: Explicit client name in document title or content
       - 0.9: Clear client reference in work context
       - 0.8: Strong inference from content/correspondence
       - 0.7: Reasonable guess from work context
       - 0.6 or less: Use "Unknown"
    
    4. For the activity description:
       Daily Report (detailed):
       - Include all observed activities and context
       - Note specific files being edited
       - Include relevant UI interactions
       - Mention console logs or debugging activities
       - Keep all technical details
       - Avoid using phrases like "the user is" or "they are"
       
       WIP Dashboard (concise):
       - Provide a brief 1-2 sentence summary
       - Focus on the main task or goal
       - Use bullet points for multiple activities
       - Omit repetitive information
       - Write in active voice without subject
    
    Return the information in this JSON format:
    {
      "client_name": "string, // Use 'Unknown' if not confident",
      "project_name": "string, // Describe the activity/project",
      "activity_description": "string, // Brief bullet points for WIP dashboard",
      "detailed_description": "string, // Detailed description for daily report",
      "confidence_score": number, // Between 0.4 and 1.0
      "client_detection_notes": "string, // Explain why this client was identified"
    }`;

    // Create array of image parts for the model
    const imageParts = screenshots.map(screenshot => ({
      inlineData: {
        mimeType: "image/jpeg",
        data: screenshot.split(',')[1]
      }
    }));

    const result = await model.generateContent([prompt, ...imageParts]);
    console.log('🤖 Received response from Gemini');
    const response = await result.response;
    const text = response.text();
    console.log('📝 Raw response:', text);

    // Try to extract JSON from the response
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/{[\s\S]*}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    console.log('🔍 Extracted JSON:', jsonStr);
    
    const analysis = JSON.parse(jsonStr.trim());
    console.log('✅ Analysis complete:', analysis);

    // If similar clients/projects were found, use the most common variant
    const clientName = analysis.similar_clients?.length > 0 
      ? findMostCommonVariant(analysis.similar_clients)
      : analysis.client_name;

    const projectName = analysis.similar_projects?.length > 0
      ? findMostCommonVariant(analysis.similar_projects)
      : analysis.project_name;

    return {
      client_name: analysis.confidence_score >= 0.7 ? clientName : "Unknown",
      project_name: projectName,
      activity_description: analysis.activity_description || '',
      detailed_description: analysis.detailed_description || analysis.activity_description || '',
      confidence_score: analysis.confidence_score,
      partner: '', // Default partner field
      hourlyRate: 0 // Default hourly rate field
    };
  } catch (error) {
    console.error('❌ Failed to analyze screenshots:', error);
    throw error; // Re-throw the error instead of returning fallback values
  }
} 
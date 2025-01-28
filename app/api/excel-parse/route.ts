import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Helper function to clean Gemini's response and extract JSON
function extractJSON(text: string): any {
  // Remove markdown code blocks if present
  const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    console.error('Failed to parse JSON:', cleanText);
    throw new Error('Invalid JSON response from AI');
  }
}

// Convert Excel serial date to ISO string
function excelDateToISO(serial: number): string {
  // Excel's epoch starts at January 0, 1900
  const epoch = new Date(1900, 0, 0);
  const offsetDays = serial - 1; // Subtract 1 because Excel counts from 1/1/1900
  const offsetMilliseconds = offsetDays * 24 * 60 * 60 * 1000;
  const date = new Date(epoch.getTime() + offsetMilliseconds);
  return date.toISOString().split('T')[0]; // Return just the date part
}

// Validate transformed entries
function validateEntries(entries: any[]): boolean {
  if (!Array.isArray(entries) || entries.length === 0) {
    console.error("No valid entries found");
    return false;
  }

  return entries.every(entry => {
    const valid = 
      typeof entry.client === 'string' &&
      typeof entry.project === 'string' &&
      typeof entry.description === 'string' &&
      typeof entry.timeInMinutes === 'number' &&
      typeof entry.amount === 'number';

    if (!valid) {
      console.error("Invalid entry:", entry);
    }
    return valid;
  });
}

export async function POST(request: Request) {
  try {
    const jsonData = await request.json();

    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      return NextResponse.json(
        { error: "No data found in Excel file" },
        { status: 400 }
      );
    }

    console.log("Raw Excel data:", jsonData);

    // First row is usually headers - send to Gemini to understand the structure
    const headers = Object.keys(jsonData[0]);
    console.log("Found headers:", headers);
    
    const prompt = `You are an expert at analyzing accounting WIP (Work in Progress) spreadsheet data.
Your task is to identify which columns in the spreadsheet correspond to our required fields.

IMPORTANT: 
1. For client name, look for the actual business name, not just an ID number
2. For project type, use the work/service type (e.g. TAX PREPARATION, TAX REVIEW)
3. Return COLUMN NAMES only, not data values!

The spreadsheet has these columns:
${headers.join('\n')}

First row (header row) data:
${JSON.stringify(jsonData[0], null, 2)}

Sample data rows (for context):
${JSON.stringify(jsonData.slice(1, 3), null, 2)}

Your task:
1. Analyze the column structure
2. Map our required fields to the COLUMN NAMES (not values) from the spreadsheet:
   - client: Column containing client name (prefer Service1 over Client ID if available)
   - project: Column containing work type/service (prefer WorkItemDesc over generic project names)
   - description: Column containing detailed work description/comments
   - timeInMinutes: Column containing time/hours worked
   - amount: Column containing cost/amount/value
   - hourlyRate: Column containing rate per hour (if exists)
   - date: Column containing work date

3. Return a JSON mapping of COLUMN NAMES (not values).
If a field has no corresponding column, map it to null.

Example response format:
{
  "mappings": {
    "client": "Service1",  // Example using actual column name
    "project": "WorkItemDesc",  // Example using actual column name
    "description": "Timesheet Comments",  // Example using actual column name
    "timeInMinutes": "Worked Hours",  // Example using actual column name
    "amount": "Worked value",  // Example using actual column name
    "hourlyRate": null,  // No column found
    "date": "Date Worked"  // Example using actual column name
  },
  "confidence": "high|medium|low"
}`;

    // Get Gemini's understanding of the column structure
    const result = await model.generateContent(prompt);
    const mappingResponse = result.response.text();
    console.log("Gemini mapping response:", mappingResponse);
    const { mappings, confidence } = extractJSON(mappingResponse);

    if (confidence === "low") {
      console.warn("Low confidence in column mapping");
    }

    // Now use these mappings to transform the data
    const transformPrompt = `You are an expert at processing accounting WIP (Work in Progress) data.
Using these column mappings:
${JSON.stringify(mappings, null, 2)}

Transform this spreadsheet data:
${JSON.stringify(jsonData, null, 2)}

Rules:
1. Skip any summary/header/total rows (look for keywords like "Total", "Summary", etc.)
2. Convert any time values to minutes (multiply hours by 60)
3. Calculate hourly rate if missing (amount / hours)
4. Skip rows with missing critical data (client, description, time, or amount)
5. Format dates as Excel serial numbers (we'll convert them later)
6. Clean up text fields (trim whitespace, remove special characters)
7. Use the actual business name for client (from Service1 column), not just the ID
8. Group by work type/service (from WorkItemDesc) as the project
9. Ensure all numeric values are valid numbers
10. Format project names with first letter of each word capitalized (e.g. "Tax Preparation")
11. Capitalize the first letter of each sentence in descriptions

Return a JSON array (not an object) with this structure:
[
  {
    "client": string, // Use business name (e.g. "101 Studios")
    "project": string, // Use work type with capitalized words (e.g. "Tax Preparation")
    "description": string, // Each sentence should start with a capital letter
    "timeInMinutes": number,
    "amount": number,
    "hourlyRate": number,
    "date": string (Excel serial number)
  },
  // ... more entries
]

Return ONLY the JSON array, no markdown formatting or other text.`;

    const transformResult = await model.generateContent(transformPrompt);
    const transformResponse = transformResult.response.text();
    console.log("Gemini transform response:", transformResponse);
    let entries = extractJSON(transformResponse);

    // Convert Excel dates to ISO strings
    entries = entries.map((entry: any) => ({
      ...entry,
      date: entry.date ? excelDateToISO(parseInt(entry.date)) : null
    }));

    // Validate the transformed data
    if (!validateEntries(entries)) {
      return NextResponse.json(
        { error: "No valid entries found in the file. Please check the file format." },
        { status: 400 }
      );
    }

    // Return array format
    return NextResponse.json(entries);

  } catch (error: any) {
    console.error("Error processing Excel data:", error);
    return NextResponse.json(
      { 
        error: "Failed to process Excel file. Please ensure it contains valid data.",
        details: error.message 
      },
      { status: 400 }
    );
  }
} 
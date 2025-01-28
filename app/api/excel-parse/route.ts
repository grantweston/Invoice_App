import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

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

  console.log("Validating entries:", JSON.stringify(entries, null, 2));

  // Add more detailed validation
  return entries.every((entry, index) => {
    console.log(`\nValidating entry ${index}:`, entry);

    if (!entry) {
      console.error(`Entry ${index} is null or undefined`);
      return false;
    }

    // Log all field types
    console.log("Field types for entry", index, ":");
    console.log("client:", typeof entry.client, "value:", entry.client);
    console.log("project:", typeof entry.project, "value:", entry.project);
    console.log("description:", typeof entry.description, "value:", entry.description);
    console.log("timeInMinutes:", typeof entry.timeInMinutes, "value:", entry.timeInMinutes);
    console.log("amount:", typeof entry.amount, "value:", entry.amount);
    console.log("hourlyRate:", typeof entry.hourlyRate, "value:", entry.hourlyRate);

    // Check required fields exist and have correct types
    const validTypes = 
      typeof entry.client === 'string' && entry.client.trim() !== '' &&
      typeof entry.project === 'string' && entry.project.trim() !== '' &&
      typeof entry.description === 'string' && entry.description.trim() !== '';

    if (!validTypes) {
      console.error(`Entry ${index} has invalid text fields:`, {
        client: typeof entry.client === 'string' ? entry.client : 'INVALID',
        project: typeof entry.project === 'string' ? entry.project : 'INVALID',
        description: typeof entry.description === 'string' ? entry.description : 'INVALID'
      });
      return false;
    }

    // Handle numeric fields
    let timeInMinutes = 0;
    let amount = 0;

    // Convert and validate timeInMinutes
    if (typeof entry.timeInMinutes === 'string') {
      timeInMinutes = parseFloat(entry.timeInMinutes);
      console.log(`Converting timeInMinutes from string to number: ${entry.timeInMinutes} -> ${timeInMinutes}`);
    } else if (typeof entry.timeInMinutes === 'number') {
      timeInMinutes = entry.timeInMinutes;
      console.log(`timeInMinutes is already a number: ${timeInMinutes}`);
    }

    // Convert and validate amount
    if (typeof entry.amount === 'string') {
      amount = parseFloat(entry.amount);
      console.log(`Converting amount from string to number: ${entry.amount} -> ${amount}`);
    } else if (typeof entry.amount === 'number') {
      amount = entry.amount;
      console.log(`amount is already a number: ${amount}`);
    }

    if (isNaN(timeInMinutes) || timeInMinutes <= 0) {
      console.error(`Entry ${index} has invalid timeInMinutes:`, timeInMinutes);
      return false;
    }

    if (isNaN(amount) || amount <= 0) {
      console.error(`Entry ${index} has invalid amount:`, amount);
      return false;
    }

    // Update the entry with converted numeric values
    entry.timeInMinutes = timeInMinutes;
    entry.amount = amount;

    // Calculate hourlyRate if missing
    if (!entry.hourlyRate || isNaN(entry.hourlyRate)) {
      entry.hourlyRate = (amount / (timeInMinutes / 60));
      console.log(`Calculated hourlyRate for entry ${index}:`, entry.hourlyRate);
    }

    console.log(`Entry ${index} validation successful`);
    return true;
  });
}

// Utility to split an array into chunks
function chunkData<T>(data: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < data.length; i += size) {
    chunks.push(data.slice(i, i + size))
  }
  return chunks
}

export async function POST(request: Request) {
  try {
    const jsonData = await request.json();

    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      console.error("Invalid or empty data received:", jsonData);
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

    try {
      // Get Gemini's understanding of the column structure
      const result = await model.generateContent(prompt);
      const mappingResponse = result.response.text();
      console.log("Gemini mapping response:", mappingResponse);
      const { mappings, confidence } = extractJSON(mappingResponse);

      if (!mappings || typeof mappings !== 'object') {
        throw new Error('Invalid column mappings received from AI');
      }

      if (confidence === "low") {
        console.warn("Low confidence in column mapping");
      }

      // Transform the data
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
      console.log("\nRaw Gemini transform response:", transformResponse);
      
      let entries;
      try {
        entries = extractJSON(transformResponse);
        console.log("\nParsed entries:", JSON.stringify(entries, null, 2));
      } catch (parseError) {
        console.error("Failed to parse Gemini response:", parseError);
        console.error("Raw response was:", transformResponse);
        throw new Error('Failed to parse AI response into valid JSON');
      }

      if (!Array.isArray(entries)) {
        console.error("Entries is not an array:", entries);
        throw new Error('Invalid entries format received from AI');
      }

      // Convert Excel dates to ISO strings
      try {
        entries = entries.map((entry: any, index: number) => {
          console.log(`\nProcessing entry ${index} date:`, entry.date);
          return {
            ...entry,
            date: entry.date ? excelDateToISO(parseInt(entry.date)) : null
          };
        });
      } catch (dateError) {
        console.error("Error converting dates:", dateError);
        throw new Error('Failed to convert Excel dates');
      }

    // Validate the transformed data
    if (!validateEntries(entries)) {
      console.error("\nValidation failed. Final entries state:", JSON.stringify(entries, null, 2));
      return NextResponse.json(
        { 
          error: "Invalid data format in Excel file. Please ensure all required fields (client, project, description, time, amount) are present and valid.",
          details: "Data validation failed"
        },
        { status: 400 }
      );
    }

    // Return array format
    return NextResponse.json(entries);

    } catch (aiError: any) {
      console.error("AI processing error:", aiError);
      return NextResponse.json(
        { 
          error: "Failed to process Excel data structure. Please ensure your Excel file follows the expected format.",
          details: aiError.message 
        },
        { status: 400 }
      );
    }

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
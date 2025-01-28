import { GoogleGenerativeAI } from "@google/generative-ai";
import { WIPEntry } from "@/src/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export interface ParsedWIPData {
  entries: WIPEntry[];
  totalHours: number;
  totalAmount: number;
}

export async function parseExcelData(jsonData: any[]): Promise<ParsedWIPData> {
  if (!Array.isArray(jsonData) || jsonData.length === 0) {
    throw new Error("No data found in Excel file");
  }

  console.log("Raw Excel data:", jsonData);

  // First row is usually headers - send to Gemini to understand the structure
  const headers = Object.keys(jsonData[0]);
  console.log("Found headers:", headers);
  
  const prompt = `You are an expert at analyzing accounting WIP (Work in Progress) spreadsheet data.
Your task is to intelligently map columns from an Excel spreadsheet to our required fields, even if the column names are different or unclear.

The spreadsheet has these columns:
${headers.join('\n')}

Here's a sample of the data (first 3 rows):
${JSON.stringify(jsonData.slice(0, 3), null, 2)}

Your task:
1. Analyze the column structure
2. Look for these fields (be flexible with naming):
   - client: Look for client name/ID/code (e.g. "Client", "Customer", "Client ID", etc.)
   - project: Look for project name/ID/code/description
   - description: Look for work description, comments, notes, activity
   - timeInMinutes: Look for time/hours/duration (will convert to minutes)
   - amount: Look for cost, amount, value, price
   - hourlyRate: Look for rate, price per hour (or calculate from amount/hours)
   - date: Look for any date field (work date, entry date, etc.)

3. Return a JSON mapping of which columns correspond to our required fields.
If you can't find an exact match, use the closest appropriate column.
If a field is truly not available, map it to null.

Example response format:
{
  "mappings": {
    "client": "Client Name Column or null",
    "project": "Project Column or null",
    "description": "Work Description Column or null",
    "timeInMinutes": "Hours Column (will convert) or null",
    "amount": "Amount Column or null",
    "hourlyRate": "Rate Column or null",
    "date": "Date Column or null"
  },
  "confidence": "high|medium|low"
}

Only return the JSON mapping, no other text.`;

  try {
    // Get Gemini's understanding of the column structure
    const result = await model.generateContent(prompt);
    const mappingResponse = result.response.text();
    console.log("Gemini mapping response:", mappingResponse);
    const { mappings, confidence } = JSON.parse(mappingResponse);

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
5. Format dates as ISO strings (YYYY-MM-DD)
6. Clean up text fields (trim whitespace, remove special characters)
7. Ensure all numeric values are valid numbers
8. If you can't process a row, skip it but continue with others

Return a JSON object with this structure:
{
  "entries": [
    {
      "client": string,
      "project": string,
      "description": string,
      "timeInMinutes": number,
      "amount": number,
      "hourlyRate": number,
      "date": string (optional)
    }
  ],
  "totalHours": number (sum of all hours),
  "totalAmount": number (sum of all amounts),
  "skippedRows": number (count of rows skipped),
  "processingNotes": string[] (any important notes about the processing)
}

Only return the JSON, no other text.`;

    const transformResult = await model.generateContent(transformPrompt);
    const transformResponse = transformResult.response.text();
    console.log("Gemini transform response:", transformResponse);
    const transformedData = JSON.parse(transformResponse);

    if (transformedData.skippedRows > 0) {
      console.warn(`Skipped ${transformedData.skippedRows} rows during processing`);
    }

    if (transformedData.processingNotes?.length > 0) {
      console.log("Processing notes:", transformedData.processingNotes);
    }

    // Validate the transformed data
    if (!transformedData.entries || transformedData.entries.length === 0) {
      throw new Error("No valid entries found in the Excel file");
    }

    return {
      entries: transformedData.entries,
      totalHours: transformedData.totalHours,
      totalAmount: transformedData.totalAmount
    };
  } catch (error) {
    console.error("Error processing Excel data:", error);
    throw new Error("Failed to process Excel file. Please ensure it contains valid WIP data with client, work description, hours, and amounts.");
  }
} 
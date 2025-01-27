import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function formatDateRange(entries: any[]) {
  const dates = entries
    .map(e => e['Date Worked'] || e.Worked)
    .filter(Boolean)
    .map(d => new Date(d));
  
  if (dates.length === 0) return '';
  
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
  
  return `${minDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} to ${maxDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
}

const analyzeWIPData = (data: any[]) => {
  console.log('\nStarting WIP data analysis');
  
  // Skip header row and summary rows, but include all valid entries
  const entries = data.filter(row => {
    // Skip if no client ID or if it's a header/summary row
    if (!row['<-- Go back to Summary'] || 
        row['<-- Go back to Summary'] === 'Client ID' ||
        row['<-- Go back to Summary'] === 'Total by WorkPackage ID' ||
        row['<-- Go back to Summary'] === 'Total by Project' ||
        row['<-- Go back to Summary'] === 'Total by WorkPackage') {
      return false;
    }
    
    // Must have valid amount and hours and be a numeric client ID
    const amount = parseFloat(row.__EMPTY_10);
    const hours = parseFloat(row.__EMPTY_9);
    const clientId = row['<-- Go back to Summary'];
    return !isNaN(amount) && !isNaN(hours) && !isNaN(parseInt(clientId));
  });
  
  console.log('\nValid entries found:', entries.length);
  
  // Group by client
  const clientData: Record<string, any> = {};
  
  let totalHoursCheck = 0;
  let totalAmountCheck = 0;
  
  entries.forEach((entry, index) => {
    const clientId = entry.__EMPTY_1;
    const serviceType = entry.__EMPTY_7;
    const amount = parseFloat(entry.__EMPTY_10) || 0;
    const hours = parseFloat(entry.__EMPTY_9) || 0;
    const description = entry.__EMPTY_8;
    
    console.log(`\nProcessing entry ${index + 1}:`);
    console.log('Client:', clientId);
    console.log('Service:', serviceType);
    console.log('Description:', description);
    console.log('Hours:', hours);
    console.log('Amount:', amount);
    
    totalHoursCheck += hours;
    totalAmountCheck += amount;
    
    if (!clientData[clientId]) {
      console.log('Creating new client record');
      clientData[clientId] = {
        dateRange: formatDateRange(entries),
        projects: {},
        totalAmount: 0,
        totalHours: 0
      };
    }
    
    if (!clientData[clientId].projects[serviceType]) {
      console.log('Creating new service type record');
      clientData[clientId].projects[serviceType] = {
        entries: [],
        totalAmount: 0,
        totalHours: 0,
        description: []
      };
    }
    
    // Add entry with exact hours and amount from Excel
    const entryData = {
      description,
      amount,
      timeInMinutes: Math.round(hours * 60), // Convert hours to minutes
      comments: description
    };
    
    // Add to project totals
    clientData[clientId].projects[serviceType].entries.push(entryData);
    clientData[clientId].projects[serviceType].totalAmount += amount;
    clientData[clientId].projects[serviceType].totalHours += hours;
    
    // Add to client totals
    clientData[clientId].totalAmount += amount;
    clientData[clientId].totalHours += hours;
    
    console.log('Updated service totals:', {
      hours: clientData[clientId].projects[serviceType].totalHours,
      amount: clientData[clientId].projects[serviceType].totalAmount
    });
    
    console.log('Updated client totals:', {
      hours: clientData[clientId].totalHours,
      amount: clientData[clientId].totalAmount
    });
  });
  
  console.log('\nFinal verification:');
  console.log('Total hours from all entries:', totalHoursCheck);
  console.log('Total amount from all entries:', totalAmountCheck);
  
  return clientData;
};

export async function POST(request: Request) {
  try {
    const { wipData } = await request.json();
    console.log('Received WIP data:', JSON.stringify(wipData, null, 2));

    if (!Array.isArray(wipData)) {
      console.error('Invalid WIP data format - not an array:', typeof wipData);
      return NextResponse.json({ error: 'Invalid WIP data format - expected an array' }, { status: 400 });
    }

    if (wipData.length === 0) {
      console.error('Empty WIP data array');
      return NextResponse.json({ error: 'No WIP data found in file' }, { status: 400 });
    }

    // Use Gemini to analyze the raw Excel data
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-thinking-exp" });

    const prompt = `You are an expert at analyzing accounting WIP (Work in Progress) data from Excel spreadsheets.
    
    Here is the raw Excel data in JSON format:
    ${JSON.stringify(wipData, null, 2)}

    Your task is to analyze this data and extract:
    1. Client information
    2. Service types/categories
    3. Individual tasks with their hours and amounts
    4. Date ranges of work performed

    Look for columns that might contain:
    - Client identifiers or names
    - Service types or categories
    - Task descriptions or comments
    - Hours worked
    - Monetary amounts
    - Dates
    - Employee information

    Return the data in this structure:
    {
      "[Client Identifier]": {
        "dateRange": "Date range of work (if found)",
        "projects": {
          "[Service Type/Category]": {
            "description": "Brief description of what this service type involves",
            "totalHours": [Sum of hours],
            "totalAmount": [Sum of amount],
            "subtasks": [
              {
                "description": "Task description",
                "hours": "Hours spent",
                "amount": "Amount charged"
              }
            ]
          }
        },
        "totalAmount": [Total of all amounts],
        "totalHours": [Total of all hours]
      }
    }

    Guidelines:
    1. Identify and skip any header or summary rows
    2. Look for patterns in the data to identify the key information
    3. Group similar services together
    4. Use exact values for hours and amounts when found
    5. Calculate accurate totals
    6. If dates are found, format them into a readable range

    If certain information is not found in the data:
    - Use "Unknown" for missing client identifiers
    - Use "General Services" for missing service types
    - Use "Unspecified" for missing descriptions
    - Use the filename or sheet name for context if helpful
    - Preserve any numerical values exactly as found`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      // Parse Gemini's response
      console.log('\n🔍 Parsing Gemini response...');
      
      // Strip markdown code blocks if present
      const cleanedText = text.replace(/^```(?:json)?\n|\n```$/g, '').trim();
      console.log('Cleaned response:', cleanedText);
      
      const analyzedData = JSON.parse(cleanedText);
      console.log('✅ Successfully parsed Gemini response');
      
      return NextResponse.json({
        success: true,
        data: analyzedData
      });
    } catch (parseError) {
      console.error('\n❌ Failed to parse Gemini response:', parseError);
      console.log('Raw response:', text);
      return NextResponse.json(
        { error: 'Failed to analyze WIP data' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error analyzing WIP data:', error);
    return NextResponse.json(
      { error: 'Failed to analyze WIP data' },
      { status: 500 }
    );
  }
} 
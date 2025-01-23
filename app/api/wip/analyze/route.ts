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

    // Log the structure of the first row to help debug
    console.log('First row structure:', JSON.stringify(wipData[0], null, 2));

    // First analyze the data ourselves to get exact totals
    try {
      const rawAnalysis = analyzeWIPData(wipData);
      
      if (!rawAnalysis || Object.keys(rawAnalysis).length === 0) {
        console.error('No valid entries found in WIP data');
        return NextResponse.json({ error: 'No valid entries found in WIP data' }, { status: 400 });
      }

      // Get the first client's data since we know it's a single client
      const clientKey = Object.keys(rawAnalysis)[0];
      const clientData = rawAnalysis[clientKey];

      if (!clientData) {
        console.error('No client data found after analysis');
        return NextResponse.json({ error: 'Failed to analyze client data' }, { status: 400 });
      }

      // Use Gemini to enhance the descriptions
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const prompt = `You are an expert at analyzing accounting WIP (Work in Progress) data and generating detailed, professional invoice descriptions.

      CRITICAL: You MUST preserve EVERY SINGLE task with its EXACT hours and amount. No tasks can be combined or omitted.

      I have already calculated the exact totals that MUST be preserved:
      Total Hours: ${clientData.totalHours} (MUST match exactly)
      Total Amount: $${clientData.totalAmount} (MUST match exactly)

      Here are the exact entries that must ALL be accounted for:
      ${Object.entries(clientData.projects).map(([service, data]: [string, any]) => {
        const entries = data.entries.map((e: any) => 
          `* ${e.description} (${e.timeInMinutes/60} hours, $${e.amount})`
        ).join('\n');
        
        return `${service}:
         - Total Hours: ${data.totalHours} (MUST match exactly)
         - Total Amount: $${data.totalAmount} (MUST match exactly)
         - Individual Entries:\n${entries}`;
      }).join('\n\n')}

      Please create a professional invoice description by logically grouping these tasks while preserving EXACT hours.
      The work was performed during: ${clientData.dateRange}

      CRITICAL REQUIREMENTS:
      1. EVERY SINGLE TASK must be preserved with its EXACT hours and amount - no combining or rounding
      2. Group similar tasks together (e.g., all bank reconciliations under one heading)
      3. Show subtotals for each group that match the sum of their tasks EXACTLY
      4. Total hours must equal exactly ${clientData.totalHours}
      5. Each task can only appear once
      6. No tasks can be omitted

      Format the response as follows:
      {
        "${clientKey}": {
          "dateRange": "${clientData.dateRange}",
          "projects": {
            "[Main Category Name]": {
              "description": "Overall category description",
              "totalHours": number (MUST match sum of entries exactly),
              "totalAmount": number (MUST match sum of entries exactly),
              "subtasks": [
                {
                  "description": "Individual task from original data",
                  "hours": number (MUST match original exactly),
                  "amount": number (MUST match original exactly)
                }
              ]
            }
          },
          "totalAmount": ${clientData.totalAmount},
          "totalHours": ${clientData.totalHours}
        }
      }

      Example response:
      {
        "1012658-TAX": {
          "projects": {
            "Monthly Bookkeeping & Reconciliation": {
              "description": "Monthly bookkeeping and reconciliation tasks...",
              "totalHours": 3.8,
              "totalAmount": 1500,
              "subtasks": [
                {
                  "description": "Bank reconciliation for March",
                  "hours": 1.2,
                  "amount": 400
                },
                {
                  "description": "Monthly bookkeeping review",
                  "hours": 0.5,
                  "amount": 200
                }
              ]
            }
          }
        }
      }

      VALIDATION REQUIREMENTS:
      1. Each original task must appear exactly once with its exact hours and amount
      2. No rounding or adjusting of hours/amounts is allowed
      3. No combining of similar tasks - each must be preserved separately
      4. Group totals must sum to ${clientData.totalHours} exactly
      5. All amounts must match exactly
      6. Every single task from the original data must be included`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      try {
        // Parse Gemini's response
        console.log('\n🔍 Parsing Gemini response...');
        
        // Strip markdown code blocks if present
        const cleanedText = text.replace(/^```(?:json)?\n|\n```$/g, '').trim();
        console.log('Cleaned response:', cleanedText);
        
        const enhancedData = JSON.parse(cleanedText);
        console.log('✅ Successfully parsed Gemini response');
        
        // Validate that Gemini preserved our exact numbers
        console.log('\n🔍 Starting validation...');
        const originalData = rawAnalysis[clientKey];
        
        // Track all original tasks to ensure none are missed
        console.log('\n📋 Original tasks:');
        const originalTasks = new Set();
        Object.entries(originalData.projects).forEach(([service, data]: [string, any]) => {
          console.log(`\nService: ${service}`);
          data.entries.forEach((entry: any) => {
            const taskKey = `${entry.description}|${entry.timeInMinutes/60}|${entry.amount}`;
            console.log(`Task: ${taskKey}`);
            originalTasks.add(taskKey);
          });
        });
        
        // Validate all tasks are included and hours match
        console.log('\n🔍 Validating Gemini response...');
        let totalHours = 0;
        let totalAmount = 0;
        let allTasksFound = true;
        
        Object.entries(enhancedData[clientKey].projects).forEach(([category, data]: [string, any]) => {
          console.log(`\nChecking category: ${category}`);
          let categoryHours = 0;
          let categoryAmount = 0;
          
          if (!data.subtasks) {
            console.error(`❌ No subtasks found for category: ${category}`);
            allTasksFound = false;
            return;
          }
          
          data.subtasks.forEach((task: any) => {
            categoryHours += task.hours;
            categoryAmount += task.amount;
            const taskKey = `${task.description}|${task.hours}|${task.amount}`;
            console.log(`\nChecking task: ${taskKey}`);
            
            if (originalTasks.has(taskKey)) {
              console.log('✅ Task found in original data');
              originalTasks.delete(taskKey);
            } else {
              console.error('❌ Task not found in original data or has incorrect hours/amount');
              allTasksFound = false;
            }
          });
          
          // Validate category totals
          console.log(`\nCategory totals - Hours: ${categoryHours}, Amount: ${categoryAmount}`);
          console.log(`Expected totals - Hours: ${data.totalHours}, Amount: ${data.totalAmount}`);
          
          if (Math.abs(categoryHours - data.totalHours) > 0.01 ||
              Math.abs(categoryAmount - data.totalAmount) > 0.01) {
            console.error('❌ Category totals do not match');
            allTasksFound = false;
          }
          
          totalHours += categoryHours;
          totalAmount += categoryAmount;
        });
        
        // Check for any remaining original tasks
        if (originalTasks.size > 0) {
          console.error('\n❌ Some original tasks were not included:');
          originalTasks.forEach(task => console.error(task));
        }
        
        console.log('\n📊 Final totals:');
        console.log(`Hours - Got: ${totalHours}, Expected: ${originalData.totalHours}`);
        console.log(`Amount - Got: ${totalAmount}, Expected: ${originalData.totalAmount}`);
        
        // Validate all tasks were found and totals match
        if (!allTasksFound || 
            originalTasks.size > 0 ||
            Math.abs(totalHours - originalData.totalHours) > 0.01 ||
            Math.abs(totalAmount - originalData.totalAmount) > 0.01) {
          console.error('\n❌ Validation failed - falling back to raw analysis');
          console.error('Reasons:');
          if (!allTasksFound) console.error('- Some tasks were not found or had incorrect values');
          if (originalTasks.size > 0) console.error('- Some original tasks were missing');
          if (Math.abs(totalHours - originalData.totalHours) > 0.01) console.error('- Total hours mismatch');
          if (Math.abs(totalAmount - originalData.totalAmount) > 0.01) console.error('- Total amount mismatch');
          
          return NextResponse.json({
            success: true,
            data: rawAnalysis
          });
        }
        
        console.log('\n✅ Validation passed - using enhanced data');
        return NextResponse.json({
          success: true,
          data: enhancedData
        });
      } catch (parseError) {
        console.error('\n❌ Failed to parse Gemini response:', parseError);
        console.log('Raw response:', text);
        return NextResponse.json({
          success: true,
          data: rawAnalysis
        });
      }
    } catch (error) {
      console.error('Error analyzing WIP data:', error);
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
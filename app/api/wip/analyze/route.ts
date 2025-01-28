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

// Helper function to capitalize first letter of each sentence
function capitalizeSentences(text: string): string {
  return text.split('. ').map(sentence => {
    const trimmed = sentence.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }).join('. ');
}

// Helper function to capitalize first letter of each word
function capitalizeWords(str: string): string {
  return str.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

const analyzeWIPData = (data: any[]) => {
  console.log('\nStarting WIP data analysis');
  
  // Filter out any invalid entries
  const entries = data.filter(row => {
    // Must have valid amount, time, and client
    const amount = parseFloat(row.amount);
    const timeInMinutes = parseFloat(row.timeInMinutes);
    const clientId = row.client;
    return !isNaN(amount) && !isNaN(timeInMinutes) && clientId;
  });
  
  console.log('\nValid entries found:', entries.length);
  
  // Group by client
  const clientData: Record<string, any> = {};
  
  let totalHoursCheck = 0;
  let totalAmountCheck = 0;
  
  entries.forEach((entry, index) => {
    const clientId = entry.client;
    // Capitalize first letter of each word in project name
    const serviceType = capitalizeWords(entry.project);
    const amount = parseFloat(entry.amount) || 0;
    const hours = entry.timeInMinutes / 60;
    const description = entry.description;
    
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
    
    // Add entry with exact hours and amount
    const entryData = {
      description,
      amount,
      timeInMinutes: entry.timeInMinutes,
      comments: description,
      date: entry.date
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
    const data = await request.json();
    console.log('Received WIP data:', JSON.stringify(data, null, 2));

    if (!Array.isArray(data)) {
      console.error('Invalid WIP data format - not an array:', typeof data);
      return NextResponse.json({ error: 'Invalid WIP data format - expected an array' }, { status: 400 });
    }

    if (data.length === 0) {
      console.error('Empty WIP data array');
      return NextResponse.json({ error: 'No WIP data found in file' }, { status: 400 });
    }

    // Log the structure of the first row to help debug
    console.log('First row structure:', JSON.stringify(data[0], null, 2));

    // First analyze the data ourselves to get exact totals
    try {
      const rawAnalysis = analyzeWIPData(data);
      
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

      // Convert the data structure to an array of entries
      const entries = [];
      Object.entries(clientData.projects).forEach(([serviceType, data]: [string, any]) => {
        if (data.entries) {
          data.entries.forEach((entry: any) => {
            entries.push({
              client: clientKey,
              project: capitalizeWords(serviceType),
              description: capitalizeSentences(entry.description),
              timeInMinutes: entry.timeInMinutes,
              amount: entry.amount,
              hourlyRate: entry.amount / (entry.timeInMinutes / 60),
              date: entry.date || null
            });
          });
        }
      });

      return NextResponse.json({
        success: true,
        data: entries
      });
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
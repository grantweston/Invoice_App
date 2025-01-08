import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

export async function POST(request: Request) {
  try {
    const { client, entries } = await request.json();

    // Group entries by project
    const projectGroups = entries.reduce((groups: any, entry: any) => {
      if (!groups[entry.project]) {
        groups[entry.project] = [];
      }
      groups[entry.project].push(entry);
      return groups;
    }, {});

    const prompt = `You are a professional invoice writer. Create a detailed, well-organized invoice description for the following work:

CLIENT INFORMATION:
Client Name: ${client}

WORK DETAILS BY PROJECT:
${Object.entries(projectGroups).map(([project, projectEntries]: [string, any[]]) => {
  const entries = projectEntries.map(entry => `
    Task: ${entry.description}
    Time Spent: ${(entry.timeInMinutes / 60).toFixed(2)} hours
    Rate: $${entry.hourlyRate}/hour
  `).join('\n');

  return `
PROJECT: ${project}
${entries}
`;
}).join('\n')}

FINANCIAL SUMMARY:
Total Hours: ${entries.reduce((sum, entry) => sum + (entry.timeInMinutes || 0) / 60, 0).toFixed(2)}
Total Amount: $${entries.reduce((sum, entry) => sum + ((entry.timeInMinutes || 0) / 60 * entry.hourlyRate), 0).toFixed(2)}

Please create a professional invoice description that:
1. Starts with a brief executive summary of the work completed
2. Groups work by project, with clear section headers
3. For each project:
   - Provide a high-level overview of achievements and value delivered
   - List specific tasks completed with their impact
   - Include relevant technical details where appropriate
4. Use clear, professional language
5. Format the response with proper spacing and section breaks
6. End with a summary of deliverables and their business value

Format the response in a way that would be appropriate for a professional invoice, using markdown formatting.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text || text.trim() === '') {
      throw new Error('Empty response from Gemini');
    }

    return NextResponse.json({ content: text });
  } catch (error) {
    console.error('Error in Gemini API:', error);
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
} 
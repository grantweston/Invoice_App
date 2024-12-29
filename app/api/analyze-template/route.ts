import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

export async function POST(request: Request) {
  console.log('=== Template Analysis Request Started ===');
  
  try {
    const body = await request.json();
    console.log('Request body received:', {
      filename: body.filename,
      contentLength: body.content?.length || 0
    });

    if (!body.content) {
      console.error('No content provided in request');
      return NextResponse.json(
        { error: 'No content provided' },
        { status: 400 }
      );
    }

    // Convert base64 to buffer and extract text
    console.log('Converting base64 to buffer...');
    const buffer = Buffer.from(body.content, 'base64');
    console.log('Buffer created, size:', buffer.length);

    console.log('Extracting text from document...');
    const { value: templateText } = await mammoth.extractRawText({ buffer });
    console.log('Text extracted, length:', templateText.length);
    console.log('First 100 chars:', templateText.substring(0, 100));
    
    console.log('Analyzing template structure...');
    const analysisPrompt = `You are an expert at analyzing invoice templates and understanding how to map work data to them.

Here's an invoice template:
${templateText}

Analyze this template and identify:
1. All placeholders (like {placeholder}, [placeholder], etc.)
2. The structure and sections of the invoice
3. How work entries should be formatted and aggregated
4. Any special requirements or patterns

Return ONLY a raw JSON object with no markdown formatting, no backticks, and no explanation. The JSON should have this structure:
{
  "placeholders": {
    "client": ["list of client-related placeholders"],
    "project": ["list of project-related placeholders"],
    "billing": ["list of billing-related placeholders"],
    "dates": ["list of date-related placeholders"],
    "custom": ["any other placeholders"]
  },
  "structure": {
    "sections": ["list of main sections in the template"],
    "lineItemFormat": "description of how line items should be formatted",
    "aggregationRules": ["rules for combining work entries"],
    "specialRequirements": ["any special formatting or content requirements"]
  },
  "dataMapping": {
    "wipEntries": "how WIP entries should map to invoice items",
    "dailyActivities": "how daily activities should be incorporated",
    "timeFormat": "how time should be formatted",
    "amountCalculation": "how amounts should be calculated"
  }
}`;

    console.log('Sending prompt to Gemini...');
    const result = await model.generateContent(analysisPrompt);
    const analysis = result.response.text();
    console.log('Raw analysis received:', analysis);

    try {
      // Clean the response by removing any markdown formatting
      console.log('Cleaning and parsing analysis...');
      const cleanedAnalysis = analysis.replace(/^```json\s*|\s*```$/g, '').trim();
      const templateStructure = JSON.parse(cleanedAnalysis);
      
      console.log('Analysis parsed successfully:', {
        placeholderCount: Object.values(templateStructure.placeholders || {}).flat().length,
        sections: templateStructure.structure?.sections?.length || 0
      });

      console.log('=== Template Analysis Completed Successfully ===');
      return NextResponse.json(templateStructure);
    } catch (parseError) {
      console.error('Failed to parse template analysis:', parseError);
      console.error('Raw analysis that failed to parse:', analysis);
      return NextResponse.json(
        { error: 'Failed to analyze template structure' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in template analysis:', error);
    return NextResponse.json(
      { error: 'Failed to process template' },
      { status: 500 }
    );
  }
} 
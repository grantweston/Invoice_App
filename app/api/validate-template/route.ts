import { NextResponse } from 'next/server';
import { analyze } from '@/src/integrations/gemini/geminiService';
import { TemplateAnalysis } from '@/src/types';

export async function POST(request: Request) {
  try {
    const template: TemplateAnalysis = await request.json();
    
    const validationPrompt = `
      Validate this template structure for an invoice:
      ${JSON.stringify(template, null, 2)}

      Check for:
      1. Required sections (header, client info, amounts)
      2. Necessary placeholders
      3. Proper formatting elements
      4. Logical structure
      5. Spatial layout correctness
      6. Region relationships

      Return only true or false.
    `;

    const result = await analyze(validationPrompt);
    return NextResponse.json(result.trim().toLowerCase() === 'true');
  } catch (error) {
    console.error('Template validation failed:', error);
    return NextResponse.json(false);
  }
} 
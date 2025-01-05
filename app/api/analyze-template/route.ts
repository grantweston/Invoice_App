import { NextResponse } from 'next/server';
import docx4js from 'docx4js';
import { analyze } from '@/src/integrations/gemini/geminiService';

export const config = {
  api: {
    bodyParser: false
  }
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('template') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No template file provided' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Use docx4js to analyze the document structure
    const doc = await docx4js.load(buffer);
    const content = await doc.render();
    
    // Extract document structure
    const structure = {
      elements: [],
      sections: [],
      placeholders: []
    };

    // Parse content and identify elements
    content.forEach((item: any) => {
      if (typeof item === 'string') {
        // Look for placeholders like {placeholder}
        const placeholderMatches = item.match(/{([^}]+)}/g);
        if (placeholderMatches) {
          structure.placeholders.push(...placeholderMatches);
        }
      }
      structure.elements.push({
        type: typeof item === 'string' ? 'text' : 'element',
        content: typeof item === 'string' ? item : JSON.stringify(item)
      });
    });

    // Use Gemini to analyze the structure
    const analysisPrompt = `
      Analyze this document structure:
      ${JSON.stringify(structure, null, 2)}

      Identify:
      1. The purpose and type of each element
      2. How elements relate to each other
      3. The document layout and sections
      4. Special formatting or requirements

      Return a JSON object with the analysis.
    `;

    const analysisResult = await analyze(analysisPrompt);
    const analysis = {
      ...structure,
      ...JSON.parse(analysisResult)
    };
    
    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Template analysis failed:', error);
    return NextResponse.json(
      { error: 'Failed to analyze template' },
      { status: 500 }
    );
  }
} 
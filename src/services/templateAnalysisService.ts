import { GoogleGenerativeAI } from '@google/generative-ai';
import { Template } from '@/src/store/invoiceStore';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '');

export interface AnalyzedTemplate extends Template {
  content: string;
}

export async function analyzeTemplate(content: string, filename: string): Promise<AnalyzedTemplate> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Analyze this Word document template and identify all placeholders that need to be filled. 
    The placeholders are likely in formats like {{placeholder}}, {placeholder}, or [placeholder].
    Group them into these categories:
    - Client (e.g., client name, address)
    - Project (e.g., project name, description)
    - Billing (e.g., amount, rate, hours)
    - Dates (e.g., invoice date, due date)
    - Custom (any other placeholders)
    
    Return the result as a JSON object with these exact keys: client, project, billing, dates, custom.
    Each key should contain an array of placeholder strings found in that category.
    
    Template content:
    ${content}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Try to parse the JSON response
    try {
      const placeholders = JSON.parse(text);
      return {
        id: Date.now().toString(),
        name: filename,
        content,
        placeholders: {
          client: placeholders.client || [],
          project: placeholders.project || [],
          billing: placeholders.billing || [],
          dates: placeholders.dates || [],
          custom: placeholders.custom || []
        }
      };
    } catch (parseError) {
      // Fallback to regex-based extraction if JSON parsing fails
      const placeholderRegex = /{{([^}]+)}}|\{([^}]+)\}|\[([^\]]+)\]/g;
      const matches = content.matchAll(placeholderRegex);
      const allPlaceholders = Array.from(matches).map(match => match[1] || match[2] || match[3]);
      
      return {
        id: Date.now().toString(),
        name: filename,
        content,
        placeholders: {
          client: allPlaceholders.filter(p => p.toLowerCase().includes('client')),
          project: allPlaceholders.filter(p => p.toLowerCase().includes('project')),
          billing: allPlaceholders.filter(p => 
            p.toLowerCase().includes('amount') || 
            p.toLowerCase().includes('rate') || 
            p.toLowerCase().includes('total')
          ),
          dates: allPlaceholders.filter(p => p.toLowerCase().includes('date')),
          custom: allPlaceholders.filter(p => 
            !p.toLowerCase().includes('client') &&
            !p.toLowerCase().includes('project') &&
            !p.toLowerCase().includes('amount') &&
            !p.toLowerCase().includes('rate') &&
            !p.toLowerCase().includes('total') &&
            !p.toLowerCase().includes('date')
          )
        }
      };
    }
  } catch (error) {
    console.error('Error analyzing template:', error);
    throw new Error('Failed to analyze template');
  }
} 
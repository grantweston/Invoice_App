import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getFile } from '@/src/services/fileStorage';
import mammoth from 'mammoth';
import { htmlToDocx } from '@/src/utils/docxConverter';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

export async function POST(request: Request) {
  try {
    const { templateId, client, invoiceNumber, dateRange, wipEntries, dailyActivities } = await request.json();
    console.log('Generating invoice with data:', { templateId, client, invoiceNumber, dateRange });

    // Get the template
    const templateBuffer = await getFile(templateId);
    if (!templateBuffer) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Convert template to HTML
    const { value: templateHtml } = await mammoth.convertToHtml({ 
      buffer: Buffer.from(templateBuffer) 
    });
    
    console.log('Generating invoice content...');
    const prompt = `You are an expert at generating professional invoice content.

Client: ${JSON.stringify(client)}
Invoice Number: ${invoiceNumber}
Date Range: ${dateRange.start} to ${dateRange.end}

WIP Entries:
${JSON.stringify(wipEntries, null, 2)}

Daily Activities:
${JSON.stringify(dailyActivities, null, 2)}

Your task is to generate content for an invoice. Return ONLY a raw JSON object with no markdown formatting, no backticks, and no explanation. The JSON should map template placeholders to their values like this:
{
  "client name": "Client Name Here",
  "client address": "Client Address Here",
  "Invoice Number": "INV-123",
  "Invoice Amount": "$500.00",
  "day, month, year": "December 27, 2024",
  "Description": "Professional services rendered including:\n- Task 1\n- Task 2",
  "Client Number": "CLT-123"
}

Group related tasks together and write clear, professional descriptions.`;

    const result = await model.generateContent(prompt);
    const analysis = result.response.text();
    console.log('Generated content:', analysis);
    
    try {
      // Clean the response and parse it
      const cleanedAnalysis = analysis.replace(/^```json\s*|\s*```$/g, '').trim();
      const invoiceContent = JSON.parse(cleanedAnalysis);
      
      // Replace placeholders in HTML
      let finalHtml = templateHtml;
      Object.entries(invoiceContent).forEach(([key, value]) => {
        const placeholder = new RegExp(`{${key}}`, 'g');
        finalHtml = finalHtml.replace(placeholder, value as string);
      });

      // Convert HTML back to DOCX
      const docxBuffer = await htmlToDocx(finalHtml);

      // Return both the preview HTML and the DOCX buffer
      return NextResponse.json({
        preview: finalHtml,
        document: Buffer.from(docxBuffer).toString('base64')
      });
    } catch (parseError) {
      console.error('Failed to parse generated content:', parseError);
      return NextResponse.json(
        { error: 'Failed to generate invoice content' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error generating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}

// Prevent GET requests
export async function GET() {
  return new NextResponse(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: {
      'Content-Type': 'application/json'
    }
  });
} 
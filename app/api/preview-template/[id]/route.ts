import { NextResponse } from 'next/server';
import { getServerFile } from '@/src/services/serverFileStorage';
import { convertDocxToPdf } from '@/src/utils/pdfConverter';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id;
    console.log('Getting template for preview:', templateId);

    const templateBuffer = await getServerFile(templateId);
    if (!templateBuffer) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Convert DOCX to PDF
    const pdfBuffer = await convertDocxToPdf(templateBuffer);

    // Return PDF with appropriate headers
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline'
      }
    });
  } catch (error) {
    console.error('Error generating PDF preview:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    );
  }
} 
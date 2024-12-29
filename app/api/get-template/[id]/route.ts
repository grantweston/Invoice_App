import { NextResponse } from 'next/server';
import { getFile } from '@/src/services/fileStorage';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id;
    const fileData = await getFile(templateId);
    
    if (!fileData) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Return DOCX file with appropriate headers
    return new NextResponse(fileData, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `inline; filename="${templateId}.docx"`
      }
    });
  } catch (error) {
    console.error('Error serving template:', error);
    return NextResponse.json(
      { error: 'Failed to serve template' },
      { status: 500 }
    );
  }
} 
import { NextResponse } from 'next/server';
import { getTemplate } from '@/src/services/supabaseStorage';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id;
    console.log('API: Attempting to get template:', templateId);
    
    const { data, error } = await getTemplate(templateId);
    
    if (error || !data) {
      console.error('API: Template not found or error:', error);
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    console.log('API: Template found, returning blob');
    
    // Return the file with appropriate headers for browser preview
    return new NextResponse(data, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `inline; filename="${templateId}.docx"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error('API: Error getting template:', error);
    return NextResponse.json(
      { error: 'Failed to get template' },
      { status: 500 }
    );
  }
} 
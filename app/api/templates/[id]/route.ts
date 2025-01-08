import { NextResponse } from 'next/server';
import { templateService } from '@/src/services/templateService';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id;
    
    if (!templateId) {
      return NextResponse.json(
        { error: 'No template ID provided' },
        { status: 400 }
      );
    }

    await templateService.deleteTemplate(templateId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete template' },
      { status: 500 }
    );
  }
} 
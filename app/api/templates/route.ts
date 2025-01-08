import { NextResponse } from 'next/server';
import { templateService } from '@/src/services/templateService';
import { templateMetadataService } from '@/src/services/templateMetadataService';

export async function POST(request: Request) {
  try {
    console.log('Received template upload request');
    const formData = await request.formData();
    const file = formData.get('template') as File;

    console.log('File from form data:', {
      name: file?.name,
      type: file?.type,
      size: file?.size,
      isFile: file instanceof File,
      methods: Object.getOwnPropertyNames(Object.getPrototypeOf(file))
    });

    if (!file) {
      console.log('No file provided in request');
      return NextResponse.json(
        { error: 'No template file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.includes('document')) {
      console.log('Invalid file type:', file.type);
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a document file.' },
        { status: 400 }
      );
    }

    try {
      console.log('Calling templateService.uploadTemplate...');
      const metadata = await templateService.uploadTemplate(file);
      console.log('Upload successful, metadata:', metadata);
      
      // Set as default if no default exists
      const currentDefault = await templateService.getDefaultTemplateId();
      console.log('Current default template:', currentDefault);
      
      if (!currentDefault) {
        console.log('Setting as default template:', metadata.originalId);
        await templateMetadataService.updateMetadata(metadata);
      }

      console.log('Sending success response');
      return NextResponse.json({
        originalId: metadata.originalId,
        googleDocId: metadata.googleDocId,
        message: 'Template uploaded and converted successfully'
      });
    } catch (uploadError) {
      console.error('Error during template upload:', uploadError);
      throw new Error(`Template upload failed: ${uploadError.message}`);
    }
  } catch (error) {
    console.error('Error in template upload API:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload template' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const templates = await templateService.listTemplates();
    const defaultTemplateId = await templateService.getDefaultTemplateId();

    return NextResponse.json({
      defaultTemplateId,
      templates,
    });
  } catch (error) {
    console.error('Error getting templates:', error);
    return NextResponse.json(
      { error: 'Failed to get templates' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { templateId } = await request.json();
    
    if (!templateId) {
      return NextResponse.json(
        { error: 'No template ID provided' },
        { status: 400 }
      );
    }

    console.log('Setting default template:', templateId);

    // Set the default template
    await templateService.setDefaultTemplateId(templateId);
    
    // Get updated metadata to verify
    const metadata = await templateService.getTemplateMetadata(templateId);
    console.log('Verified template metadata:', metadata);

    if (!metadata) {
      throw new Error('Failed to verify template metadata after setting default');
    }
    
    return NextResponse.json({ 
      success: true,
      metadata 
    });
  } catch (error) {
    console.error('Error setting default template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to set default template' },
      { status: 500 }
    );
  }
} 
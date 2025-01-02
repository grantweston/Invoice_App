import { NextResponse } from 'next/server';
import { uploadTemplate } from '@/src/services/supabaseStorage';

export async function POST(request: Request) {
  console.log('Starting template upload...');
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileId = formData.get('fileId') as string;

    console.log('Received upload request:', {
      fileId,
      fileName: file?.name,
      fileSize: file?.size
    });

    if (!file || !fileId) {
      const missing = {
        file: !file,
        fileId: !fileId
      };
      console.error('Missing required fields:', missing);
      return NextResponse.json(
        { error: 'Missing required fields', missing },
        { status: 400 }
      );
    }

    console.log('Uploading to Supabase storage...');
    await uploadTemplate(fileId, file);
    console.log('Upload to Supabase complete');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error uploading template:', error);
    return NextResponse.json(
      { error: 'Failed to upload template' },
      { status: 500 }
    );
  }
} 
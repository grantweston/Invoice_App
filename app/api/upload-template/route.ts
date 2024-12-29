import { NextResponse } from 'next/server';
import { storeServerFile } from '@/src/services/serverFileStorage';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileId = formData.get('fileId') as string;
    
    if (!file || !fileId) {
      return NextResponse.json({ error: 'No file or fileId provided' }, { status: 400 });
    }

    // Convert file to buffer and store
    const bytes = await file.arrayBuffer();
    await storeServerFile(fileId, Buffer.from(bytes));

    return NextResponse.json({ 
      success: true,
      fileId,
      message: 'File uploaded successfully' 
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
} 
import { NextResponse } from 'next/server';
import { googleDocsService } from '@/src/services/googleDocsService';

export async function POST(request: Request) {
  try {
    const { title, content, clientData } = await request.json();

    // Create a new document
    const { documentId, documentUrl } = await googleDocsService.createDocument(title);

    // Insert initial content
    if (content) {
      await googleDocsService.insertText(documentId, content);
    }

    return NextResponse.json({ documentId, documentUrl });
  } catch (error) {
    console.error('Error in docs API:', error);
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { documentId, updates } = await request.json();
    await googleDocsService.updateDocument(documentId, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }
} 
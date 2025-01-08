import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

// Initialize auth client
const auth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/documents'],
});

// Initialize the Docs API
const docs = google.docs({ version: 'v1', auth });

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('GET request for document:', params.id);
  try {
    console.log('Fetching document with auth:', {
      email: process.env.GOOGLE_CLIENT_EMAIL,
      hasKey: !!process.env.GOOGLE_PRIVATE_KEY,
      scopes: auth.scopes,
    });

    const response = await docs.documents.get({
      documentId: params.id,
    });

    console.log('Document fetch successful, content size:', 
      JSON.stringify(response.data).length,
      'paragraphs:', response.data.body?.content?.length
    );

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error getting document:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }
    return NextResponse.json({ error: 'Failed to get document', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('POST request for document:', params.id);
  try {
    const { updates } = await request.json();
    console.log('Applying updates:', updates);

    await docs.documents.batchUpdate({
      documentId: params.id,
      requestBody: {
        requests: updates,
      },
    });

    console.log('Document update successful');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating document:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }
    return NextResponse.json({ error: 'Failed to update document', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
} 
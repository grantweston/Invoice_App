import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { NextResponse } from 'next/server';

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
  try {
    const { id } = params;
    console.log('🔍 Fetching document:', id);

    // Get the document content
    const response = await docs.documents.get({
      documentId: id,
    });

    console.log('✅ Document fetched successfully');
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('❌ Error getting document:', error);
    return NextResponse.json(
      { error: 'Failed to get document' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { updates } = await request.json();
    console.log('✏️ Updating document:', id);
    console.log('Updates to apply:', updates);

    // Apply the updates
    const response = await docs.documents.batchUpdate({
      documentId: id,
      requestBody: {
        requests: updates,
      },
    });

    console.log('✅ Document updated successfully');
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('❌ Error updating document:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
} 
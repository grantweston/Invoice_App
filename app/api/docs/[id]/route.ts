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
    console.log('📦 Updates payload:', JSON.stringify(updates, null, 2));

    if (!Array.isArray(updates)) {
      console.error('❌ Invalid updates format - expected array');
      return NextResponse.json(
        { error: 'Updates must be an array' },
        { status: 400 }
      );
    }

    // Validate each update
    for (const update of updates) {
      console.log('🔍 Validating update:', update);
      if (update.replaceAllText) {
        console.log('📝 Found replaceAllText operation');
        if (!update.replaceAllText.containsText?.text) {
          console.error('❌ Invalid containsText format:', update.replaceAllText.containsText);
          return NextResponse.json(
            { error: 'Invalid containsText format' },
            { status: 400 }
          );
        }
      }
    }

    // Apply the updates
    console.log('🚀 Sending updates to Google Docs API...');
    const response = await docs.documents.batchUpdate({
      documentId: id,
      requestBody: { requests: updates }
    });
    console.log('✅ Document updated successfully');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating document:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
} 
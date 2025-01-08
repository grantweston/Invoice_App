import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { NextResponse } from 'next/server';

// Initialize auth client
const auth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/drive'],
});

// Initialize the Drive API
const drive = google.drive({ version: 'v3', auth });

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Delete the file from Google Drive
    await drive.files.delete({
      fileId: id,
    });

    return NextResponse.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
} 
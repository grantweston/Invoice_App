"use server";

import { NextResponse } from "next/server";
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

// Initialize auth client
const auth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/drive'],
});

// Initialize the Drive API
const drive = google.drive({ version: 'v3', auth });

export async function GET() {
  try {
    console.log('📡 Test-GoogleAPI called');
    console.log('🔑 Checking auth configuration:', {
      hasEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
      hasKey: !!process.env.GOOGLE_PRIVATE_KEY,
    });

    // Simple test: List files in root (limited to 1 just for testing)
    const response = await drive.files.list({
      pageSize: 1,
      fields: 'files(id, name)',
    });

    console.log('✨ Google Drive response:', response.data);
    return NextResponse.json({ 
      message: 'Google Drive API is working!',
      fileCount: response.data.files?.length || 0,
      firstFile: response.data.files?.[0]
    }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Google Drive test failed:", error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 
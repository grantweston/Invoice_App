"use server";

import { NextResponse } from "next/server";
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

export async function GET() {
  try {
    console.log('📡 Test-GoogleAPI called');
    
    // Log environment details
    const envDetails = {
      hasEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
      hasKey: !!process.env.GOOGLE_PRIVATE_KEY,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
    };
    console.log('🔑 Environment configuration:', envDetails);

    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      throw new Error('Missing required Google API credentials');
    }

    // Initialize auth client
    console.log('🔐 Initializing auth client...');
    const auth = new JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    // Initialize the Drive API
    console.log('🚀 Initializing Drive API...');
    const drive = google.drive({ version: 'v3', auth });

    // Simple test: List files in root (limited to 1 just for testing)
    console.log('📂 Attempting to list files...');
    const response = await drive.files.list({
      pageSize: 1,
      fields: 'files(id, name)',
    });

    console.log('✨ Google Drive response:', response.data);
    return NextResponse.json({ 
      message: 'Google Drive API is working!',
      fileCount: response.data.files?.length || 0,
      firstFile: response.data.files?.[0],
      environment: envDetails
    }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Google Drive test failed:", error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        isJWTError: error instanceof JWT,
        isGoogleError: error.name.includes('Google')
      });
    }
    return NextResponse.json({ 
      error: error.message,
      type: error.name,
      environment: {
        hasEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
        hasKey: !!process.env.GOOGLE_PRIVATE_KEY,
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
      }
    }, { status: 500 });
  }
} 
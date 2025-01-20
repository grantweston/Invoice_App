export const runtime = 'nodejs' // Force Node.js runtime instead of Edge

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export async function GET() {
  console.log('🚀 Starting Google Drive API test...');
  
  try {
    console.log('🔧 Environment configuration:', {
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      nodeEnv: process.env.NODE_ENV,
    });

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new Error('Missing required Google OAuth credentials');
    }

    // Initialize OAuth2 client
    console.log('🔐 Initializing OAuth2 client...');
    const oauth2Client = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    });

    // Initialize the Drive API with readonly scope
    console.log('🚀 Initializing Drive API...');
    const drive = google.drive({ 
      version: 'v3', 
      auth: oauth2Client,
    });

    // For testing, we'll just return the auth configuration
    return Response.json({ 
      message: 'Google Drive API client initialized',
      environment: {
        hasClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        nodeEnv: process.env.NODE_ENV,
      }
    }, { status: 200 });
  } catch (error) {
    console.error('❌ Test API failed:', error);
    const errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error;
    
    return Response.json({ 
      success: false, 
      error: 'Failed to initialize Google Drive API',
      errorDetails,
      environment: {
        hasClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        nodeEnv: process.env.NODE_ENV,
      }
    }, { status: 500 });
  }
} 
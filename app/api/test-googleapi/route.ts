import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

export async function GET() {
  console.log('🚀 Starting Google Drive API test...');
  
  try {
    console.log('🔧 Environment configuration:', {
      hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
      nodeEnv: process.env.NODE_ENV,
    });

    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      throw new Error('Missing required Google API credentials');
    }

    // Initialize auth client
    console.log('🔐 Initializing auth client...');
    try {
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      console.log('📝 Private key format:', {
        originalLength: process.env.GOOGLE_PRIVATE_KEY?.length,
        processedLength: privateKey?.length,
        startsWithHeader: privateKey?.startsWith('-----BEGIN PRIVATE KEY-----'),
        endsWithFooter: privateKey?.endsWith('-----END PRIVATE KEY-----'),
        newlineCount: privateKey?.split('\n').length
      });
      
      const auth = new JWT({
        email: process.env.GOOGLE_CLIENT_EMAIL,
        key: privateKey,
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
      return Response.json({ 
        message: 'Google Drive API is working!',
        fileCount: response.data.files?.length || 0,
        firstFile: response.data.files?.[0],
        environment: {
          hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
          hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
          nodeEnv: process.env.NODE_ENV,
        }
      }, { status: 200 });
    } catch (jwtError) {
      console.error('❌ JWT initialization failed:', jwtError);
      throw jwtError;
    }
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
        hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
        hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
        nodeEnv: process.env.NODE_ENV,
      }
    }, { status: 500 });
  }
} 
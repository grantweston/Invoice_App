export async function GET() {
  console.log('🔧 Checking environment variables on server...');
  
  const envCheck = {
    // Basic environment info
    nodeEnv: process.env.NODE_ENV,
    // Google API credentials (only checking existence and format)
    credentials: {
      clientEmail: {
        exists: !!process.env.GOOGLE_CLIENT_EMAIL,
        length: process.env.GOOGLE_CLIENT_EMAIL?.length || 0,
        value: process.env.GOOGLE_CLIENT_EMAIL?.replace(/[^@]/g, '*'), // Show only the domain part
        endsWithGserviceAccount: process.env.GOOGLE_CLIENT_EMAIL?.endsWith('@developer.gserviceaccount.com') || false,
        endsWithIam: process.env.GOOGLE_CLIENT_EMAIL?.endsWith('.iam.gserviceaccount.com') || false,
        containsGserviceaccount: process.env.GOOGLE_CLIENT_EMAIL?.includes('gserviceaccount.com') || false
      },
      privateKey: {
        exists: !!process.env.GOOGLE_PRIVATE_KEY,
        length: process.env.GOOGLE_PRIVATE_KEY?.length || 0,
        startsCorrectly: process.env.GOOGLE_PRIVATE_KEY?.includes('-----BEGIN PRIVATE KEY-----') || false,
        endsCorrectly: process.env.GOOGLE_PRIVATE_KEY?.includes('-----END PRIVATE KEY-----') || false,
        hasNewlines: process.env.GOOGLE_PRIVATE_KEY?.includes('\\n') || false,
        hasRealNewlines: process.env.GOOGLE_PRIVATE_KEY?.includes('\n') || false
      },
      projectId: {
        exists: !!process.env.GOOGLE_PROJECT_ID,
        length: process.env.GOOGLE_PROJECT_ID?.length || 0
      }
    }
  };

  console.log('✨ Environment check results:', envCheck);
  
  return Response.json(envCheck);
} 
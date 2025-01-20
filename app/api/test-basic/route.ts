export async function GET() {
  console.log('Basic test endpoint called');
  
  return Response.json({ 
    message: 'Basic test endpoint working',
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV
  });
} 
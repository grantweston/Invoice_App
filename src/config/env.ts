"use server";

/**
 * required(name: string)
 * Retrieves an environment variable or logs a warning if missing.
 */
function required(name: string) {
  const value = process.env[name];
  if (!value) {
    console.warn(`Environment variable ${name} is missing`);
  }
  return value || '';
}

// Retrieve and parse the Google private key, replacing literal '\n' with actual newlines.
const rawPrivateKey = required('GOOGLE_PRIVATE_KEY');
const googlePrivateKey = rawPrivateKey.replace(/\\n/g, '\n');

// Export all env vars in a structured object for easy access.
export const ENV = {
  SUPABASE_URL: required('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: required('SUPABASE_SERVICE_ROLE_KEY'),
  GEMINI_API_KEY: required('GEMINI_API_KEY'),
  GOOGLE_CLIENT_EMAIL: required('GOOGLE_CLIENT_EMAIL'),
  GOOGLE_PROJECT_ID: required('GOOGLE_PROJECT_ID'),
  GOOGLE_PRIVATE_KEY_ID: required('GOOGLE_PRIVATE_KEY_ID'),
  GOOGLE_PRIVATE_KEY: googlePrivateKey,
  GOOGLE_CLIENT_ID: required('GOOGLE_CLIENT_ID')
};
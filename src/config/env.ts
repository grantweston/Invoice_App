"use server";

// Updated to include Google credentials and detailed logging.
// This ensures that environment variables for Supabase, Gemini LLM, and Google APIs are loaded correctly.

function required(name: string) {
  const value = process.env[name];
  if (!value) {
    console.warn(`Environment variable ${name} is missing`);
  }
  return value || '';
}

export const ENV = {
  SUPABASE_URL: required('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: required('SUPABASE_SERVICE_ROLE_KEY'),
  GEMINI_API_KEY: required('GEMINI_API_KEY'),
  GOOGLE_CLIENT_EMAIL: required('GOOGLE_CLIENT_EMAIL'),
  GOOGLE_PROJECT_ID: required('GOOGLE_PROJECT_ID'),
  GOOGLE_PRIVATE_KEY_ID: required('GOOGLE_PRIVATE_KEY_ID'),
  // Private key may contain \n, ensure it's loaded properly (in a production scenario, parse it).
  GOOGLE_PRIVATE_KEY: required('GOOGLE_PRIVATE_KEY'),
  GOOGLE_CLIENT_ID: required('GOOGLE_CLIENT_ID')
};
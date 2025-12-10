import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  FRONTEND_URL: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_KEY?: string;
  OPENAI_API_KEY: string;
  TRANSCRIPTAPI_KEY?: string;
}

const getEnvVar = (key: string, defaultValue?: string, required: boolean = true): string => {
  const value = process.env[key] || defaultValue;
  if (!value && required) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || '';
};

export const env: EnvConfig = {
  PORT: parseInt(getEnvVar('PORT', '3001'), 10),
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  FRONTEND_URL: getEnvVar('FRONTEND_URL', '*', false), // Default to allow all origins for webhook mode
  SUPABASE_URL: getEnvVar('SUPABASE_URL', '', false),
  SUPABASE_ANON_KEY: getEnvVar('SUPABASE_ANON_KEY', '', false),
  SUPABASE_SERVICE_KEY: getEnvVar('SUPABASE_SERVICE_KEY', '', false),
  OPENAI_API_KEY: getEnvVar('OPENAI_API_KEY'), // Required
  TRANSCRIPTAPI_KEY: getEnvVar('TRANSCRIPTAPI_KEY', '', false), // Optional: for faster YouTube transcripts
};

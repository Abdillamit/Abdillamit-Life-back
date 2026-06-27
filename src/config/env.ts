import dotenv from 'dotenv';

dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  port: Number(optional('PORT', '4000')),
  nodeEnv: optional('NODE_ENV', 'development'),
  corsOrigin: optional('CORS_ORIGIN', 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  supabaseUrl: required('SUPABASE_URL'),
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  anthropicModel: optional('ANTHROPIC_MODEL', 'claude-opus-4-8'),
} as const;

export const isProd = env.nodeEnv === 'production';

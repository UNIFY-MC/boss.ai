import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export const env = {
  // Supabase
  SUPABASE_URL: required('SUPABASE_URL'),
  SUPABASE_SERVICE_KEY: required('SUPABASE_SERVICE_KEY'),

  // LLMs
  ANTHROPIC_API_KEY: required('ANTHROPIC_API_KEY'),
  OPENAI_API_KEY: optional('OPENAI_API_KEY'),

  // Granola auto-pickup (primary transcript ingestion)
  FIREFLIES_API_TOKEN: optional('FIREFLIES_API_TOKEN'),

  // Audio transcription (used for Twilio recordings + manual upload)
  SPEECHMATICS_API_KEY: optional('SPEECHMATICS_API_KEY'),

  // Twilio click-to-call (primary audio path)
  TWILIO_ACCOUNT_SID: optional('TWILIO_ACCOUNT_SID'),
  TWILIO_AUTH_TOKEN: optional('TWILIO_AUTH_TOKEN'),
  TWILIO_FROM_NUMBER: optional('TWILIO_FROM_NUMBER'),
  TWILIO_WEBHOOK_BASE: optional('TWILIO_WEBHOOK_BASE', 'https://worker.kyletdow.com'),

  // Lead data
  APOLLO_API_KEY: optional('APOLLO_API_KEY'),

  // CRM
  HUBSPOT_API_KEY: optional('HUBSPOT_API_KEY'),

  // Security middleware
  LOBSTER_TRAP_URL: optional('LOBSTER_TRAP_URL'),
  LOBSTER_TRAP_SECRET: optional('LOBSTER_TRAP_SECRET'),

  // Shared secret
  WORKER_PROXY_SECRET: required('WORKER_PROXY_SECRET'),

  // Runtime
  PORT: Number(optional('PORT', '3000')),
  NODE_ENV: optional('NODE_ENV', 'development') as 'development' | 'production',
  LOG_LEVEL: optional('LOG_LEVEL', 'info'),
} as const;

export type Env = typeof env;

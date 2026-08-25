// Backend endpoint (Supabase Edge Function). The anon key is a PUBLIC token by
// design — safe to ship in the client. When API_URL is non-empty the app runs
// in synced multi-user mode with Telegram login; otherwise it falls back to the
// single-device localStorage mode (useful for local dev without a backend).
export const API_URL = 'https://astnkwmuluhclgkikcnd.supabase.co/functions/v1/api';
export const API_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzdG5rd211bHVoY2xna2lrY25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2OTIzMDYsImV4cCI6MjEwMzI2ODMwNn0.MSSwe7SK9Mv9o_-A_b3eDfNdUWidcfDddhzt7DouSOY';

export const REMOTE = API_URL.length > 0;
export const POLL_MS = 3000;

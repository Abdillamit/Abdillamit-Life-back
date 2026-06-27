import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

/**
 * Service-role client — bypasses RLS. We manually scope every query by
 * user_id, so never expose this client or its key to the browser.
 */
export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Anon client used only to validate a user's access token. We create a
 * throwaway client per request bound to the incoming bearer token.
 */
export function supabaseForToken(accessToken: string) {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

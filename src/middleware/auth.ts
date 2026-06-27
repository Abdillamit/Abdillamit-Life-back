import type { NextFunction, Request, Response } from 'express';
import { supabaseForToken } from '../lib/supabase.js';

export interface AuthedRequest extends Request {
  userId?: string;
  accessToken?: string;
}

/**
 * Validates the Supabase access token from the Authorization header and
 * attaches the resolved user id to the request.
 */
export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

  if (!token) {
    res.status(401).json({ error: 'Missing bearer token' });
    return;
  }

  const supabase = supabaseForToken(token);
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.userId = data.user.id;
  req.accessToken = token;
  next();
}

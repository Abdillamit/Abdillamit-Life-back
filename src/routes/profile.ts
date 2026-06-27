import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import type { AuthedRequest } from '../middleware/auth.js';

export const profileRouter = Router();

const profileSchema = z.object({
  name: z.string().min(1).optional(),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  bio: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
});

// GET /api/profile
profileRouter.get(
  '/',
  asyncHandler<AuthedRequest>(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.userId!)
      .single();

    if (error || !data) throw new HttpError(404, 'Profile not found');
    res.json({ data });
  }),
);

// PATCH /api/profile
profileRouter.patch(
  '/',
  asyncHandler<AuthedRequest>(async (req, res) => {
    const body = profileSchema.parse(req.body);
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(body)
      .eq('id', req.userId!)
      .select('*')
      .single();

    if (error || !data) throw new HttpError(404, 'Profile not found');
    res.json({ data });
  }),
);

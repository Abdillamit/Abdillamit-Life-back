import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import type { AuthedRequest } from '../middleware/auth.js';

export const goalsRouter = Router();

const goalSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  progress: z.number().int().min(0).max(100).optional(),
  status: z.enum(['active', 'completed', 'paused', 'abandoned']).optional(),
  category: z.string().nullable().optional(),
});

// GET /api/goals?status=
goalsRouter.get(
  '/',
  asyncHandler<AuthedRequest>(async (req, res) => {
    let query = supabaseAdmin
      .from('goals')
      .select('*')
      .eq('user_id', req.userId!)
      .order('created_at', { ascending: false });

    if (typeof req.query.status === 'string') query = query.eq('status', req.query.status);

    const { data, error } = await query;
    if (error) throw new HttpError(500, error.message);
    res.json({ data });
  }),
);

// POST /api/goals
goalsRouter.post(
  '/',
  asyncHandler<AuthedRequest>(async (req, res) => {
    const body = goalSchema.parse(req.body);
    const { data, error } = await supabaseAdmin
      .from('goals')
      .insert({ ...body, user_id: req.userId! })
      .select('*')
      .single();

    if (error) throw new HttpError(500, error.message);
    res.status(201).json({ data });
  }),
);

// PATCH /api/goals/:id
goalsRouter.patch(
  '/:id',
  asyncHandler<AuthedRequest>(async (req, res) => {
    const body = goalSchema.partial().parse(req.body);
    const { data, error } = await supabaseAdmin
      .from('goals')
      .update(body)
      .eq('user_id', req.userId!)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error || !data) throw new HttpError(404, 'Goal not found');
    res.json({ data });
  }),
);

// DELETE /api/goals/:id
goalsRouter.delete(
  '/:id',
  asyncHandler<AuthedRequest>(async (req, res) => {
    const { error } = await supabaseAdmin
      .from('goals')
      .delete()
      .eq('user_id', req.userId!)
      .eq('id', req.params.id);

    if (error) throw new HttpError(500, error.message);
    res.status(204).end();
  }),
);

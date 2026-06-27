import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import type { AuthedRequest } from '../middleware/auth.js';

export const timelineRouter = Router();

const eventSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  event_type: z
    .enum(['education', 'work', 'personal', 'achievement', 'travel', 'milestone'])
    .nullable()
    .optional(),
  icon: z.string().nullable().optional(),
});

// GET /api/timeline
timelineRouter.get(
  '/',
  asyncHandler<AuthedRequest>(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('timeline_events')
      .select('*')
      .eq('user_id', req.userId!)
      .order('event_date', { ascending: false });

    if (error) throw new HttpError(500, error.message);
    res.json({ data });
  }),
);

// POST /api/timeline
timelineRouter.post(
  '/',
  asyncHandler<AuthedRequest>(async (req, res) => {
    const body = eventSchema.parse(req.body);
    const { data, error } = await supabaseAdmin
      .from('timeline_events')
      .insert({ ...body, user_id: req.userId! })
      .select('*')
      .single();

    if (error) throw new HttpError(500, error.message);
    res.status(201).json({ data });
  }),
);

// PATCH /api/timeline/:id
timelineRouter.patch(
  '/:id',
  asyncHandler<AuthedRequest>(async (req, res) => {
    const body = eventSchema.partial().parse(req.body);
    const { data, error } = await supabaseAdmin
      .from('timeline_events')
      .update(body)
      .eq('user_id', req.userId!)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error || !data) throw new HttpError(404, 'Event not found');
    res.json({ data });
  }),
);

// DELETE /api/timeline/:id
timelineRouter.delete(
  '/:id',
  asyncHandler<AuthedRequest>(async (req, res) => {
    const { error } = await supabaseAdmin
      .from('timeline_events')
      .delete()
      .eq('user_id', req.userId!)
      .eq('id', req.params.id);

    if (error) throw new HttpError(500, error.message);
    res.status(204).end();
  }),
);

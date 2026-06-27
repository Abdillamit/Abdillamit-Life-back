import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import type { AuthedRequest } from '../middleware/auth.js';

export const entriesRouter = Router();

const entrySchema = z.object({
  content: z.string().min(1, 'content is required'),
  mood: z.number().int().min(1).max(10).nullable().optional(),
  tags: z.array(z.string()).optional(),
  photos: z.array(z.string()).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  is_published: z.boolean().optional(),
});

// GET /api/entries?limit=&offset=&tag=&mood=&from=&to=
entriesRouter.get(
  '/',
  asyncHandler<AuthedRequest>(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;

    let query = supabaseAdmin
      .from('entries')
      .select('*', { count: 'exact' })
      .eq('user_id', req.userId!)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (typeof req.query.tag === 'string') query = query.contains('tags', [req.query.tag]);
    if (req.query.mood) query = query.eq('mood', Number(req.query.mood));
    if (typeof req.query.from === 'string') query = query.gte('date', req.query.from);
    if (typeof req.query.to === 'string') query = query.lte('date', req.query.to);

    const { data, error, count } = await query;
    if (error) throw new HttpError(500, error.message);

    res.json({ data, count, limit, offset });
  }),
);

// GET /api/entries/:id
entriesRouter.get(
  '/:id',
  asyncHandler<AuthedRequest>(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('entries')
      .select('*')
      .eq('user_id', req.userId!)
      .eq('id', req.params.id)
      .single();

    if (error || !data) throw new HttpError(404, 'Entry not found');
    res.json({ data });
  }),
);

// POST /api/entries
entriesRouter.post(
  '/',
  asyncHandler<AuthedRequest>(async (req, res) => {
    const body = entrySchema.parse(req.body);
    const { data, error } = await supabaseAdmin
      .from('entries')
      .insert({ ...body, user_id: req.userId! })
      .select('*')
      .single();

    if (error) throw new HttpError(500, error.message);
    res.status(201).json({ data });
  }),
);

// PATCH /api/entries/:id
entriesRouter.patch(
  '/:id',
  asyncHandler<AuthedRequest>(async (req, res) => {
    const body = entrySchema.partial().parse(req.body);
    const { data, error } = await supabaseAdmin
      .from('entries')
      .update(body)
      .eq('user_id', req.userId!)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error || !data) throw new HttpError(404, 'Entry not found');
    res.json({ data });
  }),
);

// DELETE /api/entries/:id
entriesRouter.delete(
  '/:id',
  asyncHandler<AuthedRequest>(async (req, res) => {
    const { error } = await supabaseAdmin
      .from('entries')
      .delete()
      .eq('user_id', req.userId!)
      .eq('id', req.params.id);

    if (error) throw new HttpError(500, error.message);
    res.status(204).end();
  }),
);

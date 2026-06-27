import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import type { AuthedRequest } from '../middleware/auth.js';

export const tagsRouter = Router();

const tagSchema = z.object({
  name: z.string().min(1).max(40),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

// Default tags seeded the first time a user opens their tag list.
const DEFAULT_TAGS: { name: string; color: string }[] = [
  { name: 'Работа', color: '#14b8a6' },
  { name: 'Учёба', color: '#3b82f6' },
  { name: 'Здоровье', color: '#22c55e' },
  { name: 'Личное', color: '#a855f7' },
  { name: 'Общение', color: '#ef4444' },
];

// GET /api/tags — list (auto-seeds defaults on first call)
tagsRouter.get(
  '/',
  asyncHandler<AuthedRequest>(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('tags')
      .select('*')
      .eq('user_id', req.userId!)
      .order('created_at', { ascending: true });

    if (error) throw new HttpError(500, error.message);

    if (!data || data.length === 0) {
      const { data: seeded, error: seedErr } = await supabaseAdmin
        .from('tags')
        .insert(DEFAULT_TAGS.map((t) => ({ ...t, user_id: req.userId! })))
        .select('*');
      if (seedErr) throw new HttpError(500, seedErr.message);
      res.json({ data: seeded });
      return;
    }

    res.json({ data });
  }),
);

// POST /api/tags
tagsRouter.post(
  '/',
  asyncHandler<AuthedRequest>(async (req, res) => {
    const body = tagSchema.parse(req.body);
    const { data, error } = await supabaseAdmin
      .from('tags')
      .insert({ ...body, user_id: req.userId! })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') throw new HttpError(409, 'Тег с таким именем уже есть');
      throw new HttpError(500, error.message);
    }
    res.status(201).json({ data });
  }),
);

// PATCH /api/tags/:id
tagsRouter.patch(
  '/:id',
  asyncHandler<AuthedRequest>(async (req, res) => {
    const body = tagSchema.partial().parse(req.body);
    const { data, error } = await supabaseAdmin
      .from('tags')
      .update(body)
      .eq('user_id', req.userId!)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') throw new HttpError(409, 'Тег с таким именем уже есть');
      throw new HttpError(404, 'Тег не найден');
    }
    res.json({ data });
  }),
);

// DELETE /api/tags/:id
tagsRouter.delete(
  '/:id',
  asyncHandler<AuthedRequest>(async (req, res) => {
    const { error } = await supabaseAdmin
      .from('tags')
      .delete()
      .eq('user_id', req.userId!)
      .eq('id', req.params.id);

    if (error) throw new HttpError(500, error.message);
    res.status(204).end();
  }),
);

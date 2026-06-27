import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import type { AuthedRequest } from '../middleware/auth.js';

export const booksRouter = Router();

const bookSchema = z.object({
  title: z.string().min(1).max(300),
  author: z.string().max(200).nullable().optional(),
  status: z.enum(['want_to_read', 'reading', 'read']).optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().nullable().optional(),
  cover_url: z.string().url().nullable().optional(),
  started_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  finished_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  sort_order: z.number().int().optional(),
});

// GET /api/books?status=
booksRouter.get(
  '/',
  asyncHandler<AuthedRequest>(async (req, res) => {
    let query = supabaseAdmin
      .from('books')
      .select('*')
      .eq('user_id', req.userId!)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (typeof req.query.status === 'string') query = query.eq('status', req.query.status);

    const { data, error } = await query;
    if (error) throw new HttpError(500, error.message);
    res.json({ data });
  }),
);

// POST /api/books
booksRouter.post(
  '/',
  asyncHandler<AuthedRequest>(async (req, res) => {
    const body = bookSchema.parse(req.body);
    const { data, error } = await supabaseAdmin
      .from('books')
      .insert({ ...body, user_id: req.userId! })
      .select('*')
      .single();

    if (error) throw new HttpError(500, error.message);
    res.status(201).json({ data });
  }),
);

// PATCH /api/books/:id
booksRouter.patch(
  '/:id',
  asyncHandler<AuthedRequest>(async (req, res) => {
    const body = bookSchema.partial().parse(req.body);
    const { data, error } = await supabaseAdmin
      .from('books')
      .update(body)
      .eq('user_id', req.userId!)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error || !data) throw new HttpError(404, 'Книга не найдена');
    res.json({ data });
  }),
);

// DELETE /api/books/:id
booksRouter.delete(
  '/:id',
  asyncHandler<AuthedRequest>(async (req, res) => {
    const { error } = await supabaseAdmin
      .from('books')
      .delete()
      .eq('user_id', req.userId!)
      .eq('id', req.params.id);

    if (error) throw new HttpError(500, error.message);
    res.status(204).end();
  }),
);

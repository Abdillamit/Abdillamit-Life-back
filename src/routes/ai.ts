import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { analyzeEntries, generateWeeklyDigest } from '../lib/anthropic.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import type { AuthedRequest } from '../middleware/auth.js';
import type { Entry } from '../types/index.js';

export const aiRouter = Router();

async function fetchEntries(userId: string, from?: string, to?: string): Promise<Entry[]> {
  let query = supabaseAdmin
    .from('entries')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true });
  if (from) query = query.gte('date', from);
  if (to) query = query.lte('date', to);

  const { data, error } = await query;
  if (error) throw new HttpError(500, error.message);
  return (data ?? []) as Entry[];
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// POST /api/ai/weekly-digest  { period_start?, period_end? }
const digestSchema = z.object({
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  persist: z.boolean().optional(),
});

aiRouter.post(
  '/weekly-digest',
  asyncHandler<AuthedRequest>(async (req, res) => {
    const { period_start, period_end, persist } = digestSchema.parse(req.body ?? {});

    const end = period_end ? new Date(period_end) : new Date();
    const start = period_start
      ? new Date(period_start)
      : new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
    const from = isoDate(start);
    const to = isoDate(end);

    const entries = await fetchEntries(req.userId!, from, to);
    const result = await generateWeeklyDigest(entries);

    if (persist) {
      await supabaseAdmin.from('ai_digests').insert({
        user_id: req.userId!,
        period_start: from,
        period_end: to,
        summary: result.summary,
        insights: result.insights,
        recommendations: result.recommendations,
      });
    }

    res.json({ data: { ...result, period_start: from, period_end: to } });
  }),
);

// POST /api/ai/analyze  { question, from?, to? }
const analyzeSchema = z.object({
  question: z.string().min(1),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

aiRouter.post(
  '/analyze',
  asyncHandler<AuthedRequest>(async (req, res) => {
    const { question, from, to } = analyzeSchema.parse(req.body);
    const entries = await fetchEntries(req.userId!, from, to);
    const answer = await analyzeEntries(entries, question);
    res.json({ data: { answer } });
  }),
);

// GET /api/ai/digests — saved digests
aiRouter.get(
  '/digests',
  asyncHandler<AuthedRequest>(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('ai_digests')
      .select('*')
      .eq('user_id', req.userId!)
      .order('created_at', { ascending: false });

    if (error) throw new HttpError(500, error.message);
    res.json({ data });
  }),
);

import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import type { AuthedRequest } from '../middleware/auth.js';
import type { Entry } from '../types/index.js';

export const analyticsRouter = Router();

function computeStreak(dates: string[]): { current: number; longest: number } {
  if (dates.length === 0) return { current: 0, longest: 0 };
  const unique = Array.from(new Set(dates)).sort(); // ascending YYYY-MM-DD
  let longest = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1]);
    const cur = new Date(unique[i]);
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86_400_000);
    run = diff === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  // current streak counting back from today (or yesterday)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const set = new Set(unique);
  let current = 0;
  const cursor = new Date(today);
  if (!set.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1); // allow streak to end yesterday
  }
  while (set.has(cursor.toISOString().slice(0, 10))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { current, longest };
}

// GET /api/analytics/summary
analyticsRouter.get(
  '/summary',
  asyncHandler<AuthedRequest>(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('entries')
      .select('date, mood, tags')
      .eq('user_id', req.userId!)
      .order('date', { ascending: true });

    if (error) throw new HttpError(500, error.message);
    const entries = (data ?? []) as Pick<Entry, 'date' | 'mood' | 'tags'>[];

    const moods = entries.map((e) => e.mood).filter((m): m is number => m != null);
    const avgMood = moods.length
      ? Math.round((moods.reduce((a, b) => a + b, 0) / moods.length) * 10) / 10
      : null;

    const tagCounts: Record<string, number> = {};
    const weekdayCounts = new Array(7).fill(0);
    for (const e of entries) {
      for (const t of e.tags ?? []) tagCounts[t] = (tagCounts[t] ?? 0) + 1;
      weekdayCounts[new Date(e.date).getDay()]++;
    }

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }));

    const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const mostProductiveDay =
      weekdayCounts.reduce((best, c, i) => (c > weekdayCounts[best] ? i : best), 0);

    const streak = computeStreak(entries.map((e) => e.date));

    res.json({
      data: {
        total_entries: entries.length,
        avg_mood: avgMood,
        top_tags: topTags,
        most_productive_day: entries.length ? weekdays[mostProductiveDay] : null,
        current_streak: streak.current,
        longest_streak: streak.longest,
      },
    });
  }),
);

// GET /api/analytics/heatmap?days=365 — entries-per-day map
analyticsRouter.get(
  '/heatmap',
  asyncHandler<AuthedRequest>(async (req, res) => {
    const days = Math.min(Number(req.query.days) || 365, 730);
    const since = new Date();
    since.setDate(since.getDate() - days);
    const from = since.toISOString().slice(0, 10);

    const { data, error } = await supabaseAdmin
      .from('entries')
      .select('date, mood')
      .eq('user_id', req.userId!)
      .gte('date', from)
      .order('date', { ascending: true });

    if (error) throw new HttpError(500, error.message);

    const counts: Record<string, { count: number; moodSum: number; moodN: number }> = {};
    for (const e of data ?? []) {
      const d = e.date as string;
      counts[d] ??= { count: 0, moodSum: 0, moodN: 0 };
      counts[d].count++;
      if (e.mood != null) {
        counts[d].moodSum += e.mood as number;
        counts[d].moodN++;
      }
    }

    const result = Object.entries(counts).map(([date, v]) => ({
      date,
      count: v.count,
      avg_mood: v.moodN ? Math.round((v.moodSum / v.moodN) * 10) / 10 : null,
    }));

    res.json({ data: result });
  }),
);

// GET /api/analytics/mood?days=30 — mood timeseries
analyticsRouter.get(
  '/mood',
  asyncHandler<AuthedRequest>(async (req, res) => {
    const days = Math.min(Number(req.query.days) || 30, 365);
    const since = new Date();
    since.setDate(since.getDate() - days);
    const from = since.toISOString().slice(0, 10);

    const { data, error } = await supabaseAdmin
      .from('entries')
      .select('date, mood')
      .eq('user_id', req.userId!)
      .gte('date', from)
      .not('mood', 'is', null)
      .order('date', { ascending: true });

    if (error) throw new HttpError(500, error.message);
    res.json({ data });
  }),
);

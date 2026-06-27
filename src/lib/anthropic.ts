import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';
import type { Entry, WeeklyDigestResult } from '../types/index.js';

const SYSTEM_PROMPT = `Ты персональный AI-ассистент для анализа жизни пользователя. Анализируй ежедневные записи и давай полезные инсайты. Отвечай на русском языке. Будь конкретным, опирайся на данные из записей. Не будь слишком позитивным — давай честную обратную связь.`;

const client = env.anthropicApiKey
  ? new Anthropic({ apiKey: env.anthropicApiKey })
  : null;

function ensureClient(): Anthropic {
  if (!client) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }
  return client;
}

function formatEntries(entries: Entry[]): string {
  if (entries.length === 0) return '(нет записей за этот период)';
  return entries
    .map((e) => {
      const mood = e.mood != null ? `настроение ${e.mood}/10` : 'настроение не указано';
      const tags = e.tags.length ? ` теги: ${e.tags.join(', ')}` : '';
      return `- ${e.date} (${mood})${tags}\n  ${e.content}`;
    })
    .join('\n');
}

function extractText(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}

/**
 * Build a structured weekly digest from a week's worth of entries.
 */
export async function generateWeeklyDigest(entries: Entry[]): Promise<WeeklyDigestResult> {
  const anthropic = ensureClient();

  const userPrompt = `Вот мои записи за неделю:\n\n${formatEntries(entries)}\n\nПроанализируй неделю и верни СТРОГО валидный JSON без markdown-обёрток в формате:
{
  "summary": "краткая сводка недели в 2-3 предложениях",
  "insights": ["наблюдение 1", "наблюдение 2", "наблюдение 3"],
  "recommendations": ["совет 1", "совет 2"],
  "mood_trend": "improving | declining | stable"
}`;

  const message = await anthropic.messages.create({
    model: env.anthropicModel,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = extractText(message);
  const parsed = safeParseJson(text);

  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary : text,
    insights: toStringArray(parsed.insights),
    recommendations: toStringArray(parsed.recommendations),
    mood_trend: normalizeTrend(parsed.mood_trend),
  };
}

/**
 * Free-form analysis: answer a question grounded in the user's entries.
 */
export async function analyzeEntries(entries: Entry[], question: string): Promise<string> {
  const anthropic = ensureClient();

  const userPrompt = `Вот мои записи:\n\n${formatEntries(entries)}\n\nВопрос: ${question}`;

  const message = await anthropic.messages.create({
    model: env.anthropicModel,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  return extractText(message);
}

function safeParseJson(text: string): Record<string, unknown> {
  try {
    const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) return {};
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return {};
  }
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function normalizeTrend(value: unknown): WeeklyDigestResult['mood_trend'] {
  return value === 'improving' || value === 'declining' ? value : 'stable';
}

# Abdillamit Life — Backend API

REST API for the **Abdillamit Life** personal life-logging platform. Built with
Express + TypeScript on top of Supabase (Postgres + Auth) and the Anthropic
Claude API for AI insights.

## Stack

- Node.js 20+ / TypeScript (ESM)
- Express 4
- Supabase JS (service role for data access, anon for token validation)
- Anthropic SDK (Claude) for digests & analysis
- Zod for request validation, Helmet + CORS for security

## Getting started

```bash
cp .env.example .env      # fill in your keys
npm install
npm run dev               # tsx watch on PORT (default 4000)
```

Apply the database schema (Supabase SQL editor or psql):

```bash
supabase/migrations/001_initial_schema.sql
```

## Auth

Every `/api/*` route requires `Authorization: Bearer <supabase_access_token>`.
The token is validated against Supabase; the resolved user id scopes all queries.

## Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/health` | Liveness check (no auth) |
| GET/POST | `/api/entries` | List / create entries (filters: `tag`, `mood`, `from`, `to`, `limit`, `offset`) |
| GET/PATCH/DELETE | `/api/entries/:id` | Read / update / delete an entry |
| GET/POST | `/api/goals` | List (`status` filter) / create goals |
| PATCH/DELETE | `/api/goals/:id` | Update / delete a goal |
| GET/POST | `/api/timeline` | List / create timeline events |
| PATCH/DELETE | `/api/timeline/:id` | Update / delete an event |
| GET/PATCH | `/api/profile` | Read / update the current profile |
| GET | `/api/analytics/summary` | Totals, avg mood, streaks, top tags |
| GET | `/api/analytics/heatmap?days=365` | Entries-per-day for the activity heatmap |
| GET | `/api/analytics/mood?days=30` | Mood timeseries |
| POST | `/api/ai/weekly-digest` | Generate (optionally persist) a weekly digest |
| POST | `/api/ai/analyze` | Ask a question grounded in your entries |
| GET | `/api/ai/digests` | Saved digests |

## Scripts

- `npm run dev` — watch mode
- `npm run build` — compile to `dist/`
- `npm start` — run compiled server
- `npm run typecheck` — type-check only

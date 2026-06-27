import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env, isProd } from './config/env.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/error.js';
import { entriesRouter } from './routes/entries.js';
import { goalsRouter } from './routes/goals.js';
import { timelineRouter } from './routes/timeline.js';
import { profileRouter } from './routes/profile.js';
import { analyticsRouter } from './routes/analytics.js';
import { aiRouter } from './routes/ai.js';
import { tagsRouter } from './routes/tags.js';

const app = express();

app.use(helmet());
// `*` (or empty) means reflect any origin; otherwise allow only the listed origins.
const allowAllOrigins = env.corsOrigin.length === 0 || env.corsOrigin.includes('*');
app.use(
  cors({
    origin: allowAllOrigins ? true : env.corsOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(morgan(isProd ? 'combined' : 'dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'abdillamit-life-back', time: new Date().toISOString() });
});

// All /api routes require a valid Supabase access token.
app.use('/api', requireAuth);
app.use('/api/entries', entriesRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/timeline', timelineRouter);
app.use('/api/profile', profileRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/tags', tagsRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`🚀 abdillamit-life-back listening on http://localhost:${env.port}`);
});

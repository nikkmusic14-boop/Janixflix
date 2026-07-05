import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { PORT, CLIENT_ORIGIN } from './config.js';
import { seedIfEmpty } from './seed.js';
import moviesRouter from './routes/movies.js';
import streamRouter from './routes/stream.js';
import externalRouter from './routes/external.js';

const app = express();

// ────────────────────────────────────────────────────────────
// Middleware
// ────────────────────────────────────────────────────────────
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());
app.use(morgan('dev'));

// ────────────────────────────────────────────────────────────
// Routes
// ────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'JaNixFlix API',
    version: '1.0.0',
    endpoints: {
      movies: '/api/movies',
      stream: '/api/stream/:id',
      thumbnail: '/api/stream/thumbnail/:id',
      upload: 'POST /api/movies/upload',
    },
  });
});

app.use('/api/movies', moviesRouter);
app.use('/api/stream', streamRouter);
app.use('/api/external', externalRouter);

// ────────────────────────────────────────────────────────────
// 404 + error handlers
// ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  // multer file-size / type errors land here
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large' });
  }
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

// ────────────────────────────────────────────────────────────
// Boot
// ────────────────────────────────────────────────────────────
async function main() {
  // Seed demo movies on first run (best-effort, non-blocking)
  seedIfEmpty().catch(err => console.warn('[seed] failed:', err.message));

  app.listen(PORT, () => {
    console.log(`\n🎬  JaNixFlix API running → http://localhost:${PORT}`);
    console.log(`    Allowing CORS from   → ${CLIENT_ORIGIN}\n`);
  });
}

main();
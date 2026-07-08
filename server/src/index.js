import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PORT, CLIENT_ORIGIN } from './config.js';
import { seedIfEmpty } from './seed.js';
import moviesRouter from './routes/movies.js';
import streamRouter from './routes/stream.js';
import externalRouter from './routes/external.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIST_DIR = path.resolve(__dirname, '..', '..', 'client', 'dist');

const app = express();

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Content-Security-Policy', "default-src 'self' *; img-src * 'self' data:; media-src * 'self' blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' *; style-src 'self' 'unsafe-inline' *;");
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  next();
});

// ────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Render Free Tier Keep-Alive Self-Pinging
let keepAliveStarted = false;
app.use((req, res, next) => {
  if (!keepAliveStarted) {
    const host = req.get('host') || '';
    if (host.includes('onrender.com')) {
      keepAliveStarted = true;
      const protocol = req.protocol || 'https';
      const fullUrl = `${protocol}://${host}`;
      console.log(`[Keep-Alive] Render host detected. Initiating self-ping loop targeting: ${fullUrl}`);
      
      setInterval(async () => {
        try {
          const pingRes = await fetch(`${fullUrl}/api`);
          console.log(`[Keep-Alive] Pinged ${fullUrl}/api - Status: ${pingRes.status}`);
        } catch (err) {
          console.warn(`[Keep-Alive] Ping failed:`, err.message);
        }
      }, 10 * 60 * 1000); // Ping every 10 minutes
    }
  }
  next();
});
app.use(express.static(CLIENT_DIST_DIR, {
  setHeaders: (res, filepath) => {
    if (path.basename(filepath) === 'index.html') {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// ────────────────────────────────────────────────────────────
// Routes
// ────────────────────────────────────────────────────────────
app.get('/api', (req, res) => {
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

// Google site verification route
app.get('/google6466252c33b6da5c.html', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', '..', 'google6466252c33b6da5c.html'));
});

// Sitemap route
app.get('/sitemap.xml', (req, res) => {
  const host = req.get('host');
  const protocol = req.protocol;
  const baseUrl = `${protocol}://${host}`;

  const tabs = [
    '',
    '?tab=bollywood',
    '?tab=southindian',
    '?tab=punjabi',
    '?tab=hollywood',
    '?tab=indianwebseries',
    '?tab=indiantvshows',
    '?tab=hollywoodtvshows',
    '?tab=korean',
    '?tab=japanese'
  ];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  tabs.forEach(tab => {
    const url = tab ? `${baseUrl}/${tab}` : `${baseUrl}/`;
    xml += '  <url>\n';
    xml += `    <loc>${url}</loc>\n`;
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>' + (tab === '' ? '1.0' : '0.8') + '</priority>\n';
    xml += '  </url>\n';
  });

  xml += '</urlset>';

  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

// Catch-all route to serve React's index.html for client-side routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.sendFile(path.join(CLIENT_DIST_DIR, 'index.html'));
});

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
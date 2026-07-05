import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { VIDEOS_DIR, THUMBS_DIR } from '../config.js';
import { getMovieById } from '../storage.js';

const router = Router();

// ────────────────────────────────────────────────────────────
// GET /api/stream/:id  — stream the video file with HTTP Range support
// (allows seeking / scrubbing in the <video> player)
// ────────────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const movie = getMovieById(req.params.id);
  if (!movie || !movie.videoFile) {
    return res.status(404).json({ error: 'Movie not found' });
  }

  const filePath = path.join(VIDEOS_DIR, movie.videoFile);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Video file missing on disk' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // Common MIME types for self-hosted videos
  const ext = path.extname(filePath).toLowerCase();
  const mime = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mkv': 'video/x-matroska',
    '.ogg': 'video/ogg',
    '.mov': 'video/quicktime',
  }[ext] || 'application/octet-stream';

  if (range) {
    // ── Partial content (seeking) ──
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    const stream = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': mime,
    });
    stream.pipe(res);
  } else {
    // ── Full file ──
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': mime,
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

// ────────────────────────────────────────────────────────────
// GET /api/stream/thumbnail/:id  — serve a movie's thumbnail,
// or auto-generate a placeholder SVG if no image was uploaded.
// ────────────────────────────────────────────────────────────
router.get('/thumbnail/:id', (req, res) => {
  const movie = getMovieById(req.params.id);
  if (!movie) {
    return res.status(404).json({ error: 'Movie not found' });
  }

  // If a real thumbnail file exists, serve it.
  if (movie.thumbnail) {
    const filePath = path.join(THUMBS_DIR, movie.thumbnail);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
  }

  // Otherwise generate an SVG placeholder on the fly.
  const title = (movie.title || 'JaNixFlix').slice(0, 40);
  const genre = movie.genre || '';
  const year = movie.year || '';
  const safeTitle = escapeXml(title);
  const safeGenre = escapeXml([genre, year].filter(Boolean).join(' • '));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1a1a1a"/>
        <stop offset="100%" stop-color="#2a2a2a"/>
      </linearGradient>
    </defs>
    <rect width="400" height="600" fill="url(#g)"/>
    <rect x="0" y="0" width="400" height="6" fill="#e50914"/>
    <text x="200" y="280" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="bold" fill="#ffffff" text-anchor="middle">${safeTitle}</text>
    <text x="200" y="320" font-family="Helvetica, Arial, sans-serif" font-size="16" fill="#b3b3b3" text-anchor="middle">${safeGenre}</text>
    <text x="200" y="560" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="800" fill="#e50914" text-anchor="middle">JANIXFLIX</text>
  </svg>`;

  res.set('Content-Type', 'image/svg+xml');
  res.set('Cache-Control', 'public, max-age=3600');
  return res.send(svg);
});

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default router;

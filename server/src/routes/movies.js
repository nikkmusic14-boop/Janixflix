import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { getAllMovies, getMovieById, addMovie, updateMovie, deleteMovie } from '../storage.js';
import { VIDEOS_DIR, THUMBS_DIR, MAX_UPLOAD_BYTES } from '../config.js';

const router = Router();


// ────────────────────────────────────────────────────────────
// GET /api/movies — list all (optionally filter by genre)
// ────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  let movies = getAllMovies();
  if (req.query.genre) {
    movies = movies.filter(m => m.genre?.toLowerCase() === String(req.query.genre).toLowerCase());
  }
  if (req.query.q) {
    const q = String(req.query.q).toLowerCase();
    movies = movies.filter(m =>
      m.title?.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q)
    );
  }
  res.json(movies);
});

// ────────────────────────────────────────────────────────────
// GET /api/movies/featured — for hero banner
// ────────────────────────────────────────────────────────────
router.get('/featured', (req, res) => {
  const featured = getAllMovies().filter(m => m.featured);
  const pick = featured.length
    ? featured[Math.floor(Math.random() * featured.length)]
    : getAllMovies()[0];
  res.json(pick ?? null);
});

// ────────────────────────────────────────────────────────────
// GET /api/movies/:id
// ────────────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const movie = getMovieById(req.params.id);
  if (!movie) return res.status(404).json({ error: 'Movie not found' });
  res.json(movie);
});


// ────────────────────────────────────────────────────────────
// PUT /api/movies/:id — update metadata only (not files)
// ────────────────────────────────────────────────────────────
router.put('/:id', (req, res) => {
  const allowed = ['title', 'description', 'genre', 'year', 'duration', 'featured', 'rating'];
  const patch = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) patch[k] = req.body[k];
  }
  const updated = updateMovie(req.params.id, patch);
  if (!updated) return res.status(404).json({ error: 'Movie not found' });
  res.json(updated);
});

// ────────────────────────────────────────────────────────────
// DELETE /api/movies/:id — also removes files from disk
// ────────────────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const movie = getMovieById(req.params.id);
  if (!movie) return res.status(404).json({ error: 'Movie not found' });

  // Remove associated files
  if (movie.videoFile) {
    const vp = path.join(VIDEOS_DIR, movie.videoFile);
    if (fs.existsSync(vp)) fs.unlinkSync(vp);
  }
  if (movie.thumbnail) {
    const tp = path.join(THUMBS_DIR, movie.thumbnail);
    if (fs.existsSync(tp)) fs.unlinkSync(tp);
  }

  deleteMovie(req.params.id);
  res.json({ success: true });
});

export default router;

import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';
import { getAllMovies, getMovieById, addMovie, updateMovie, deleteMovie } from '../storage.js';
import { VIDEOS_DIR, THUMBS_DIR, MAX_UPLOAD_BYTES } from '../config.js';

const router = Router();

// ────────────────────────────────────────────────────────────
// Upload config — videos go to /videos, thumbnails to /thumbnails
// ────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'video') return cb(null, VIDEOS_DIR);
    if (file.fieldname === 'thumbnail') return cb(null, THUMBS_DIR);
    cb(null, VIDEOS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]+/gi, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'video' && !/^video\//.test(file.mimetype)) {
      return cb(new Error('Video file must be a video/* type'));
    }
    if (file.fieldname === 'thumbnail' && !/^image\//.test(file.mimetype)) {
      return cb(new Error('Thumbnail must be an image/* type'));
    }
    cb(null, true);
  },
});

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
// POST /api/movies/upload — multipart upload of video + thumbnail
// Form fields: title, description, genre, year, duration, featured, video, thumbnail
// ────────────────────────────────────────────────────────────
router.post('/upload', upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
]), (req, res) => {
  if (!req.files?.video?.[0]) {
    return res.status(400).json({ error: 'Video file is required' });
  }
  const videoFile = req.files.video[0];
  const thumbFile = req.files.thumbnail?.[0];

  const id = `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const movie = {
    id,
    title: req.body.title || videoFile.originalname,
    description: req.body.description || '',
    genre: req.body.genre || 'Unknown',
    year: req.body.year ? Number(req.body.year) : null,
    duration: req.body.duration ? Number(req.body.duration) : null,
    featured: String(req.body.featured).toLowerCase() === 'true',
    rating: req.body.rating ? Number(req.body.rating) : null,
    videoFile: videoFile.filename,
    thumbnail: thumbFile?.filename || null,
    createdAt: new Date().toISOString(),
  };

  addMovie(movie);
  res.status(201).json(movie);
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

import fs from 'node:fs';
import path from 'node:path';
import { DB_FILE, VIDEOS_DIR, THUMBS_DIR } from './config.js';

// Make sure storage folders exist
fs.mkdirSync(VIDEOS_DIR, { recursive: true });
fs.mkdirSync(THUMBS_DIR, { recursive: true });
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

/**
 * Tiny JSON-file "database". Movies live in catalog.json.
 * Persistent, no external DB needed for a self-hosted setup.
 */

export function readCatalog() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function writeCatalog(movies) {
  fs.writeFileSync(DB_FILE, JSON.stringify(movies, null, 2), 'utf-8');
}

export function getAllMovies() {
  return readCatalog();
}

export function getMovieById(id) {
  return readCatalog().find(m => m.id === id);
}

export function addMovie(movie) {
  const movies = readCatalog();
  movies.push(movie);
  writeCatalog(movies);
  return movie;
}

export function updateMovie(id, patch) {
  const movies = readCatalog();
  const idx = movies.findIndex(m => m.id === id);
  if (idx === -1) return null;
  movies[idx] = { ...movies[idx], ...patch, id };
  writeCatalog(movies);
  return movies[idx];
}

export function deleteMovie(id) {
  const movies = readCatalog();
  const next = movies.filter(m => m.id !== id);
  if (next.length === movies.length) return false;
  writeCatalog(next);
  return true;
}

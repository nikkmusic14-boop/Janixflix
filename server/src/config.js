import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve project + storage paths
export const ROOT_DIR = path.resolve(__dirname, '..', '..');
export const SERVER_DIR = path.resolve(__dirname, '..');
export const STORAGE_DIR = path.join(SERVER_DIR, 'storage');
export const VIDEOS_DIR = path.join(STORAGE_DIR, 'videos');
export const THUMBS_DIR = path.join(STORAGE_DIR, 'thumbnails');
export const DB_FILE = path.join(STORAGE_DIR, 'catalog.json');

export const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
export const MAX_UPLOAD_MB = process.env.MAX_UPLOAD_MB ? Number(process.env.MAX_UPLOAD_MB) : 2048;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

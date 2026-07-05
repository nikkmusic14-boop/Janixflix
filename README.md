# 🎬 JaNixFlix

A self-hosted movie streaming platform — full stack (Node/Express backend + React/Vite frontend).
Stream **your own legally-owned video files** in a Netflix-style UI.

> ⚠️ **Legal note:** This platform is for content **you own or have rights to distribute**.
> Upload only your own videos, public-domain films, CC-licensed content, or media you have
> explicit permission to host. You are responsible for what you stream.

---

## ✨ Features

- 🎞️ **Netflix-style UI** — dark theme, hero banner, genre rows, hover cards
- 🎥 **Video streaming** with seek/scrub support (HTTP Range requests)
- ⬆️ **Upload UI** — add movies + thumbnails via browser (multer on the backend)
- 🗂️ **Catalog DB** — simple JSON-file store (no external database needed)
- 🔍 **Search** by title/description, **filter** by genre
- 📱 **Responsive** — works on mobile and desktop
- 🌱 **Auto-seeds** 2 public-domain demo movies (Big Buck Bunny, Sintel) on first run

---

## 📁 Project structure

```
janixflix/
├── package.json            # root — runs both client + server together
├── server/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js        # Express app entry
│       ├── config.js       # paths, port, limits
│       ├── storage.js      # JSON "database" (catalog.json)
│       ├── seed.js         # downloads demo movies on first run
│       └── routes/
│           ├── movies.js   # CRUD + upload
│           └── stream.js   # video + thumbnail serving (Range support)
└── client/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api.js          # backend API client
        ├── styles.css      # Netflix dark theme
        ├── components/      # Navbar, MovieCard, MovieRow
        └── pages/          # Home, Detail, Watch, Upload
```

---

## 🚀 Quick start

### 1. Install everything

From the project root:

```bash
npm install            # installs the root runner (concurrently)
npm run install:all    # installs server + client dependencies
```

### 2. (Optional) Configure

```bash
cp server/.env.example server/.env       # tweak PORT, CORS origin, upload limit
cp client/.env.example client/.env.local # tweak backend URL if needed
```

Defaults work out of the box: server on `4000`, client on `5173`.

### 3. Run both in dev mode

```bash
npm run dev
```

This starts:
- Backend  → http://localhost:4000
- Frontend → http://localhost:5173  (opens automatically)

The first run will download 2 demo movies (~100 MB) so the UI looks alive.
Then open the **Upload** page to add your own.

---

## 🔌 API reference

Base URL: `http://localhost:4000`

| Method | Endpoint                       | Description                          |
|--------|--------------------------------|--------------------------------------|
| GET    | `/api/movies`                  | List all (`?q=`, `?genre=` filters)  |
| GET    | `/api/movies/featured`         | One featured movie (for hero)        |
| GET    | `/api/movies/:id`              | Single movie                         |
| POST   | `/api/movies/upload`           | Upload video + thumb (multipart)     |
| PUT    | `/api/movies/:id`              | Update metadata                      |
| DELETE | `/api/movies/:id`              | Delete movie + its files             |
| GET    | `/api/stream/:id`              | Stream video (Range/seek support)    |
| GET    | `/api/stream/thumbnail/:id`    | Serve thumbnail                      |

---

## 🎬 Adding your own movies

1. Open the **Upload** page in the UI, **or**
2. `curl` the API:

```bash
curl -X POST http://localhost:4000/api/movies/upload \
  -F "video=@/path/to/your-movie.mp4" \
  -F "thumbnail=@/path/to/poster.jpg" \
  -F "title=My Movie" \
  -F "genre=Drama" \
  -F "year=2024" \
  -F "featured=true"
```

Files are saved to `server/storage/videos/` and `server/storage/thumbnails/`.
Metadata lives in `server/storage/catalog.json`.

---

## 🏗️ Production notes

- The dev setup uses Vite's dev server for the frontend. For production, run
  `npm run build --prefix client` and serve `client/dist/` via a static host
  (or have Express serve it — see below).
- To serve the frontend from the same Express server (single origin, no CORS):
  add `app.use(express.static('../client/dist'))` and a catch-all route.
- For larger catalogs, swap `storage.js` for SQLite/Postgres — the route handlers
  stay the same.
- Put it behind a reverse proxy (Nginx/Caddy) with TLS for `api.janixflix.com`.

---

## 🧰 Tech stack

- **Backend:** Express 4, multer, morgan, cors
- **Frontend:** React 18, React Router 6, Vite 5
- **Storage:** filesystem + JSON (zero-config)

---

## ❓ Why self-hosted?

This project is intentionally built for **your own content**. There is no scraping,
no third-party piracy sources, no source-masking. You upload what you have rights to,
and JaNixFlix streams it beautifully. That keeps it legal and fully in your control.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function Upload() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', description: '', genre: '', year: '', duration: '', rating: '', featured: false,
  });
  const [video, setVideo] = useState(null);
  const [thumb, setThumb] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!video) return setError('Please choose a video file.');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('video', video);
      if (thumb) fd.append('thumbnail', thumb);
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('genre', form.genre);
      fd.append('year', form.year);
      fd.append('duration', form.duration);
      fd.append('rating', form.rating);
      fd.append('featured', String(form.featured));

      const created = await api.uploadMovie(fd);
      navigate(`/movie/${created.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="upload-page">
      <h1>Admin Panel - Upload a Movie</h1>
      <form className="form-card" onSubmit={submit}>
        <div className="field">
          <label>Video file *</label>
          <input type="file" accept="video/*" onChange={(e) => setVideo(e.target.files[0])} required />
        </div>
        <div className="field">
          <label>Thumbnail image</label>
          <input type="file" accept="image/*" onChange={(e) => setThumb(e.target.files[0])} />
        </div>
        <div className="field">
          <label>Title</label>
          <input type="text" value={form.title} onChange={set('title')} placeholder="Movie title" />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea value={form.description} onChange={set('description')} placeholder="Short synopsis..." />
        </div>
        <div className="field">
          <label>Genre</label>
          <input type="text" value={form.genre} onChange={set('genre')} placeholder="e.g. Action, Drama" />
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Year</label>
            <input type="number" value={form.year} onChange={set('year')} placeholder="2024" />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Duration (sec)</label>
            <input type="number" value={form.duration} onChange={set('duration')} placeholder="7200" />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Rating (0-10)</label>
            <input type="number" step="0.1" min="0" max="10" value={form.rating} onChange={set('rating')} placeholder="8.5" />
          </div>
        </div>
        <div className="field checkbox-row">
          <input type="checkbox" id="featured" checked={form.featured} onChange={set('featured')} />
          <label htmlFor="featured" style={{ marginBottom: 0 }}>Feature on home hero banner</label>
        </div>

        {error && <div style={{ color: 'var(--red)', marginBottom: 12, fontSize: 14 }}>{error}</div>}

        <button type="submit" className="btn btn-danger" disabled={busy}>
          {busy ? 'Uploading…' : 'Upload movie'}
        </button>
      </form>
    </div>
  );
}

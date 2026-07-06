import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function MovieCard({ movie }) {
  const getThumbUrl = () => {
    if (movie.source === 'netmirror') {
      return movie.backdrop_path || movie.thumbnail || '';
    }
    if (movie.source === 'okjatt') {
      return movie.thumbnail || '';
    }
    return api.thumbnailUrl(movie.id);
  };

  const getSourceBadge = () => {
    if (movie.source === 'netmirror') {
      return <span className="badge" style={{ background: '#0070f3' }}>FHD</span>;
    }
    if (movie.source === 'okjatt') {
      const q = movie.quality ? movie.quality.toUpperCase() : 'HD';
      return <span className="badge" style={{ background: '#00a000' }}>{q}</span>;
    }
    if (movie.featured) {
      return <span className="badge">Featured</span>;
    }
    return null;
  };

  // For Netmirror/OKJatt, we also need to know the media type (movie vs tv) on detail page
  const mediaTypeParam = movie.media_type ? `&type=${movie.media_type}` : '';
  const okjattHrefParam = movie.href ? `&href=${encodeURIComponent(movie.href)}` : '';
  const thumbParam = movie.thumbnail ? `&thumb=${encodeURIComponent(movie.thumbnail)}` : '';

  return (
    <Link className="card" to={`/movie/${movie.id}?source=${movie.source || 'local'}${mediaTypeParam}${okjattHrefParam}${thumbParam}`}>
      <div className="poster">
        <img
          src={getThumbUrl()}
          alt={movie.title}
          loading="lazy"
        />
        {getSourceBadge()}
      </div>
      <div className="info">
        <div className="title">{movie.title}</div>
        <div className="sub">
          {[
            movie.release_date || movie.year,
            movie.genre && (Array.isArray(movie.genre) ? movie.genre.join(', ') : movie.genre),
            movie.vote_average ? `★ ${movie.vote_average}` : movie.rating && `★ ${movie.rating}`
          ].filter(Boolean).join(' • ')}
        </div>
      </div>
    </Link>
  );
}

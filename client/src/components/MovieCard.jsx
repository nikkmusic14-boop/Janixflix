import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { getDisplayTitle } from '../utils.js';

export default function MovieCard({ movie }) {
  const getThumbUrl = () => {
    if (movie.source === 'netmirror') {
      return movie.backdrop_path || movie.thumbnail || movie.poster_path || movie.image || '';
    }
    if (movie.source === 'okjatt') {
      return movie.thumbnail || movie.poster_path || movie.backdrop_path || movie.image || '';
    }
    return movie.poster_path || movie.backdrop_path || movie.thumbnail || api.thumbnailUrl(movie.id);
  };

  const getSourceBadge = () => {
    if (movie.source === 'netmirror') {
      return <span className="badge" style={{ background: '#0070f3' }}>WEB-DL</span>;
    }
    if (movie.source === 'okjatt') {
      return <span className="badge" style={{ background: '#00a000' }}>WEB-DL</span>;
    }
    if (movie.featured) {
      return <span className="badge">WEB-DL</span>;
    }
    return <span className="badge" style={{ background: '#e50914' }}>WEB-DL</span>;
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
        <div className="title">{getDisplayTitle(movie.title)}</div>
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

import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { getDisplayTitle } from '../utils.js';

export default function MovieCard({ movie }) {
  const getThumbUrl = () => {
    if (movie.source === 'netmirror') {
      return movie.backdrop_path || movie.thumbnail || movie.poster_path || movie.image || '';
    }
    if (movie.source === 'hicine') {
      return movie.thumbnail || movie.poster_path || movie.backdrop_path || movie.image || '';
    }
    return movie.poster_path || movie.backdrop_path || movie.thumbnail || api.thumbnailUrl(movie.id);
  };

  const isTheaterPrint = (movie) => {
    const q = (movie.quality || '').toLowerCase();
    const t = (movie.title || '').toLowerCase();
    const theaterKeywords = ['cam', 'ts', 'hdcam', 'hdts', 'predvd', 'dvdscr', 'theater', 'print'];
    return theaterKeywords.some(keyword => q.includes(keyword) || t.includes(keyword));
  };

  const getSourceBadge = () => {
    const label = isTheaterPrint(movie) ? 'PVC' : 'WEB-DL';
    const bg = label === 'PVC' ? '#ff9800' : '#00a000'; // Orange for PVC, Green for WEB-DL
    return <span className="badge" style={{ background: bg }}>{label}</span>;
  };

  // For Netmirror/Hicine, we also need to know the media type (movie vs tv) on detail page
  const mediaTypeParam = movie.media_type ? `&type=${movie.media_type}` : '';
  const hicineHrefParam = movie.href ? `&href=${encodeURIComponent(movie.href)}` : '';
  const thumbParam = movie.thumbnail ? `&thumb=${encodeURIComponent(movie.thumbnail)}` : '';

  return (
    <Link className="card" to={`/movie/${movie.id}?source=${movie.source || 'local'}${mediaTypeParam}${hicineHrefParam}${thumbParam}`}>
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

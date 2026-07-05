import MovieCard from './MovieCard.jsx';

export default function MovieRow({ title, movies }) {
  if (!movies?.length) return null;
  return (
    <div className="row">
      <h2>{title}</h2>
      <div className="row-grid">
        {movies.map((m) => (
          <MovieCard key={m.id} movie={m} />
        ))}
      </div>
    </div>
  );
}

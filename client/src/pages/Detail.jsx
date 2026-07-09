import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useHistory } from '../hooks/useHistory';
import { getCleanBase } from '../utils.js';

const matchTitle = (a, b, movieYear) => {
  const cleanA = getCleanBase(a);
  const cleanB = getCleanBase(b);
  
  const extractYear = (str) => {
    if (!str) return null;
    const match = str.match(/\b(19|20)\d{2}\b/);
    return match ? match[0] : null;
  };
  
  const yearA = extractYear(a);
  const yearB = extractYear(b) || (movieYear ? movieYear.toString().match(/\b(19|20)\d{2}\b/)?.[0] : null);
  if (yearA && yearB && yearA !== yearB) {
    return false;
  }
  
  return cleanA === cleanB;
};

export default function Detail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { addViewHistory } = useHistory();

  // Route parameters
  const source = params.get('source') || 'local';
  const mediaType = params.get('type') || 'movie';
  const href = params.get('href') || '';

  // Core metadata states
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Server Specific resolved data
  const [server1Data, setServer1Data] = useState(null);
  const [server2Data, setServer2Data] = useState(null);
  const [activeServerTab, setActiveServerTab] = useState(source === 'netmirror' ? 'server1' : 'server2');
  const [serverFetching, setServerFetching] = useState(false);

  // Background lookup states
  const [oppositeLink, setOppositeLink] = useState(null);
  const [oppositeSearching, setOppositeSearching] = useState(false);
  const [audioTracks, setAudioTracks] = useState([]);
  
  const [hicineSeasonsData, setHicineSeasonsData] = useState({});
  const [fetchingHicineSeasons, setFetchingHicineSeasons] = useState(false);

  useEffect(() => {
    if (activeServerTab === 'server2' && server2Data?.type === 'tv_series' && server2Data.seasons) {
      setFetchingHicineSeasons(true);
      Promise.all(
        server2Data.seasons.map(async (s) => {
          try {
            const resolved = await api.external.hicine.getMediaSource(s.path);
            return { path: s.path, episodes: resolved?.episodes || [] };
          } catch (e) {
            return { path: s.path, episodes: [] };
          }
        })
      ).then((results) => {
        const newData = {};
        results.forEach(r => { newData[r.path] = r.episodes; });
        setHicineSeasonsData(newData);
        setFetchingHicineSeasons(false);
      });
    }
  }, [server2Data, activeServerTab]);

  // 1. Initial metadata loading
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setServer1Data(null);
    setServer2Data(null);
    setOppositeLink(null);
    setActiveServerTab(source === 'netmirror' ? 'server1' : 'server2');

    const loadData = async () => {
      try {
        if (source === 'netmirror') {
          const data = await api.external.netmirror.getDetails(mediaType, id);
          if (cancelled) return;
          
          if (data && data.results && data.results.length > 0) {
            const raw = data.results[0];
            const parsed = {
              id: raw.id,
              title: raw.title,
              description: raw.dis || 'No synopsis available.',
              thumbnail: raw.backdrop_path,
              year: raw.release_date,
              genre: Array.isArray(raw.genre) ? raw.genre.join(', ') : raw.genre,
              rating: raw.vote_average,
              seasons: raw.season || null,
              subjectid: raw.subjectid,
              dp: raw.dp,
              source: 'netmirror',
              mediaType
            };
            setMovie(parsed);
            setServer1Data(parsed);
          } else {
            throw new Error('Details not found on Server 1.');
          }
        } 
        else if (source === 'hicine') {
          const titleFromUrl = decodeURIComponent(href.split('/').pop().replace(/-download-\d+\.html$/, '').replace(/-complete\.html$/, '').replace(/-/g, ' '))
            .replace(/hicine\.bond\.com/gi, 'JaNixFlix')
            .replace(/hicine\.bond/gi, 'JaNixFlix')
            .replace(/hicine/gi, 'JaNixFlix')
            .replace(/ok-jatt/gi, 'JaNixFlix');
          const parsed = {
            id,
            title: titleFromUrl,
            description: 'Browse available episodes or stream directly in Hindi audio.',
            thumbnail: params.get('thumb') || '',
            year: '',
            genre: 'Premium Stream',
            rating: '',
            source: 'hicine',
            mediaType
          };
          setMovie(parsed);

          setServerFetching(true);
          const resolved = await api.external.hicine.getMediaSource(href);
          if (cancelled) return;
          setServer2Data(resolved);
          setServerFetching(false);
        } 
        else {
          const local = await api.getMovie(id);
          if (cancelled) return;
          const parsed = {
            ...local,
            source: 'local',
            mediaType: 'movie'
          };
          setMovie(local);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [id, source, mediaType, href]);

  // Record history when movie loads
  useEffect(() => {
    if (movie && movie.title) {
      addViewHistory({
        ...movie,
        poster_path: movie.thumbnail || movie.poster_path
      });
    }
  }, [movie]);

  // 2. Background search for the alternate server match
  useEffect(() => {
    if (!movie || !movie.title || source === 'local') return;
    setOppositeLink(null);
    setOppositeSearching(true);

    const baseTitle = getCleanBase(movie.title);

    const performSearch = async (query) => {
      if (source === 'netmirror') {
        return await api.external.hicine.search(query) || [];
      } else {
        const res = await api.external.netmirror.search(query);
        return res?.results || [];
      }
    };

    const runSearch = async () => {
      try {
        let results = await performSearch(baseTitle);
        if (results.length === 0) {
          const words = baseTitle.split(' ');
          if (words.length > 2) {
            const shortQuery = words.slice(0, 2).join(' ');
            results = await performSearch(shortQuery);
          }
        }

        const movieYear = movie.year ? movie.year.toString().match(/\b(19|20)\d{2}\b/)?.[0] : null;
        const match = results.find(item => matchTitle(item.title, movie.title, movieYear));
        if (match) {
          setOppositeLink(match);
          if (source === 'hicine') {
            const oType = match.media_type || 'movie';
            api.external.netmirror.getDetails(oType, match.id)
              .then(data => {
                if (data && data.results && data.results.length > 0) {
                  const raw = data.results[0];
                  const parsed = {
                    id: raw.id,
                    title: raw.title,
                    description: raw.dis || 'No synopsis available.',
                    thumbnail: raw.backdrop_path,
                    year: raw.release_date,
                    genre: Array.isArray(raw.genre) ? raw.genre.join(', ') : raw.genre,
                    rating: raw.vote_average,
                    seasons: raw.season || null,
                    subjectid: raw.subjectid,
                    dp: raw.dp,
                    source: 'netmirror',
                    mediaType: oType
                  };
                  setServer1Data(parsed);
                }
              }).catch(err => console.warn("Failed to prefetch Server 1 details:", err));
          }
        }
      } catch (err) {
        console.warn("Background match search failed:", err);
      } finally {
        setOppositeSearching(false);
      }
    };

    runSearch();
  }, [movie, source]);

  // 3. Background search for different audio languages of the same movie
  useEffect(() => {
    if (!movie?.title) {
      setAudioTracks([]);
      return;
    }

    const baseTitle = getCleanBase(movie.title);
    if (!baseTitle) return;

    const performSearch = async (query) => {
      if (source === 'netmirror') {
        const res = await api.external.netmirror.search(query);
        return res?.results || [];
      } else {
        return await api.external.hicine.search(query) || [];
      }
    };

    const runSearch = async () => {
      try {
        let results = await performSearch(baseTitle);
        if (results.length === 0) {
          const words = baseTitle.split(' ');
          if (words.length > 2) {
            const shortQuery = words.slice(0, 2).join(' ');
            results = await performSearch(shortQuery);
          }
        }

        const tracks = [];
        results.forEach(item => {
          if (matchTitle(item.title, movie.title)) {
            let lang = 'Original';
            const tLower = item.title.toLowerCase();
            if (tLower.includes('hindi') || tLower.includes('[hin]') || tLower.includes('dubbed') || tLower.includes('hin-')) lang = 'Hindi';
            else if (tLower.includes('english') || tLower.includes('[eng]') || tLower.includes('eng-')) lang = 'English';
            else if (tLower.includes('telugu') || tLower.includes('[tel]')) lang = 'Telugu';
            else if (tLower.includes('tamil') || tLower.includes('[tam]')) lang = 'Tamil';
            else if (tLower.includes('malayalam') || tLower.includes('[mal]')) lang = 'Malayalam';
            else if (tLower.includes('kannada') || tLower.includes('[kan]')) lang = 'Kannada';
            else if (tLower.includes('punjabi') || tLower.includes('[pun]')) lang = 'Punjabi';

            if (!tracks.some(t => t.language === lang)) {
              tracks.push({
                language: lang,
                id: item.id,
                dp: item.dp,
                href: item.path || item.href,
                title: item.title
              });
            }
          }
        });
        setAudioTracks(tracks);

        // Auto-redirect to Hindi track if current is not Hindi and a Hindi track is available
        const langPref = params.get('lang_pref');
        if (langPref !== 'user' && source === 'netmirror' && tracks.length > 0 && movie?.title) {
          const isCurrentHindi = movie.title.toLowerCase().includes('hindi') || 
                                 movie.title.toLowerCase().includes('[hin]') || 
                                 movie.title.toLowerCase().includes('dubbed') || 
                                 movie.title.toLowerCase().includes('hin-') ||
                                 (movie.genre && movie.genre.toLowerCase().includes('bollywood')) ||
                                 (params.get('tab') === 'bollywood');
                                 
          if (!isCurrentHindi) {
            const hindiTrack = tracks.find(t => t.language === 'Hindi');
            if (hindiTrack && hindiTrack.id !== movie.id && hindiTrack.id !== id) {
              console.log("[Auto-Language-Fallback]: Redirecting to Hindi track:", hindiTrack.title);
              navigate(`/detail/${hindiTrack.id}?source=netmirror&type=${mediaType}&tab=${params.get('tab') || ''}`, { replace: true });
            }
          }
        }
      } catch (err) {
        console.error("Failed to resolve audio tracks in Details:", err);
      }
    };

    runSearch();
  }, [movie?.title, source, params, id, mediaType, navigate]);

  // Lazy load Netmirror Details and play
  const playServer1FromScraper = async () => {
    if (!oppositeLink) return;
    setServerFetching(true);
    try {
      const oType = oppositeLink.media_type || 'movie';
      const data = await api.external.netmirror.getDetails(oType, oppositeLink.id);
      if (data && data.results && data.results.length > 0) {
        const raw = data.results[0];
        navigate(`/watch/${oppositeLink.id}?source=netmirror&type=${oType}&subjectid=${oppositeLink.id}&dp=${encodeURIComponent(raw.dp || '')}&title=${encodeURIComponent(raw.title || oppositeLink.title)}&tab=${params.get('tab') || ''}`);
      } else {
        alert("Server 1 stream links are unavailable.");
      }
    } catch (err) {
      alert("Error playing from Server 1: " + err.message);
    } finally {
      setServerFetching(false);
    }
  };

  // Toggle server selection specifically for web series episodes display
  const switchSeriesServerTab = async (targetServer) => {
    if (targetServer === activeServerTab) return;
    setActiveServerTab(targetServer);

    if (targetServer === 'server1' && !server1Data && oppositeLink) {
      setServerFetching(true);
      try {
        const oType = oppositeLink.media_type || 'movie';
        const data = await api.external.netmirror.getDetails(oType, oppositeLink.id);
        if (data && data.results && data.results.length > 0) {
          const raw = data.results[0];
          const parsed = {
            id: raw.id,
            title: raw.title,
            description: raw.dis || movie.description,
            thumbnail: raw.backdrop_path || movie.thumbnail,
            year: raw.release_date,
            genre: Array.isArray(raw.genre) ? raw.genre.join(', ') : raw.genre,
            rating: raw.vote_average,
            seasons: raw.season || null,
            subjectid: raw.subjectid,
            dp: raw.dp,
            source: 'netmirror',
            mediaType: oType
          };
          setServer1Data(parsed);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setServerFetching(false);
      }
    }
    else if (targetServer === 'server2' && !server2Data && oppositeLink) {
      setServerFetching(true);
      try {
        const resolved = await api.external.hicine.getMediaSource(oppositeLink.path || oppositeLink.href);
        setServer2Data(resolved);
      } catch (err) {
        console.error(err);
      } finally {
        setServerFetching(false);
      }
    }
  };

  // Load Hicine TV season page
  const handleLoadHicineSeason = async (seasonPath) => {
    setServerFetching(true);
    try {
      const resolved = await api.external.hicine.getMediaSource(seasonPath);
      setServer2Data(resolved);
    } catch (err) {
      console.error(err);
    } finally {
      setServerFetching(false);
    }
  };

  if (loading) return <div className="loading">Loading details…</div>;
  if (error) return <div className="empty-state"><h2>Title not found</h2><p>{error}</p></div>;
  if (!movie) return null;

  const bgUrl = server1Data?.thumbnail || movie.thumbnail || (source === 'local' ? api.thumbnailUrl(movie.id) : '');
  const ratingText = server1Data?.rating || movie.rating;
  const yearText = server1Data?.year || movie.year;
  const genreText = server1Data?.genre || movie.genre;

  const isTv = mediaType === 'tv' || (server2Data && (server2Data.type === 'tv_series' || server2Data.type === 'tv_season'));

  const getCurrentAudioLanguage = () => {
    const titleLower = (movie?.title || '').toLowerCase();
    if (titleLower.includes('hindi') || titleLower.includes('[hin]')) return 'Hindi Audio (Dubbed)';
    if (titleLower.includes('telugu') || titleLower.includes('[tel]')) return 'Telugu Audio (Dubbed)';
    if (titleLower.includes('tamil') || titleLower.includes('[tam]')) return 'Tamil Audio (Dubbed)';
    if (titleLower.includes('malayalam') || titleLower.includes('[mal]')) return 'Malayalam Audio (Dubbed)';
    if (titleLower.includes('punjabi') || titleLower.includes('[pun]')) return 'Punjabi Audio (Dubbed)';
    if (movie?.country) {
      const country = movie.country.toLowerCase();
      if (country.includes('japan')) return 'Japanese Audio (English Subs)';
      if (country.includes('korea')) return 'Korean Audio (English Subs)';
    }
    return 'English Audio (Original)';
  };
  const currentLang = getCurrentAudioLanguage();

  return (
    <div className="detail" style={{ paddingTop: '80px' }}>
      <div className="detail-hero">
        <div className="bg" style={{ 
          backgroundImage: bgUrl ? `url(${bgUrl})` : 'none',
          backgroundColor: '#1f1f1f'
        }} />
        <div className="info" style={{ position: 'relative', zIndex: 10 }}>
          <Link to="/" style={{ color: 'var(--text-dim)', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: '12px' }}>
            ← Back to Home
          </Link>
          
          <h1>{server1Data?.title || movie.title}</h1>
          
          <div className="meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '20px' }}>
            {[yearText, genreText, ratingText && `★ ${ratingText}`].filter(Boolean).join(' • ')}
          </div>

          {/* Audio Tracks indicator */}
          {source !== 'local' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-dim)' }}>🔊 Audio:</span>
                <span style={{ 
                  background: currentLang.includes('Hindi') ? 'rgba(255, 0, 127, 0.15)' : 'rgba(0, 243, 255, 0.15)', 
                  color: currentLang.includes('Hindi') ? '#ff007f' : '#00f3ff', 
                  border: currentLang.includes('Hindi') ? '1px solid rgba(255, 0, 127, 0.3)' : '1px solid rgba(0, 243, 255, 0.3)',
                  padding: '2px 10px', 
                  borderRadius: '12px',
                  fontWeight: 'bold'
                }}>
                  {currentLang}
                </span>
              </div>

              {/* Audio Switcher buttons if multiple tracks exist */}
              {(audioTracks.length > 1 || !audioTracks.some(t => t.language === 'Hindi')) && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  flexWrap: 'wrap',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  width: 'fit-content'
                }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-dim)', fontWeight: 'bold' }}>🔄 Switch Audio:</span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {audioTracks.map((track) => {
                      const isActive = source === 'netmirror' ? (track.id === movie.id || track.id === id) : (track.href === href || track.id === id);
                      const targetTo = source === 'netmirror' 
                        ? `/detail/${track.id}?source=netmirror&type=${mediaType}&tab=${params.get('tab') || ''}&lang_pref=user`
                        : `/detail/${track.id}?source=hicine&href=${encodeURIComponent(track.href)}&title=${encodeURIComponent(track.title)}`;
                      return (
                        <Link
                          key={track.id || track.href}
                          to={targetTo}
                          style={{
                            background: isActive ? 'linear-gradient(90deg, #00f3ff 0%, #ff007f 100%)' : '#222',
                            color: '#fff',
                            textDecoration: 'none',
                            border: isActive ? 'none' : '1px solid #444',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            boxShadow: isActive ? '0 0 10px rgba(0, 243, 255, 0.3)' : 'none',
                            cursor: isActive ? 'default' : 'pointer'
                          }}
                        >
                          {track.language}
                        </Link>
                      );
                    })}
                    
                    {/* Hindi Playback Button */}
                    {!audioTracks.some(t => t.language === 'Hindi') && (
                      <button
                        onClick={async () => {
                          const base = (movie?.title || '').replace(/\[.*\]/g, '').trim();
                          const btn = document.getElementById('btn-hindi-auto-detail');
                          if(btn) btn.innerText = 'Loading...';
                          
                          try {
                            const res = await api.external.netmirror.search(base + ' Hindi');
                            const tracks = res?.results || [];
                            const hindiTrack = tracks.find(r => r.title.toLowerCase().includes('hindi') || r.title.toLowerCase().includes('hin'));
                            
                            if (hindiTrack) {
                              navigate(`/detail/${hindiTrack.id}?source=netmirror&type=${mediaType}&tab=${params.get('tab') || ''}&lang_pref=user`);
                            } else {
                              if(btn) btn.innerText = 'Not Found';
                              setTimeout(() => { if(btn) btn.innerText = 'Hindi'; }, 2000);
                            }
                          } catch(err) {
                            if(btn) btn.innerText = 'Error';
                            setTimeout(() => { if(btn) btn.innerText = 'Hindi'; }, 2000);
                          }
                        }}
                        id="btn-hindi-auto-detail"
                        style={{
                          background: '#222',
                          color: '#fff',
                          border: '1px solid #444',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        Hindi
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 📡 TWO PLAY BUTTONS SET DIRECTLY SIDE-BY-SIDE FOR MOVIES */}
          {!isTv && (
            <div className="hero-buttons" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {/* Play Server 1 Button */}
              {source === 'netmirror' ? (
                <Link 
                  to={`/watch/${movie.id}?source=netmirror&type=movie&subjectid=${movie.id}&dp=${encodeURIComponent(movie.dp || '')}&title=${encodeURIComponent(movie.title)}&tab=${params.get('tab') || ''}`} 
                  className="btn btn-primary"
                  style={{ background: '#0070f3' }}
                >
                  ⚡ Play Stream Server 1 (FHD)
                </Link>
              ) : oppositeLink ? (
                <button 
                  onClick={playServer1FromScraper} 
                  className="btn btn-primary"
                  style={{ background: '#0070f3' }}
                  disabled={serverFetching}
                >
                  ⚡ Play Stream Server 1 (FHD)
                </button>
              ) : (
                <button className="btn btn-primary" style={{ background: '#0070f3', opacity: 0.5, cursor: 'default' }} disabled>
                  ⚡ Server 1 (Searching...)
                </button>
              )}

              {/* Play Server 2 Button */}
              {source === 'hicine' ? (
                <Link 
                  to={`/watch/${id}?source=hicine&href=${encodeURIComponent(href)}&title=${encodeURIComponent(movie.title)}`} 
                  className="btn btn-primary"
                  style={{ background: '#00a000' }}
                >
                  🔥 Play Stream Server 2 (HD)
                </Link>
              ) : oppositeLink ? (
                <Link 
                  to={`/watch/${id}?source=hicine&href=${encodeURIComponent(oppositeLink.path || oppositeLink.href)}&title=${encodeURIComponent(movie.title)}`} 
                  className="btn btn-primary"
                  style={{ background: '#00a000' }}
                >
                  🔥 Play Stream Server 2 (HD)
                </Link>
              ) : (
                <button className="btn btn-primary" style={{ background: '#00a000', opacity: 0.5, cursor: 'default' }} disabled>
                  🔥 Server 2 (Searching...)
                </button>
              )}

              {source === 'local' && (
                <Link to={`/watch/${movie.id}`} className="btn btn-primary">
                  ▶ Play Uploaded File
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="detail-body" style={{ position: 'relative', zIndex: 10 }}>
        <h3 style={{ marginBottom: 10 }}>Overview</h3>
        <p>{server1Data?.description || movie.description || 'No synopsis available.'}</p>
        
        {serverFetching ? (
          <div className="loading" style={{ padding: '40px 0' }}>Resolving play server details…</div>
        ) : (
          <>
            {/* ────────── WEB SERIES / TV EPISODES DISPLAY SWITCHER ────────── */}
            {isTv && (
              <div style={{ marginTop: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '18px' }}>Episodes Selection:</h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => switchSeriesServerTab('server1')}
                      disabled={!server1Data && !oppositeLink && oppositeSearching}
                      style={serverTabButtonStyle(activeServerTab === 'server1', '#0070f3')}
                    >
                      ⚡ Server 1 (FHD)
                    </button>
                    <button
                      onClick={() => switchSeriesServerTab('server2')}
                      disabled={!server2Data && !oppositeLink && oppositeSearching}
                      style={serverTabButtonStyle(activeServerTab === 'server2', '#00a000')}
                    >
                      🔥 Server 2 (HD)
                    </button>
                  </div>
                </div>

                {/* Server 1 (Netmirror) seasons grid */}
                {activeServerTab === 'server1' && server1Data && server1Data.seasons && (
                  <div>
                    {server1Data.seasons.map((season, sIdx) => {
                      const totalEpisodes = Number(season.ep || 0);
                      const episodesArr = Array.from({ length: totalEpisodes }, (_, i) => i + 1);
                      return (
                        <div key={sIdx} style={{ marginBottom: '24px' }}>
                          <h4 style={{ color: '#fff', marginBottom: '12px' }}>Season {season.se} ({totalEpisodes} Episodes)</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px' }}>
                            {episodesArr.map(epNum => (
                              <Link
                                key={epNum}
                                to={`/watch/${server1Data.id}?source=netmirror&type=tv&se=${season.se}&ep=${epNum}&subjectid=${server1Data.id}&dp=${encodeURIComponent(server1Data.dp || '')}&title=${encodeURIComponent(server1Data.title)}&tab=${params.get('tab') || ''}`}
                                className="btn btn-secondary"
                                style={{ padding: '8px 12px', justifyContent: 'center', fontSize: '13px' }}
                              >
                                Episode {epNum}
                              </Link>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Server 2 (Hicine) seasons/episodes grid */}
                {activeServerTab === 'server2' && server2Data && (
                  <div>
                    {server2Data.type === 'tv_series' && server2Data.seasons && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        {fetchingHicineSeasons ? (
                           <div className="loading" style={{ fontSize: '14px', margin: '20px 0' }}>Loading seasons...</div>
                        ) : (
                          server2Data.seasons.map((season, sIdx) => {
                            const episodes = hicineSeasonsData[season.path] || [];
                            if (episodes.length === 0) return null;
                            return (
                              <div key={sIdx}>
                                <h4 style={{ color: '#fff', marginBottom: '12px' }}>
                                  {season.title} ({episodes.length} Episodes)
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
                                  {episodes.map((ep, idx) => {
                                    // Extract episode number from title if possible, else just use index+1
                                    const epMatch = ep.title.match(/Episode\s+(\d+)/i);
                                    const epNum = epMatch ? epMatch[1] : (idx + 1);
                                    return (
                                      <Link
                                        key={idx}
                                        to={`/watch/${id}?source=hicine&href=${encodeURIComponent(ep.path)}&title=${encodeURIComponent(ep.title)}`}
                                        className="btn btn-secondary"
                                        style={{ padding: '8px 12px', justifyContent: 'center', fontSize: '13px' }}
                                      >
                                        Episode {epNum}
                                      </Link>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {server2Data.type === 'tv_season' && server2Data.episodes && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <h4 style={{ color: '#fff' }}>Select Episode:</h4>
                          <button 
                            onClick={async () => {
                              setServerFetching(true);
                              const resolved = await api.external.hicine.getMediaSource(href || (oppositeLink ? oppositeLink.path : ''));
                              setServer2Data(resolved);
                              setServerFetching(false);
                            }} 
                            className="btn" 
                            style={{ padding: '6px 12px', background: '#333', fontSize: '12px' }}
                          >
                            ↩ Back to Seasons
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                          {server2Data.episodes.map((ep, idx) => (
                            <Link
                              key={idx}
                              to={`/watch/${id}?source=hicine&href=${encodeURIComponent(ep.path)}&title=${encodeURIComponent(ep.title)}`}
                              className="btn btn-secondary"
                              style={{ padding: '10px 14px', justifyContent: 'flex-start', fontSize: '13px' }}
                            >
                              🎬 {ep.title}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// INLINE STYLING HELPERS
// ────────────────────────────────────────────────────────────

function serverTabButtonStyle(isActive, activeColor) {
  return {
    background: isActive ? activeColor : '#222',
    color: '#fff',
    border: isActive ? `1px solid ${activeColor}` : '1px solid #444',
    padding: '6px 14px',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    outline: 'none',
    boxShadow: isActive ? `0 4px 10px ${activeColor}30` : 'none'
  };
}

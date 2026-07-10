import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import MovieCard from '../components/MovieCard.jsx';
import { deDuplicateMovies } from '../utils.js';
import { useHistory } from '../hooks/useHistory';

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  
  // Read active category directly from URL params: 'home' | 'bollywood' | 'southindian' | 'punjabi' | 'hollywood' | 'webseries' | 'tvshows' | 'anime'
  const activeTab = searchParams.get('tab') || 'home';
  
  const { viewHistory } = useHistory();
  
  // Server selection state
  const [activeServer, setActiveServer] = useState(activeTab === 'anime' ? 'server2' : 'server1');
  
  // Catalog contents
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [allMovies, setAllMovies] = useState([]);
  const [lastApiPageFetched, setLastApiPageFetched] = useState(-1);

  // Home category content feeds
  const [homeBollywood, setHomeBollywood] = useState([]);
  const [homeSouth, setHomeSouth] = useState([]);
  const [homePunjabi, setHomePunjabi] = useState([]);
  const [homeHollywood, setHomeHollywood] = useState([]);
  const [homeIndianWebSeries, setHomeIndianWebSeries] = useState([]);
  const [homeHollywoodTV, setHomeHollywoodTV] = useState([]);
  const [homeKorean, setHomeKorean] = useState([]);
  const [homeAnime, setHomeAnime] = useState([]);
  const [localMovies, setLocalMovies] = useState([]);

  // Search result states
  const [searchLoading, setSearchLoading] = useState(false);
  const [netmirrorResults, setNetmirrorResults] = useState([]);
  const [hicineResults, setHicineResults] = useState([]);

  // Reset page and active server when category changes in URL
  useEffect(() => {
    const defaultServer = activeTab === 'anime' ? 'server2' : 'server1';
    const isSeries = activeTab === 'indianwebseries' || activeTab === 'indiantvshows' || activeTab === 'hollywoodtvshows' || activeTab === 'webseries' || activeTab === 'tvshows';
    const startPage = (defaultServer === 'server2' && isSeries) ? 1 : 0;
    setActiveServer(defaultServer);
    setPage(startPage);
    setAllMovies([]);
    setLastApiPageFetched(startPage - 1);
  }, [activeTab]);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  // Handle server switching
  const handleServerChange = (server) => {
    setActiveServer(server);
    const isSeries = activeTab === 'indianwebseries' || activeTab === 'indiantvshows' || activeTab === 'hollywoodtvshows' || activeTab === 'webseries' || activeTab === 'tvshows';
    const startPage = (server === 'server2' && isSeries) ? 1 : 0;
    setPage(startPage);
    setAllMovies([]);
    setLastApiPageFetched(startPage - 1);
  };

  // 1. Unified Search Logic
  useEffect(() => {
    if (q) {
      setSearchLoading(true);
      setError('');
      
      Promise.all([
        api.external.netmirror.search(q).then(res => res.results || []).catch(() => []),
        api.external.hicine.search(q).catch(() => [])
      ]).then(([netmirror, hicine]) => {
        setNetmirrorResults(deDuplicateMovies(netmirror).map(m => ({ ...m, source: 'netmirror' })));
        setHicineResults(deDuplicateMovies(hicine));
        setSearchLoading(false);
      }).catch(err => {
        setError(err.message);
        setSearchLoading(false);
      });
    }
  }, [q]);

  // 2. Fetch category listings
  useEffect(() => {
    if (q) return;

    let cancelled = false;
    setLoading(true);
    setError('');

    const loadCategory = async () => {
      try {
        let results = [];

        if (activeTab === 'home') {
          const [
            bollyRes,
            punjabiRes,
            hollyRes,
            indWebRes,
            hollyTvRes,
            koreanRes,
            animeRes
          ] = await Promise.allSettled([
            api.external.netmirror.list({ type: '1', cn: 'India', page: 1 }),
            api.external.hicine.search('Punjabi'), // Server 1 search is broken, fallback to Server 2
            api.external.netmirror.list({ type: '1', cn: 'US', page: 1 }),
            api.external.netmirror.list({ type: '2', cn: 'India', page: 1 }),
            api.external.netmirror.list({ type: '2', cn: 'US', page: 1 }),
            api.external.netmirror.list({ cn: 'Korea', page: 1 }),
            api.external.hicine.search('Anime'), // Server 1 search is broken, fallback to Server 2
            api.listMovies()
          ]);
          if (cancelled) return;
          
          const getRes = (res) => (res && res.status === 'fulfilled' && res.value && res.value.results) ? res.value.results : (res && res.status === 'fulfilled' && Array.isArray(res.value)) ? res.value : [];

          setHomeBollywood(deDuplicateMovies(getRes(bollyRes)).map(m => ({ ...m, source: 'netmirror' })).filter(m => !m.title.toLowerCase().includes('punjabi')).slice(0, 10));
          setHomePunjabi(deDuplicateMovies(getRes(punjabiRes)).map(m => ({ ...m, source: 'hicine' })).slice(0, 10));
          setHomeHollywood(deDuplicateMovies(getRes(hollyRes)).map(m => ({ ...m, source: 'netmirror' })).slice(0, 10));
          setHomeIndianWebSeries(deDuplicateMovies(getRes(indWebRes)).map(m => ({ ...m, source: 'netmirror' })).slice(0, 10));
          setHomeHollywoodTV(deDuplicateMovies(getRes(hollyTvRes)).map(m => ({ ...m, source: 'netmirror' })).slice(0, 10));
          setHomeKorean(deDuplicateMovies(getRes(koreanRes)).map(m => ({ ...m, source: 'netmirror' })).slice(0, 10));
          
          let animeMovies = deDuplicateMovies(getRes(animeRes))
            .map(m => ({ ...m, source: 'hicine' }))
            .filter(m => {
              const t = m.title.toLowerCase();
              return !t.includes('anime supremacy') && 
                     !t.includes('chô jigen kakumei anime') &&
                     !t.includes('kaun kitney paani mein') &&
                     !t.includes('leanne morgan');
            }).slice(0, 10);
          setHomeAnime(animeMovies);

          let localData = [];
          if (localRes && localRes.status === 'fulfilled' && Array.isArray(localRes.value)) {
             localData = localRes.value;
          } else if (localRes && localRes.status === 'fulfilled' && localRes.value && localRes.value.results) {
             localData = localRes.value.results;
          }
          setLocalMovies(localData.map(m => ({ ...m, source: 'local' })));

          setHomeSouth([]); // Not easily distinguishable from Bollywood
          setMovies([]);
          setLoading(false);
          return;
        }

        const isSeries = activeTab === 'indianwebseries' || activeTab === 'indiantvshows' || activeTab === 'hollywoodtvshows' || activeTab === 'webseries' || activeTab === 'tvshows';
        const startPage = (activeServer === 'server2' && isSeries) ? 1 : 0;

        let targetCount = 27;
        let startIndex = 0;
        if (page > startPage) {
          const k = page - startPage;
          targetCount = 27 + k * 18;
          startIndex = 27 + (k - 1) * 18;
        }
        const endIndex = targetCount;

        let tempAllMovies = [...allMovies];
        let currentLastApi = lastApiPageFetched;

        if (tempAllMovies.length < targetCount) {
          let apiPagePointer = lastApiPageFetched + 1;
          let attempts = 0;
          
          while (tempAllMovies.length < targetCount && attempts < 5) {
            let newItems = [];
            
            if (activeServer === 'server1') {
              const params = { page: apiPagePointer };
              
              if (activeTab === 'bollywood' || activeTab === 'southindian') {
                params.type = '1';
                params.cn = 'India';
                const data = await api.external.netmirror.list(params);
                if (cancelled) return;
                newItems = (data.results || [])
                  .map(m => ({ ...m, source: 'netmirror' }))
                  .filter(m => !m.title.toLowerCase().includes('punjabi'));
              } else if (activeTab === 'punjabi') {
                const data = await api.external.hicine.search('Punjabi', apiPagePointer);
                if (cancelled) return;
                newItems = (Array.isArray(data) ? data : []).map(m => ({ ...m, source: 'hicine' }));
              } else if (activeTab === 'anime') {
                const data = await api.external.hicine.search('Anime', apiPagePointer);
                if (cancelled) return;
                newItems = (Array.isArray(data) ? data : [])
                  .map(m => ({ ...m, source: 'hicine' }))
                  .filter(m => {
                    const t = m.title.toLowerCase();
                    return !t.includes('anime supremacy') && 
                           !t.includes('chô jigen kakumei anime') &&
                           !t.includes('kaun kitney paani mein') &&
                           !t.includes('leanne morgan');
                  });
              } else {
                if (activeTab === 'hollywood') {
                  params.type = '1';
                  params.cn = 'US';
                } else if (activeTab === 'webseries' || activeTab === 'indianwebseries' || activeTab === 'indiantvshows') {
                  params.type = '2';
                  params.cn = 'India';
                } else if (activeTab === 'tvshows' || activeTab === 'hollywoodtvshows') {
                  params.type = '2';
                  params.cn = 'US';
                } else if (activeTab === 'korean') {
                  params.cn = 'Korea';
                }
                const data = await api.external.netmirror.list(params);
                if (cancelled) return;
                newItems = (data.results || []).map(m => ({ ...m, source: 'netmirror' }));
              }
            } else {
              let categoryKey = activeTab;
              if (activeTab === 'home' || !activeTab) categoryKey = 'bollywood';
              else if (activeTab === 'webseries' || activeTab === 'indianwebseries' || activeTab === 'indiantvshows') categoryKey = 'indianwebseries';
              else if (activeTab === 'tvshows' || activeTab === 'hollywoodtvshows') categoryKey = 'hollywoodtvshows';

              const data = await api.external.hicine.list(categoryKey, apiPagePointer);
                if (cancelled) return;
                newItems = data.results || [];
                
                if (activeTab === 'anime') {
                  newItems = newItems.filter(m => {
                    const t = m.title.toLowerCase();
                    return !t.includes('anime supremacy') && 
                           !t.includes('chô jigen kakumei anime') &&
                           !t.includes('kaun kitney paani mein') &&
                           !t.includes('leanne morgan');
                  });
                }
              }

            if (newItems.length === 0) {
              break;
            }

            tempAllMovies = deDuplicateMovies([...tempAllMovies, ...newItems]);
            currentLastApi = apiPagePointer;
            apiPagePointer++;
            attempts++;
          }
          
          tempAllMovies.sort((a, b) => {
             const getDate = (m) => {
               if (!m) return 0;
               if (m.release_date) {
                 const d = new Date(m.release_date);
                 if (!isNaN(d.getTime())) return d.getTime();
               }
               if (m.year) {
                 const d = new Date(m.year.toString());
                 if (!isNaN(d.getTime())) return d.getTime();
               }
               return 0;
             };
             return getDate(b) - getDate(a);
          });
          
          setAllMovies(tempAllMovies);
          setLastApiPageFetched(currentLastApi);
        }

        const pageItems = tempAllMovies.slice(startIndex, endIndex);
        setMovies(pageItems);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    loadCategory();
    return () => { cancelled = true; };
  }, [activeTab, activeServer, page, q]);

  // Search layout view
  if (q) {
    if (searchLoading) return <div className="loading" style={{ paddingTop: '100px' }}>Searching stream servers…</div>;
    return (
      <div style={{ paddingTop: '100px', minHeight: '80vh' }}>
        <div className="row">
          <h2 style={{ marginBottom: 24 }}>Search Results for "{q}"</h2>

          {/* Server 1 results */}
          <div style={{ marginBottom: 40 }}>
            <h3 style={{ borderLeft: '4px solid #0070f3', paddingLeft: 10, marginBottom: 16 }}>Global Streams (Server 1)</h3>
            {netmirrorResults.length ? (
              <div className="row-grid">
                {netmirrorResults.map((m) => <MovieCard key={m.id} movie={m} />)}
              </div>
            ) : (
              <p style={{ color: 'var(--text-dim)', paddingLeft: 14 }}>No matches in global streams.</p>
            )}
          </div>

          {/* Server 2 results */}
          <div style={{ marginBottom: 40 }}>
            <h3 style={{ borderLeft: '4px solid #00a000', paddingLeft: 10, marginBottom: 16 }}>Premium Streams (Server 2)</h3>
            {hicineResults.length ? (
              <div className="row-grid">
                {hicineResults.map((m) => <MovieCard key={m.id} movie={m} />)}
              </div>
            ) : (
              <p style={{ color: 'var(--text-dim)', paddingLeft: 14 }}>No matches in premium streams.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const categoryTitles = {
    bollywood: 'Bollywood Movies',
    southindian: 'South Indian Dubbed Movies',
    punjabi: 'Punjabi Movies Feed',
    hollywood: 'Hollywood Movies',
    indianwebseries: 'Indian Web Series',
    indiantvshows: 'Indian TV Shows',
    hollywoodtvshows: 'Hollywood TV Shows',
    korean: 'Korean Dramas & Movies',
    japanese: 'Japanese Movies, Series & Anime'
  };

  const isServer2Series = activeServer === 'server2' && (
    activeTab === 'indianwebseries' ||
    activeTab === 'indiantvshows' ||
    activeTab === 'hollywoodtvshows' ||
    activeTab === 'webseries' ||
    activeTab === 'tvshows'
  );

  const startPage = isServer2Series ? 1 : 0;

  return (
    <div style={{ paddingTop: '100px' }}>
      {/* Sub-tabs for Server Selection */}
      {!loading && !error && activeTab !== 'home' && (
        <div className="filters-bar" style={{ 
          padding: '16px 48px 0', 
          display: 'flex', 
          justifyContent: 'center',
          gap: '12px' 
        }}>
          <button
            onClick={() => handleServerChange('server1')}
            style={serverButtonStyle(activeServer === 'server1', '#0070f3')}
          >
            ⚡ Stream Server 1 (FHD)
          </button>
          <button
            onClick={() => handleServerChange('server2')}
            style={serverButtonStyle(activeServer === 'server2', '#00a000')}
          >
            🔥 Stream Server 2 (HD)
          </button>
        </div>
      )}

      {/* Catalog Render View */}
      {loading ? (
        <div className="loading">Loading titles…</div>
      ) : error ? (
        <div className="empty-state">
          <h2>Could not load database</h2>
          <p>{error}</p>
        </div>
      ) : (
        <div className="catalog-container">
          {activeTab === 'home' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', marginTop: '10px' }}>
              
              {/* Row 1: 🕒 Recently Viewed */}
              {viewHistory && viewHistory.length > 0 && (
                <div>
                  <h3 style={{ borderLeft: '4px solid #ff007f', paddingLeft: '12px', fontSize: '18px', margin: '0 48px 10px' }}>
                    🕒 Recently Viewed
                  </h3>
                  <div className="home-row" style={{ overflowX: 'auto', display: 'flex', gap: '16px', padding: '0 48px 16px', scrollbarWidth: 'thin' }}>
                    {viewHistory.map((m) => (
                      <div key={m.id} style={{ minWidth: '160px', width: '160px', flexShrink: 0 }}>
                        <MovieCard movie={m} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Row 1.5: 🌟 Special Collection (Local DB) */}
              {localMovies.length > 0 && (
                <div>
                  <h3 style={{ borderLeft: '4px solid #00f3ff', paddingLeft: '12px', fontSize: '18px', margin: '0 48px 10px', textShadow: '0 0 10px rgba(0, 243, 255, 0.3)' }}>
                    🌟 Special Collection (Local DB)
                  </h3>
                  <div className="home-row">
                    {localMovies.map((m) => (
                      <MovieCard key={m.id} movie={m} />
                    ))}
                  </div>
                </div>
              )}

              {/* Row 2: 🎬 Bollywood & South Indian Movies */}
              {homeBollywood.length > 0 && (
                <div>
                  <h3 style={{ borderLeft: '4px solid #0070f3', paddingLeft: '12px', fontSize: '18px', margin: '0 48px 10px' }}>
                    🎬 Bollywood & South Indian Movies
                  </h3>
                  <div className="home-row">
                    {homeBollywood.map((m) => (
                      <MovieCard key={m.id} movie={m} />
                    ))}
                  </div>
                </div>
              )}

              {/* Row 3: 👳 Punjabi Movies */}
              {homePunjabi.length > 0 && (
                <div>
                  <h3 style={{ borderLeft: '4px solid #ffcc00', paddingLeft: '12px', fontSize: '18px', margin: '0 48px 10px' }}>
                    👳 Punjabi Movies
                  </h3>
                  <div className="home-row">
                    {homePunjabi.map((m) => (
                      <MovieCard key={m.id} movie={m} />
                    ))}
                  </div>
                </div>
              )}

              {/* Row 4: 🦅 Hollywood Movies */}
              {homeHollywood.length > 0 && (
                <div>
                  <h3 style={{ borderLeft: '4px solid #f30000', paddingLeft: '12px', fontSize: '18px', margin: '0 48px 10px' }}>
                    🦅 Hollywood Movies
                  </h3>
                  <div className="home-row">
                    {homeHollywood.map((m) => (
                      <MovieCard key={m.id} movie={m} />
                    ))}
                  </div>
                </div>
              )}

              {/* Row 5: 📺 Indian Web Series */}
              {homeIndianWebSeries.length > 0 && (
                <div>
                  <h3 style={{ borderLeft: '4px solid #00f3ff', paddingLeft: '12px', fontSize: '18px', margin: '0 48px 10px', textShadow: '0 0 10px rgba(0, 243, 255, 0.3)' }}>
                    📺 Indian Web Series
                  </h3>
                  <div className="home-row">
                    {homeIndianWebSeries.map((m) => (
                      <MovieCard key={m.id} movie={m} />
                    ))}
                  </div>
                </div>
              )}

              {/* Row 6: 🗽 Hollywood TV Shows */}
              {homeHollywoodTV.length > 0 && (
                <div>
                  <h3 style={{ borderLeft: '4px solid #a300cc', paddingLeft: '12px', fontSize: '18px', margin: '0 48px 10px' }}>
                    🗽 Hollywood TV Shows
                  </h3>
                  <div className="home-row">
                    {homeHollywoodTV.map((m) => (
                      <MovieCard key={m.id} movie={m} />
                    ))}
                  </div>
                </div>
              )}

              {/* Row 7: 🎎 Korean Dramas */}
              {homeKorean.length > 0 && (
                <div>
                  <h3 style={{ borderLeft: '4px solid #ff66b2', paddingLeft: '12px', fontSize: '18px', margin: '0 48px 10px' }}>
                    🎎 Korean Dramas & Movies
                  </h3>
                  <div className="home-row">
                    {homeKorean.map((m) => (
                      <MovieCard key={m.id} movie={m} />
                    ))}
                  </div>
                </div>
              )}

              {/* Row 8: ⛩️ Anime */}
              {homeAnime.length > 0 && (
                <div>
                  <h3 style={{ borderLeft: '4px solid #ff9f43', paddingLeft: '12px', fontSize: '18px', margin: '0 48px 10px' }}>
                    ⛩️ Anime
                  </h3>
                  <div className="home-row">
                    {homeAnime.map((m) => (
                      <MovieCard key={m.id} movie={m} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : movies.length > 0 ? (
            <div>
              {/* Featured Banner at page 0 */}
              {((activeServer === 'server2' && isServer2Series) ? page === 1 : page === 0) && movies[0] && (
                <div style={{
                  position: 'relative',
                  minHeight: 'clamp(280px, 40vw, 380px)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  marginBottom: '40px',
                  background: `linear-gradient(90deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.85) 45%, rgba(0, 0, 0, 0.4) 100%), url(${movies[0].backdrop_path || movies[0].image || movies[0].thumbnail || 'https://images.unsplash.com/photo-1574375927938-d5a98e8edd86?q=80&w=1000'}) no-repeat center/cover`,
                  border: '1px solid rgba(0, 243, 255, 0.15)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.9), 0 0 15px rgba(0, 243, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'clamp(20px, 4vw, 40px)',
                  gap: 'clamp(12px, 3vw, 30px)',
                  flexWrap: 'nowrap'
                }}>
                  <div style={{ flex: '1 1 180px', zIndex: 2 }}>
                    <span style={{ 
                      background: 'rgba(0, 243, 255, 0.15)', 
                      border: '1px solid var(--cyan)',
                      color: 'var(--cyan)', 
                      padding: '4px 10px', 
                      borderRadius: '4px', 
                      fontSize: 'clamp(9px, 2vw, 11px)', 
                      fontWeight: 'bold',
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      textShadow: '0 0 8px var(--cyan)',
                      display: 'inline-block'
                    }}>
                      ⚡ FEATURED STREAM
                    </span>
                    <h1 style={{ 
                      fontSize: 'clamp(20px, 4vw, 38px)', 
                      fontFamily: 'Outfit, sans-serif', 
                      color: '#fff', 
                      margin: '10px 0 12px 0',
                      textShadow: '0 2px 12px rgba(0,0,0,0.8)',
                      lineHeight: '1.2'
                    }}>
                      {movies[0].title}
                    </h1>
                    <p style={{ 
                      color: 'var(--text-dim)', 
                      fontSize: 'clamp(11px, 2vw, 13.5px)', 
                      lineHeight: '1.5',
                      marginBottom: 'clamp(16px, 3vw, 28px)',
                      display: '-webkit-box',
                      WebkitLineClamp: '3',
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textShadow: '0 1px 4px rgba(0,0,0,0.8)'
                    }}>
                      Stream this title in high definition with instant server caching. Experience seamless dual-audio options and custom streaming capabilities exclusively on JaNixFlix.
                    </p>
                    <button 
                      onClick={() => {
                        const m = movies[0];
                        const path = m.source === 'netmirror'
                          ? `/watch/${m.id}?source=netmirror&type=${m.media_type || 'movie'}&subjectid=${m.id}&dp=${encodeURIComponent(m.dp || '')}&title=${encodeURIComponent(m.title)}`
                          : `/watch/${m.id}?source=hicine&href=${encodeURIComponent(m.href || m.path)}&title=${encodeURIComponent(m.title)}`;
                        navigate(path);
                      }}
                      style={{
                        background: 'linear-gradient(90deg, var(--cyan) 0%, #00bcff 100%)',
                        color: '#000',
                        border: 'none',
                        padding: 'clamp(8px, 2vw, 12px) clamp(16px, 3vw, 28px)',
                        borderRadius: '6px',
                        fontSize: 'clamp(12px, 2vw, 14px)',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        boxShadow: '0 0 15px rgba(0, 243, 255, 0.45)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      ▶ Play Title
                    </button>
                  </div>
                  
                  {/* Featured Anime Image Box on the Right */}
                  <div style={{
                    flex: '0 0 auto',
                    zIndex: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    pointerEvents: 'none'
                  }}>
                    <div style={{
                      width: 'clamp(110px, 28vw, 180px)',
                      height: 'clamp(160px, 40vw, 260px)',
                      borderRadius: '8px',
                      border: '2px solid rgba(0, 243, 255, 0.4)',
                      boxShadow: '0 10px 30px rgba(0, 243, 255, 0.2)',
                      overflow: 'hidden',
                      background: '#0a0b1e'
                    }}>
                      <img 
                        src={movies[0].poster_path || movies[0].thumbnail || movies[0].backdrop_path || movies[0].image || 'https://images.unsplash.com/photo-1574375927938-d5a98e8edd86?q=80&w=1000'} 
                        alt={movies[0].title}
                        loading="lazy"
                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1574375927938-d5a98e8edd86?q=80&w=1000'; }}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>
                {categoryTitles[activeTab]} ({activeServer === 'server1' || activeTab === 'japanese' ? 'Server 1' : 'Server 2'}) — Page {isServer2Series ? page : (page + 1)}
              </h2>
              
              <div className="movie-grid">
                {movies.map((m) => (
                  <MovieCard key={m.id} movie={m} />
                ))}
              </div>
              
              {/* Pagination Controls */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '20px',
                marginTop: '48px',
                paddingBottom: '20px'
              }}>
                <button
                  onClick={() => {
                    if (page > startPage) setPage(page - 1);
                  }}
                  disabled={page === startPage}
                  className="btn"
                  style={paginationButtonStyle(page === startPage)}
                >
                  ← Previous Page
                </button>
                <span style={{ fontSize: '15px', fontWeight: 'bold' }}>
                  Page {isServer2Series ? page : (page + 1)}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={movies.length < (page === startPage ? 27 : 18)}
                  className="btn"
                  style={paginationButtonStyle(movies.length < (page === startPage ? 27 : 18))}
                >
                  Next Page →
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <h2>No titles found</h2>
              <p>No content resolved in this server category.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// INLINE STYLING HELPERS
// ────────────────────────────────────────────────────────────

function serverButtonStyle(isActive, activeColor) {
  return {
    background: isActive ? activeColor : '#222',
    color: '#fff',
    border: isActive ? `1px solid ${activeColor}` : '1px solid #444',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    outline: 'none',
    boxShadow: isActive ? `0 4px 10px ${activeColor}30` : 'none'
  };
}

function paginationButtonStyle(disabled) {
  return {
    background: disabled ? '#222' : '#fff',
    color: disabled ? '#555' : '#000',
    cursor: disabled ? 'default' : 'pointer',
    border: 'none',
    padding: '8px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    opacity: disabled ? 0.5 : 1,
    borderRadius: '4px'
  };
}

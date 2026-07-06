import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function Watch() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  // Query parameters
  const source = params.get('source') || 'local';
  const mediaType = params.get('type') || 'movie';
  const subjectid = params.get('subjectid') || '';
  const dp = params.get('dp') || '';
  const title = (params.get('title') || '')
    .replace(/okjatt\.bond\.com/gi, 'JaNixFlix')
    .replace(/okjatt\.bond/gi, 'JaNixFlix')
    .replace(/okjatt/gi, 'JaNixFlix')
    .replace(/ok-jatt/gi, 'JaNixFlix');
  const href = params.get('href') || '';
  const activeSe = Number(params.get('se') || 0);
  const activeEp = Number(params.get('ep') || 0);

  // States
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Server 1 (Netmirror) states
  const [netmirrorQualities, setNetmirrorQualities] = useState([]);
  const [netmirrorChromecastUrl, setNetmirrorChromecastUrl] = useState(null);
  const [activeNetmirrorUrl, setActiveNetmirrorUrl] = useState('');
  const [netmirrorLoading, setNetmirrorLoading] = useState(false);
  const [audioTracks, setAudioTracks] = useState([]);
  const [mirrors, setMirrors] = useState([]);
  const [mirrorIndex, setMirrorIndex] = useState(0);
  const [seasons, setSeasons] = useState([]); // TV seasons list for sidebar
  const [activeSeasonTab, setActiveSeasonTab] = useState(1);

  // Server 2 (OKJatt) states
  const [okjattVideoUrl, setOkjattVideoUrl] = useState('');
  const [okjattLoading, setOkjattLoading] = useState(false);
  const [okjattEpisodes, setOkjattEpisodes] = useState([]); // TV episodes list for sidebar

  // Universal Quality Selection
  const [selectedQuality, setSelectedQuality] = useState('1080p');

  // Video playback buffering states
  const [videoBuffering, setVideoBuffering] = useState(false);
  const bufferingHandlers = {
    onWaiting: () => setVideoBuffering(true),
    onPlaying: () => setVideoBuffering(false),
    onPause: () => setVideoBuffering(false),
    onSeeking: () => setVideoBuffering(true),
    onSeeked: () => setVideoBuffering(false),
    onCanPlay: () => setVideoBuffering(false),
    onStalled: () => setVideoBuffering(true),
  };

  const handleQualityChange = (qLabel) => {
    setSelectedQuality(qLabel);
    
    if (source === 'netmirror' && netmirrorQualities.length > 0) {
      const numeric = qLabel.replace('p', '');
      const match = netmirrorQualities.find(q => {
        const label = q.quality.toLowerCase();
        if (qLabel === '1080p') {
          return label.includes('1080') || label.includes('fhd') || label.includes('full hd');
        }
        return label.includes(numeric);
      });
      if (match) {
        setActiveNetmirrorUrl(match.url);
        return;
      }
      setActiveNetmirrorUrl(netmirrorQualities[0].url);
    } else {
      const currentVideo = videoRef.current;
      if (currentVideo) {
        const time = currentVideo.currentTime;
        const paused = currentVideo.paused;
        currentVideo.load();
        currentVideo.currentTime = time;
        if (!paused) {
          currentVideo.play().catch(() => {});
        }
      }
    }
  };

  // Volume Boost States & Refs
  const videoRef = useRef(null);
  const [boostActive, setBoostActive] = useState(false);
  const audioCtxRef = useRef(null);
  const gainNodeRef = useRef(null);
  const sourceNodeRef = useRef(null);

  // Automatic Web Audio API Volume Boost (2.5x for ALL streams)
  const handleAutoVolumeBoost = () => {
    if (!videoRef.current) return;

    // Check if the video source is same-origin (proxied) to prevent CORS muting
    const videoSrc = videoRef.current.currentSrc || videoRef.current.src || '';
    const isSameOrigin = videoSrc.startsWith('/') || videoSrc.startsWith(window.location.origin);

    if (!isSameOrigin) {
      return;
    }

    try {
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;

        const sourceNode = ctx.createMediaElementSource(videoRef.current);
        sourceNodeRef.current = sourceNode;

        const gainNode = ctx.createGain();
        gainNodeRef.current = gainNode;

        sourceNode.connect(gainNode);
        gainNode.connect(ctx.destination);
      }

      // Automatically boost gain to 2.5 (2.5x boost) for all same-origin videos
      gainNodeRef.current.gain.value = 2.5;
      setBoostActive(true);
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      console.log("[Auto Volume Boost]: Enabled 2.5x gain for stream.");
    } catch (err) {
      console.warn("[Auto Volume Boost Failed]:", err.message);
    }
  };

  // Reset audio context when stream changes
  useEffect(() => {
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
      gainNodeRef.current = null;
      sourceNodeRef.current = null;
      setBoostActive(false);
    }
  }, [activeNetmirrorUrl, okjattVideoUrl]);

  // Clean up AudioContext on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);



  // Opposite Server Switcher States
  const [oppositeLink, setOppositeLink] = useState(null);
  const [oppositeSearching, setOppositeSearching] = useState(false);

  // 1. Fetch movie metadata (Local or Netmirror for page title/sidebar)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const loadMetadata = async () => {
      try {
        if (source === 'netmirror') {
          // Get metadata and seasons list
          const data = await api.external.netmirror.getDetails(mediaType, id);
          if (cancelled) return;
          
          if (data && data.results && data.results.length > 0) {
            const raw = data.results[0];
            setMovie(raw);
            setSeasons(raw.season || []);
            if (raw.season && raw.season.length > 0) {
              setActiveSeasonTab(activeSe || raw.season[0].se);
            }
          }
        } 
        else if (source === 'okjatt') {
          // OKJatt simple metadata
          setMovie({ title: title || 'Premium Stream' });
        } 
        else {
          // Local
          const local = await api.getMovie(id);
          if (cancelled) return;
          setMovie(local);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadMetadata();
    return () => { cancelled = true; };
  }, [id, source, mediaType, activeSe, title]);

  // 2. Resolve Netmirror direct qualities & Chromecast URL
  useEffect(() => {
    const activeDp = dp || movie?.dp;
    if (source === 'netmirror' && subjectid && activeDp) {
      setNetmirrorLoading(true);
      setNetmirrorQualities([]);
      setNetmirrorChromecastUrl(null);
      setActiveNetmirrorUrl('');
      setError('');

      api.external.netmirror.getVideoSources({
        id: subjectid,
        se: activeSe,
        ep: activeEp,
        dp: activeDp,
        title: movie?.title || title,
        mirrorIndex
      }).then(data => {
        setNetmirrorQualities(data.qualities || []);
        setNetmirrorChromecastUrl(data.chromecastUrl);
        setMirrors(data.mirrors || []); // wait, mirrors is not returned by getVideoSources but let's keep it empty or mock it

        if (data.chromecastUrl) {
          setActiveNetmirrorUrl(data.chromecastUrl);
        } else if (data.qualities && data.qualities.length > 0) {
          // Look for a 1080p/FHD link
          const q1080 = data.qualities.find(q => {
            const label = q.quality.toLowerCase();
            return label.includes('1080') || label.includes('fhd') || label.includes('full hd');
          });
          
          if (q1080) {
            setActiveNetmirrorUrl(q1080.url);
            setSelectedQuality('1080p');
          } else {
            // Sort to select the highest quality link available
            const sortedQualities = [...data.qualities].sort((a, b) => {
              const getVal = (q) => {
                const label = q.quality.toLowerCase();
                if (label.includes('1080') || label.includes('fhd')) return 1080;
                if (label.includes('720') || label.includes('hd')) return 720;
                if (label.includes('480')) return 480;
                if (label.includes('360')) return 360;
                return 0;
              };
              return getVal(b) - getVal(a);
            });
            setActiveNetmirrorUrl(sortedQualities[0].url);
            const bestLabel = sortedQualities[0].quality.toLowerCase();
            if (bestLabel.includes('720')) setSelectedQuality('720p');
            else if (bestLabel.includes('480')) setSelectedQuality('480p');
            else setSelectedQuality('1080p');
          }
        } else {
          throw new Error('No streaming media links resolved from Server 1.');
        }
      }).catch(err => {
        console.error('[Stream Resolve Error]:', err.message);
        setError('Failed to resolve streaming sources from Server 1.');
      }).finally(() => {
        setNetmirrorLoading(false);
      });
    }
  }, [subjectid, activeSe, activeEp, dp, movie, title, mirrorIndex, source]);

  // 3. Resolve OKJatt streaming source link & episodes list
  useEffect(() => {
    if (source === 'okjatt' && href) {
      setOkjattLoading(true);
      setOkjattVideoUrl('');
      setOkjattEpisodes([]);
      setError('');
      api.external.okjatt.getMediaSource(href)
        .then(data => {
          if (data && data.videoUrl) {
            setOkjattVideoUrl(data.videoUrl);
            if (data.episodes) {
              setOkjattEpisodes(data.episodes);
            }
          } else {
            throw new Error('Failed to resolve direct streaming media link.');
          }
        })
        .catch(err => {
          console.error('[Resolve Stream Error]:', err.message);
          setError(err.message);
        })
        .finally(() => {
          setOkjattLoading(false);
        });
    }
  }, [href, source]);

  // 4. Background Search for the opposite stream server link
  const movieTitle = movie?.title || title;

  const getCleanBase = (t) => {
    if (!t) return '';
    return t
      .toLowerCase()
      .replace(/dubbed/g, '')
      .replace(/dual audio/g, '')
      .replace(/multi audio/g, '')
      .replace(/hindi/g, '')
      .replace(/english/g, '')
      .replace(/telugu/g, '')
      .replace(/tamil/g, '')
      .replace(/malayalam/g, '')
      .replace(/kannada/g, '')
      .replace(/punjabi/g, '')
      .replace(/bengali/g, '')
      .replace(/japanese/g, '')
      .replace(/korean/g, '')
      .replace(/[\[\(]hin[\]\)]/g, '')
      .replace(/[\[\(]eng[\]\)]/g, '')
      .replace(/[\[\(]tel[\]\)]/g, '')
      .replace(/[\[\(]tam[\]\)]/g, '')
      .replace(/\[.*\]/g, '')
      .replace(/\(.*\)/g, '')
      .replace(/\b(19|20)\d{2}\b/g, '') // remove year
      .replace(/s\d+ep\d+/g, '')
      .replace(/s\d+/g, '')
      .replace(/season\s+\d+/g, '')
      .replace(/episode\s+\d+/g, '')
      .replace(/ep\s+\d+/g, '')
      .replace(/-download-\d+\.html$/, '')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

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

  useEffect(() => {
    const cleanSearchTitle = (t) => {
      if (!t) return '';
      return t
        .replace(/S\d+Ep\d+/gi, '')
        .replace(/S\d+/gi, '')
        .replace(/Season\s+\d+/gi, '')
        .replace(/Episode\s+\d+/gi, '')
        .replace(/Ep\s+\d+/gi, '')
        .replace(/\[.*\]/g, '')
        .replace(/\(.*\)/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const searchTitle = cleanSearchTitle(movieTitle);
    if (!searchTitle) return;

    setOppositeLink(null);
    setOppositeSearching(true);

    const movieYearVal = movie?.year || movie?.release_date || '';
    const mYearMatch = movieYearVal.toString().match(/\b(19|20)\d{2}\b/)?.[0] || null;

    if (source === 'netmirror') {
      // Search OKJatt (Server 2) for this title
      api.external.okjatt.search(searchTitle)
        .then(res => {
          if (res && res.length > 0) {
            const match = res.find(item => matchTitle(item.title, movieTitle, mYearMatch));
            if (match) {
              setOppositeLink(match);
            }
          }
        })
        .catch(err => console.log("Opposite search failed:", err))
        .finally(() => setOppositeSearching(false));
    } 
    else if (source === 'okjatt') {
      // Search Netmirror (Server 1) for this title
      api.external.netmirror.search(searchTitle)
        .then(res => {
          if (res && res.results && res.results.length > 0) {
            const match = res.results.find(item => matchTitle(item.title, movieTitle, mYearMatch));
            if (match) {
              setOppositeLink(match);
            }
          }
        })
        .catch(err => console.log("Opposite search failed:", err))
        .finally(() => setOppositeSearching(false));
    }
  }, [movieTitle, source]);

  // 5. Background Search for different audio languages of the same movie (Server 1 only)
  useEffect(() => {
    const baseTitle = getCleanBase(movieTitle);
    if (!baseTitle) return;

    const performSearch = async (query) => {
      if (source === 'netmirror') {
        const res = await api.external.netmirror.search(query);
        return res?.results || [];
      } else {
        return await api.external.okjatt.search(query) || [];
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
          if (matchTitle(item.title, movieTitle)) {
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
      } catch (err) {
        console.error("Failed to resolve audio tracks:", err);
      }
    };

    runSearch();
  }, [movieTitle, source]);

  // Handle switching to Server 1 (FHD)
  const handleSwitchToServer1 = async () => {
    if (!oppositeLink) return;
    try {
      setLoading(true);
      const oppositeType = oppositeLink.media_type || 'movie';
      const details = await api.external.netmirror.getDetails(oppositeType, oppositeLink.id);
      if (details && details.results && details.results.length > 0) {
        const raw = details.results[0];
        navigate(`/watch/${oppositeLink.id}?source=netmirror&type=${oppositeType}&subjectid=${oppositeLink.id}&dp=${encodeURIComponent(raw.dp || '')}&title=${encodeURIComponent(raw.title || oppositeLink.title)}&se=1&ep=1`);
      } else {
        alert("Server 1 stream details are unavailable for this title.");
      }
    } catch (err) {
      alert("Error switching to Server 1: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle switching to Server 2 (HD)
  const handleSwitchToServer2 = () => {
    if (!oppositeLink) return;
    navigate(`/watch/${id}?source=okjatt&href=${encodeURIComponent(oppositeLink.path || oppositeLink.href)}&title=${encodeURIComponent(oppositeLink.title || movieTitle)}`);
  };

  // Navigate between Netmirror episodes inside player screen
  const handleNetmirrorEpChange = (seNum, epNum) => {
    navigate(`/watch/${id}?source=netmirror&type=${mediaType}&se=${seNum}&ep=${epNum}&subjectid=${subjectid}&dp=${encodeURIComponent(dp)}&title=${encodeURIComponent(movie?.title || title)}`);
  };

  const getCurrentAudioLanguage = () => {
    const t = movieTitle || '';
    const tLower = t.toLowerCase();
    
    if (tLower.includes('hindi') || tLower.includes('[hin]')) return 'Hindi Audio (Dubbed)';
    if (tLower.includes('english') || tLower.includes('[eng]')) return 'English Audio';
    if (tLower.includes('telugu')) return 'Telugu Audio';
    if (tLower.includes('tamil')) return 'Tamil Audio';
    if (tLower.includes('malayalam')) return 'Malayalam Audio';
    if (tLower.includes('kannada')) return 'Kannada Audio';
    if (tLower.includes('bengali')) return 'Bengali Audio';
    if (tLower.includes('punjabi')) return 'Punjabi Audio (Original)';
    
    const country = (movie?.cn || '').toLowerCase();
    if (country.includes('japan')) {
      return 'Japanese Audio (English Subtitles)';
    }
    if (country.includes('korea')) {
      return 'Korean Audio (English Subtitles)';
    }
    if (country.includes('united states') || country.includes('us') || country.includes('united kingdom') || country.includes('uk') || country.includes('canada')) {
      return 'English Audio (Original)';
    }
    if (country.includes('india') || country.includes('in')) {
      const tabParam = params.get('tab') || '';
      if (tabParam === 'southindian') return 'South Indian Audio (Original)';
      return 'Hindi Audio (Original)';
    }
    
    const tabParam = params.get('tab') || '';
    if (tabParam === 'korean') return 'Korean Audio (English Subtitles)';
    if (tabParam === 'japanese') return 'Japanese Audio (English Subtitles)';
    if (tabParam === 'southindian') return 'South Indian Audio (Original)';
    if (tabParam === 'hollywood') return 'English Audio (Original)';
    
    return 'Hindi Audio (Dubbed/Dual)';
  };
  const currentLang = getCurrentAudioLanguage();

  if (loading) return <div className="loading" style={{ paddingTop: '100px' }}>Loading streaming content…</div>;
  if (error && !okjattLoading) {
    return (
      <div className="empty-state" style={{ paddingTop: '120px' }}>
        <h2>Playback Error</h2>
        <p>{error}</p>
        <Link to="/" className="btn btn-secondary" style={{ marginTop: '16px' }}>Back to Home</Link>
      </div>
    );
  }

  const hasSidebar = (source === 'netmirror' && mediaType === 'tv' && seasons.length > 0) || (source === 'okjatt' && okjattEpisodes.length > 0);

  return (
    <div className="player-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '90px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '14px', textDecoration: 'none', cursor: 'pointer', padding: 0 }}
        >
          ← Back to Catalog
        </button>
        
        {/* Source info tags - completely hidden Netmirror/OKJatt brand names */}
        <span style={{ 
          background: source === 'netmirror' ? '#0070f3' : source === 'okjatt' ? '#00a000' : 'var(--red)',
          fontSize: '11px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          padding: '4px 10px',
          borderRadius: '4px'
        }}>
          {source === 'netmirror' ? 'Server 1 (FHD)' : source === 'okjatt' ? 'Server 2 (HD)' : 'Local library'}
        </span>
      </div>

      <h1>
        {movieTitle} 
        {source === 'netmirror' && mediaType === 'tv' && ` — Season ${activeSe} Ep ${activeEp}`}
      </h1>

      {/* Main Streaming Display Section */}
      <div className="video-layout-container" style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: '24px',
        alignItems: 'flex-start'
      }}>
        {/* The video screen container */}
        <div style={{ flex: '1 1 700px' }}>
          <div className="player" style={{ position: 'relative', overflow: 'hidden', width: '100%', background: '#000' }}>
            {source === 'local' && (
              <video
                ref={videoRef}
                controls
                autoPlay
                playsInline
                poster={api.thumbnailUrl(id)}
                src={api.streamUrl(id)}
                onPlay={(e) => {
                  handleAutoVolumeBoost();
                  setVideoBuffering(false);
                }}
                {...bufferingHandlers}
              >
                Your browser does not support HTML5 video player.
              </video>
            )}

            {source === 'netmirror' && (
              netmirrorLoading ? (
                <div className="loading" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    fontFamily: 'Outfit, sans-serif', 
                    fontWeight: 800, 
                    fontSize: '36px', 
                    letterSpacing: '1px',
                    userSelect: 'none',
                    animation: 'pulse-loader 1.5s ease-in-out infinite alternate'
                  }}>
                    <span style={{ color: '#00f3ff', textShadow: '0 0 15px rgba(0, 243, 255, 0.6), 0 0 30px rgba(0, 243, 255, 0.2)' }}>JANI</span>
                    <span style={{ color: '#ffffff', fontWeight: 300, fontSize: '30px', margin: '0 5px', textShadow: '0 0 10px rgba(255, 255, 255, 0.8)', fontStyle: 'italic' }}>x</span>
                    <span style={{ color: '#ff0055', textShadow: '0 0 15px rgba(255, 0, 85, 0.6), 0 0 30px rgba(255, 0, 85, 0.2)' }}>FLIX</span>
                  </div>
                </div>
              ) : activeNetmirrorUrl ? (
                <video
                  key={activeNetmirrorUrl}
                  ref={videoRef}
                  controls
                  autoPlay
                  playsInline
                  src={(window.location.hostname.includes('onrender.com') || activeNetmirrorUrl === netmirrorChromecastUrl) ? activeNetmirrorUrl : api.external.netmirror.getProxyUrl(activeNetmirrorUrl)}
                  style={{ width: '100%', height: '100%' }}
                  onPlay={(e) => {
                    handleAutoVolumeBoost();
                    setVideoBuffering(false);
                  }}
                  {...bufferingHandlers}
                >
                  Your browser does not support HTML5 direct video playback.
                </video>
              ) : (
                <div className="empty-state" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h3>Video stream failed to load</h3>
                  <p>Please try switching sever next to watch movie</p>
                </div>
              )
            )}

            {source === 'okjatt' && (
              okjattLoading ? (
                <div className="loading" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    fontFamily: 'Outfit, sans-serif', 
                    fontWeight: 800, 
                    fontSize: '36px', 
                    letterSpacing: '1px',
                    userSelect: 'none',
                    animation: 'pulse-loader 1.5s ease-in-out infinite alternate'
                  }}>
                    <span style={{ color: '#00f3ff', textShadow: '0 0 15px rgba(0, 243, 255, 0.6), 0 0 30px rgba(0, 243, 255, 0.2)' }}>JANI</span>
                    <span style={{ color: '#ffffff', fontWeight: 300, fontSize: '30px', margin: '0 5px', textShadow: '0 0 10px rgba(255, 255, 255, 0.8)', fontStyle: 'italic' }}>x</span>
                    <span style={{ color: '#ff0055', textShadow: '0 0 15px rgba(255, 0, 85, 0.6), 0 0 30px rgba(255, 0, 85, 0.2)' }}>FLIX</span>
                  </div>
                </div>
              ) : okjattVideoUrl ? (
                <video
                  ref={videoRef}
                  controls
                  autoPlay
                  playsInline
                  src={api.okjattProxyUrl(okjattVideoUrl)}
                  style={{ width: '100%', height: '100%' }}
                  onPlay={(e) => {
                    handleAutoVolumeBoost();
                    setVideoBuffering(false);
                  }}
                  {...bufferingHandlers}
                >
                  Your browser does not support HTML5 direct video playback.
                </video>
              ) : (
                <div className="empty-state" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h3>Video stream failed to load</h3>
                  <p>Please try switching sever next to watch movie</p>
                </div>
              )
            )}

            {/* Custom Buffering Overlay with brand logo */}
            {videoBuffering && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.75)',
                zIndex: 10,
                pointerEvents: 'none'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  fontFamily: 'Outfit, sans-serif', 
                  fontWeight: 800, 
                  fontSize: '42px', 
                  letterSpacing: '1.5px',
                  userSelect: 'none',
                  animation: 'pulse-loader 1.2s ease-in-out infinite alternate'
                }}>
                  <span style={{ color: '#00f3ff', textShadow: '0 0 15px rgba(0, 243, 255, 0.7), 0 0 30px rgba(0, 243, 255, 0.3)' }}>JANI</span>
                  <span style={{ color: '#ffffff', fontWeight: 300, fontSize: '32px', margin: '0 6px', textShadow: '0 0 10px rgba(255, 255, 255, 0.9)', fontStyle: 'italic' }}>x</span>
                  <span style={{ color: '#ff0055', textShadow: '0 0 15px rgba(255, 0, 85, 0.7), 0 0 30px rgba(255, 0, 85, 0.3)' }}>FLIX</span>
                </div>
              </div>
            )}
          </div>

          {/* Server Switcher / Audio Details Bar */}
          <div style={{ 
            marginTop: '20px', 
            padding: '16px', 
            background: 'var(--bg-elev)', 
            borderRadius: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {/* Dynamic Server Switcher Option */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-dim)', fontWeight: 'bold' }}>📡 Switch Play Server:</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={source === 'okjatt' ? handleSwitchToServer1 : undefined}
                  disabled={source === 'netmirror' || (source === 'okjatt' && !oppositeLink && !oppositeSearching) || oppositeSearching}
                  style={{
                    background: source === 'netmirror' ? '#0070f3' : '#333',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: source === 'netmirror' ? 'default' : (source === 'okjatt' && !oppositeLink) ? 'not-allowed' : 'pointer',
                    opacity: source === 'netmirror' ? 1 : (source === 'okjatt' && !oppositeLink) ? 0.4 : 1
                  }}
                >
                  Stream Server 1 (FHD) {oppositeSearching ? ' (Searching...)' : (source === 'okjatt' && !oppositeLink) ? ' (Unavailable)' : ''}
                </button>
                <button
                  onClick={source === 'netmirror' ? handleSwitchToServer2 : undefined}
                  disabled={source === 'okjatt' || (source === 'netmirror' && !oppositeLink && !oppositeSearching) || oppositeSearching}
                  style={{
                    background: source === 'okjatt' ? '#00a000' : '#333',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: source === 'okjatt' ? 'default' : (source === 'netmirror' && !oppositeLink) ? 'not-allowed' : 'pointer',
                    opacity: source === 'okjatt' ? 1 : (source === 'netmirror' && !oppositeLink) ? 0.4 : 1
                  }}
                >
                  Stream Server 2 (HD) {oppositeSearching ? ' (Searching...)' : (source === 'netmirror' && !oppositeLink) ? ' (Unavailable)' : ''}
                </button>
              </div>
            </div>

            {/* Universal Quality Selector */}
            {(!netmirrorLoading && !okjattLoading) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', borderTop: '1px solid #333', paddingTop: '12px', marginTop: '4px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-dim)', fontWeight: 'bold' }}>🎬 Video Quality:</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['1080p', '720p', '480p'].map((qLabel) => {
                    const isActive = selectedQuality === qLabel;
                    return (
                      <button
                        key={qLabel}
                        onClick={() => handleQualityChange(qLabel)}
                        style={{
                          background: isActive ? 'linear-gradient(90deg, #00f3ff 0%, #0070f3 100%)' : '#222',
                          color: '#fff',
                          border: isActive ? '1px solid #00f3ff' : '1px solid #444',
                          padding: '6px 16px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          boxShadow: isActive ? '0 0 10px rgba(0, 243, 255, 0.3)' : 'none',
                          transition: 'all 0.2s'
                        }}
                      >
                        {qLabel === '1080p' ? '1080p (FHD)' : qLabel === '720p' ? '720p (HD)' : '480p (SD)'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Audio Info Bar / Language Selector */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px', 
              borderTop: '1px solid #333', 
              paddingTop: '12px', 
              marginTop: '4px' 
            }}>
              {/* Playing Audio Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-dim)' }}>🔊 Playing Audio:</span>
                <span style={{ 
                  background: currentLang.includes('Hindi') ? 'rgba(255, 0, 127, 0.1)' : 'rgba(0, 243, 255, 0.1)', 
                  color: currentLang.includes('Hindi') ? '#ff007f' : '#00f3ff', 
                  border: currentLang.includes('Hindi') ? '1px solid rgba(255, 0, 127, 0.3)' : '1px solid rgba(0, 243, 255, 0.3)',
                  boxShadow: currentLang.includes('Hindi') ? '0 0 10px rgba(255, 0, 127, 0.2)' : '0 0 10px rgba(0, 243, 255, 0.2)',
                  padding: '4px 12px', 
                  borderRadius: '20px',
                  fontWeight: 'bold',
                  fontSize: '12.5px',
                  fontFamily: 'Outfit, sans-serif'
                }}>
                  {currentLang}
                </span>
              </div>

              {/* Audio Switcher buttons if multiple tracks exist */}
              {audioTracks.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-dim)', fontWeight: 'bold' }}>🔄 Switch Language:</span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {audioTracks.map((track) => {
                      const isActive = source === 'netmirror' 
                        ? track.id === subjectid 
                        : (track.href === href || track.id === id);
                      return (
                        <button
                          key={track.id}
                          onClick={() => {
                            if (isActive) return;
                            if (source === 'netmirror') {
                              navigate(`/watch/${track.id}?source=netmirror&type=${mediaType}&subjectid=${track.id}&dp=${encodeURIComponent(track.dp || '')}&title=${encodeURIComponent(track.title)}&se=${activeSe}&ep=${activeEp}`);
                            } else {
                              navigate(`/watch/${track.id}?source=okjatt&href=${encodeURIComponent(track.href)}&title=${encodeURIComponent(track.title)}`);
                            }
                          }}
                          style={{
                            background: isActive ? 'linear-gradient(90deg, #00f3ff 0%, #ff007f 100%)' : '#222',
                            color: '#fff',
                            border: isActive ? 'none' : '1px solid #444',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: isActive ? 'default' : 'pointer',
                            boxShadow: isActive ? '0 0 10px rgba(0, 243, 255, 0.3)' : 'none'
                          }}
                        >
                          {track.language}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>



          </div>
        </div>

        {/* TV Series Episode Sidebar (Unified sidebar for Server 1 & Server 2) */}
        {hasSidebar && (
          <div className="episode-sidebar" style={{
            flex: '1 1 280px',
            background: 'var(--bg-elev)',
            borderRadius: '6px',
            padding: '16px',
            maxHeight: '520px',
            overflowY: 'auto',
            border: '1px solid #222'
          }}>
            <h3 style={{ fontSize: '16px', marginBottom: '14px', color: '#fff' }}>Episode Guide</h3>
            
            {/* Server 1 (Netmirror) Season Tabs & Episodes */}
            {source === 'netmirror' && (
              <>
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '6px' }}>
                  {seasons.map((season, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveSeasonTab(season.se)}
                      style={{
                        background: activeSeasonTab === season.se ? '#0070f3' : '#333',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      Season {season.se}
                    </button>
                  ))}
                </div>

                {seasons.map((season) => {
                  if (season.se !== activeSeasonTab) return null;
                  const totalEpisodes = Number(season.ep || 0);
                  const episodesArr = Array.from({ length: totalEpisodes }, (_, i) => i + 1);

                  return (
                    <div key={season.se} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {episodesArr.map(epNum => {
                        const isActive = activeSe === season.se && activeEp === epNum;
                        return (
                          <button
                            key={epNum}
                            onClick={() => handleNetmirrorEpChange(season.se, epNum)}
                            style={{
                              background: isActive ? 'rgba(0,112,243,0.15)' : 'rgba(255,255,255,0.02)',
                              color: isActive ? '#0070f3' : 'var(--text-dim)',
                              border: isActive ? '1px solid #0070f3' : '1px solid #222',
                              padding: '10px 14px',
                              borderRadius: '4px',
                              textAlign: 'left',
                              fontSize: '13px',
                              cursor: 'pointer',
                              fontWeight: isActive ? 'bold' : 'normal',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              outline: 'none'
                            }}
                          >
                            <span>🎬 Episode {epNum}</span>
                            {isActive && <span style={{ fontSize: '10px', background: '#0070f3', color: '#fff', padding: '1px 5px', borderRadius: '3px' }}>Playing</span>}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </>
            )}

            {/* Server 2 (OKJatt) Scraped Episode List */}
            {source === 'okjatt' && okjattEpisodes.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {okjattEpisodes.map((ep, idx) => {
                  const isActive = href === ep.path;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        navigate(`/watch/${id}?source=okjatt&href=${encodeURIComponent(ep.path)}&title=${encodeURIComponent(ep.title)}`);
                      }}
                      style={{
                        background: isActive ? 'rgba(0,160,0,0.15)' : 'rgba(255,255,255,0.02)',
                        color: isActive ? '#00a000' : 'var(--text-dim)',
                        border: isActive ? '1px solid #00a000' : '1px solid #222',
                        padding: '10px 14px',
                        borderRadius: '4px',
                        textAlign: 'left',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontWeight: isActive ? 'bold' : 'normal',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        outline: 'none'
                      }}
                    >
                      <span style={{
                        maxWidth: '80%',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        🎬 {ep.title}
                      </span>
                      {isActive && <span style={{ fontSize: '10px', background: '#00a000', color: '#fff', padding: '1px 5px', borderRadius: '3px', flexShrink: 0 }}>Playing</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

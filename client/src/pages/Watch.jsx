import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api.js';
import { getCleanBase, cleanHicineTitle } from '../utils.js';
import ArtplayerComponent from '../components/ArtplayerComponent.jsx';

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

export default function Watch() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Query parameters
  const source = params.get('source') || 'local';
  const mediaType = params.get('type') || 'movie';
  const subjectid = params.get('subjectid') || '';
  const dp = params.get('dp') || '';
  const title = (params.get('title') || '')
    .replace(/hicine\.bond\.com/gi, 'JaNixFlix')
    .replace(/hicine\.bond/gi, 'JaNixFlix')
    .replace(/hicine/gi, 'JaNixFlix')
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

  // Server 2 (Hicine) states
  const [hicineVideoUrl, setHicineVideoUrl] = useState('');
  const [hicineQualities, setHicineQualities] = useState([]);
  const [hicineLoading, setHicineLoading] = useState(false);
  const [hicineEpisodes, setHicineEpisodes] = useState(location.state?.hicineEpisodes || []); // TV episodes list for sidebar

  // Universal Quality Selection
  const [selectedQuality, setSelectedQuality] = useState('1080p');

  // Video screen layout fit state ('contain', 'fill', or 'cover')
  const [videoFit, setVideoFit] = useState('contain');

  // Video playback pause state
  const [isPaused, setIsPaused] = useState(true);

  // Auto-play Next Episode
  const [autoPlayNext, setAutoPlayNext] = useState(() => {
    return localStorage.getItem('janixflix_autoplay') !== 'false';
  });

  const toggleAutoPlay = () => {
    setAutoPlayNext(prev => {
      const next = !prev;
      localStorage.setItem('janixflix_autoplay', next.toString());
      return next;
    });
  };

  const handleNextEp = useCallback(() => {
    if (source === 'netmirror' && mediaType === 'tv') {
      const currentSeason = seasons.find(s => s.se === activeSe);
      if (!currentSeason) return;
      const totalEp = Number(currentSeason.ep || 0);
      if (activeEp < totalEp) {
        navigate(`/watch/${id}?source=netmirror&type=tv&se=${activeSe}&ep=${activeEp + 1}&subjectid=${subjectid}&dp=${encodeURIComponent(dp)}&title=${encodeURIComponent(movie?.title || title)}`, { replace: true });
      } else {
        const nextSeason = seasons.find(s => s.se === activeSe + 1);
        if (nextSeason) {
          navigate(`/watch/${id}?source=netmirror&type=tv&se=${activeSe + 1}&ep=1&subjectid=${subjectid}&dp=${encodeURIComponent(dp)}&title=${encodeURIComponent(movie?.title || title)}`, { replace: true });
        }
      }
    } else if (source === 'hicine') {
      const currentIndex = hicineEpisodes.findIndex(ep => ep.path === href);
      if (currentIndex !== -1) {
        // Hicine episodes could be sorted either way. Let's try currentIndex - 1 and currentIndex + 1.
        // Usually, later episodes are at the bottom (currentIndex + 1), but sometimes top (currentIndex - 1).
        // We will default to currentIndex + 1 for next.
        if (currentIndex < hicineEpisodes.length - 1) {
          const next = hicineEpisodes[currentIndex + 1];
          navigate(`/watch/${id}?source=hicine&href=${encodeURIComponent(next.path)}&title=${encodeURIComponent(next.title)}`, { replace: true });
        }
      }
    }
  }, [source, mediaType, seasons, activeSe, activeEp, hicineEpisodes, href, id, subjectid, dp, movie, title, navigate]);

  const handlePrevEp = useCallback(() => {
    if (source === 'netmirror' && mediaType === 'tv') {
      if (activeEp > 1) {
        navigate(`/watch/${id}?source=netmirror&type=tv&se=${activeSe}&ep=${activeEp - 1}&subjectid=${subjectid}&dp=${encodeURIComponent(dp)}&title=${encodeURIComponent(movie?.title || title)}`, { replace: true });
      } else if (activeSe > 1) {
        const prevSeason = seasons.find(s => s.se === activeSe - 1);
        if (prevSeason) {
          const prevTotalEp = Number(prevSeason.ep || 0);
          navigate(`/watch/${id}?source=netmirror&type=tv&se=${activeSe - 1}&ep=${prevTotalEp}&subjectid=${subjectid}&dp=${encodeURIComponent(dp)}&title=${encodeURIComponent(movie?.title || title)}`, { replace: true });
        }
      }
    } else if (source === 'hicine') {
      const currentIndex = hicineEpisodes.findIndex(ep => ep.path === href);
      if (currentIndex !== -1 && currentIndex > 0) {
        const prev = hicineEpisodes[currentIndex - 1];
        navigate(`/watch/${id}?source=hicine&href=${encodeURIComponent(prev.path)}&title=${encodeURIComponent(prev.title)}`, { replace: true });
      }
    }
  }, [source, mediaType, seasons, activeSe, activeEp, hicineEpisodes, href, id, subjectid, dp, movie, title, navigate]);

  const triggerServer2Fallback = useCallback(async () => {
    try {
      const baseTitle = getCleanBase(movie?.title || title);
      if (baseTitle) {
        let results = await api.external.hicine.search(baseTitle);
        if (results && results.length === 0) {
          const words = baseTitle.split(' ');
          if (words.length > 2) {
            const shortQuery = words.slice(0, 2).join(' ');
            results = await api.external.hicine.search(shortQuery);
          }
        }
        
        const movieYear = movie?.release_date ? movie.release_date.match(/\b(19|20)\d{2}\b/)?.[0] : null;
        const match = results && results.find(item => matchTitle(item.title, movie?.title || title, movieYear));
        if (match) {
          console.log('[Fallback Found Server 2 Match]:', match.title);
          const data = await api.external.hicine.getMediaSource(match.path || match.href);
          if (data && data.videoUrl) {
            let targetHref = match.path || match.href;
            if (mediaType === 'tv' && data.episodes && data.episodes.length > 0) {
              const epNumStr = `ep${activeEp}`;
              const epMatch = data.episodes.find(ep => ep.title.toLowerCase().includes(epNumStr) || ep.path.toLowerCase().includes(`ep-${activeEp}`));
              if (epMatch) {
                targetHref = epMatch.path;
              } else if (data.episodes[activeEp - 1]) {
                targetHref = data.episodes[activeEp - 1].path;
              }
            }
            
            navigate(`/watch/${id}?source=hicine&href=${encodeURIComponent(targetHref)}&title=${encodeURIComponent(match.title)}`, { replace: true });
            return true;
          }
        }
      }
    } catch (fallbackErr) {
      console.error('[Fallback Search failed]:', fallbackErr.message);
    }
    return false;
  }, [id, mediaType, activeEp, movie, title, navigate]);

  const handleVideoError = useCallback(() => {
    console.warn("[Video Error]: Server 1 failed during playback. Attempting auto-fallback to Server 2...");
    triggerServer2Fallback();
  }, [triggerServer2Fallback]);

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

  const artInstanceRef = useRef(null);
  const availableQualities = useMemo(() => {
    let rawQualities = [];
    if (source === 'netmirror' && netmirrorQualities && netmirrorQualities.length > 0) {
      rawQualities = netmirrorQualities;
    } else if (source === 'hicine' && hicineQualities && hicineQualities.length > 0) {
      rawQualities = hicineQualities;
    }
    
    let labels = rawQualities.map(q => {
      let label = (q.quality || '').toLowerCase();
      if (label.includes('1080') || label.includes('fhd')) return '1080p';
      if (label.includes('720') || label.includes('hd')) return '720p';
      if (label.includes('480')) return '480p';
      if (label.includes('360')) return '360p';
      return null;
    }).filter(Boolean);

    let finalQualities = [...new Set(labels)];
    if (finalQualities.length === 0) {
       // fallback if parser didn't match standard names
       finalQualities = ['1080p', '720p', '480p'];
    }

    finalQualities.sort((a, b) => parseInt(b) - parseInt(a));
    return finalQualities;
  }, [source, netmirrorQualities, hicineQualities]);

  const handleQualityChange = (qLabel) => {
    setSelectedQuality(qLabel);
    
    const art = artInstanceRef.current;
    if (art && art.video) {
      // Save current progress immediately before quality change
      const time = art.video.currentTime;
      const cleanTitle = getCleanBase(movieTitle);
      if (cleanTitle) {
        const key = mediaType === 'tv' 
          ? `janixflix_progress_tv_${cleanTitle}_s${activeSe}_e${activeEp}`
          : `janixflix_progress_movie_${cleanTitle}`;
        localStorage.setItem(key, time.toString());
      }
    }

    if (source === 'netmirror' && netmirrorQualities.length > 0) {
      const numeric = qLabel.replace('p', '');
      const match = netmirrorQualities.find(q => {
        const label = q.quality.toLowerCase();
        if (qLabel === '1080p') {
          return label.includes('1080') || label.includes('fhd') || label.includes('full hd');
        }
        return label.includes(numeric);
      });
      
      const targetUrl = match ? match.url : netmirrorQualities[0].url;
      const proxyUrl = api.external.netmirror.getProxyUrl(targetUrl);
      setActiveNetmirrorUrl(targetUrl);
      
      if (artInstanceRef.current && artInstanceRef.current.switchUrl) {
        artInstanceRef.current.switchUrl(proxyUrl)
          .then(() => artInstanceRef.current.play())
          .catch(e => {
            console.warn('Quality switch play interrupted:', e);
          });
      }
    } else if (source === 'hicine' && hicineQualities.length > 0) {
      const numeric = qLabel.replace('p', '');
      const match = hicineQualities.find(q => {
        const label = q.quality.toLowerCase();
        if (qLabel === '1080p') {
          return label.includes('1080') || label.includes('fhd') || label.includes('full hd');
        }
        return label.includes(numeric);
      });
      
      const targetUrl = match ? match.url : hicineQualities[0].url;
      const proxyUrl = api.hicineProxyUrl(targetUrl);
      setHicineVideoUrl(targetUrl);
      
      if (artInstanceRef.current && artInstanceRef.current.switchUrl) {
        artInstanceRef.current.switchUrl(proxyUrl)
          .then(() => artInstanceRef.current.play())
          .catch(e => {
            console.warn('Quality switch play interrupted:', e);
          });
      }
    } else {
      if (art && art.video) {
        const time = art.video.currentTime;
        const paused = art.video.paused;
        art.video.load();
        art.video.currentTime = time;
        if (!paused) {
          art.video.play().catch(e => console.error("Playback interrupted:", e));
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

  // Global Fullscreen listener for iframes to force landscape on mobile
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
          window.screen.orientation.lock('landscape').catch((e) => console.log('Orientation lock failed:', e));
        }
      } else {
        if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
          window.screen.orientation.unlock();
        }
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Automatic Web Audio API Volume Boost (2.5x for ALL streams)
  const handleAutoVolumeBoost = () => {
    if (!videoRef.current) return;

    // Check if the video source is same-origin (proxied or blob) to prevent CORS muting
    const videoSrc = videoRef.current.currentSrc || videoRef.current.src || '';
    const isSameOrigin = videoSrc.startsWith('/') || videoSrc.startsWith(window.location.origin) || videoSrc.startsWith('blob:');

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

  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    
    if (!document.fullscreenElement) {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
      } else if (video.msRequestFullscreen) {
        video.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }, []);

  // Handle keyboard shortcuts (laptop keys)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in inputs or textareas
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }
      
      const video = videoRef.current;
      if (!video) return;
      
      switch (e.key.toLowerCase()) {
        case ' ': // Spacebar
          e.preventDefault(); // Prevent page scrolling
          togglePlayPause();
          break;
        case 'k': // YouTube play/pause shortcut
          e.preventDefault();
          togglePlayPause();
          break;
        case 'f': // F key for Fullscreen
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'arrowright':
        case 'l': // L key for Forward (3 seconds)
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 3);
          break;
        case 'arrowleft':
        case 'j': // J key for Rewind (3 seconds)
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 3);
          break;

        case 'arrowup': // Volume up by 10%
          e.preventDefault();
          video.muted = false;
          video.volume = Math.min(1, video.volume + 0.1);
          break;
        case 'arrowdown': // Volume down by 10%
          e.preventDefault();
          video.muted = false;
          video.volume = Math.max(0, video.volume - 0.1);
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [togglePlayPause, toggleFullscreen]);

  const handleTimeUpdate = (e) => {
    const video = e.target;
    if (!video || video.duration === 0) return;
    
    const cleanTitle = getCleanBase(movieTitle);
    if (!cleanTitle) return;
    
    let key;
    if (source === 'hicine' && href) {
      const safeHref = href.replace(/[^a-zA-Z0-9]/g, '_');
      key = `janixflix_progress_hicine_${safeHref}`;
    } else {
      key = mediaType === 'tv' 
        ? `janixflix_progress_tv_${cleanTitle}_s${activeSe}_e${activeEp}`
        : `janixflix_progress_movie_${cleanTitle}`;
    }
      
    if (video.currentTime > video.duration * 0.96) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, video.currentTime.toString());
    }
  };

  const handleLoadedMetadata = (e) => {
    const video = e.target;
    if (!video) return;
    
    const cleanTitle = getCleanBase(movieTitle);
    if (!cleanTitle) return;
    
    let key;
    if (source === 'hicine' && href) {
      const safeHref = href.replace(/[^a-zA-Z0-9]/g, '_');
      key = `janixflix_progress_hicine_${safeHref}`;
    } else {
      key = mediaType === 'tv' 
        ? `janixflix_progress_tv_${cleanTitle}_s${activeSe}_e${activeEp}`
        : `janixflix_progress_movie_${cleanTitle}`;
    }
      
    const savedTime = localStorage.getItem(key);
    let didSeek = false;
    
    if (savedTime) {
      const timeVal = parseFloat(savedTime);
      if (!isNaN(timeVal) && timeVal > 0) {
        // Only seek if we have a valid saved time
        // We removed timeVal < video.duration because duration might be NaN on initial load for some streams
        video.currentTime = timeVal;
        didSeek = true;
        console.log(`Resuming playback at ${timeVal}s`);
      }
    }

    if (!didSeek) {
      video.play().then(() => {
        setIsPaused(false);
      }).catch(err => {
        console.warn("Autoplay or resume failed to start automatically:", err.message);
        setIsPaused(true);
      });
    }
  };

  const handleSeeked = (e) => {
    const video = e.target;
    if (!video) return;
    
    console.log("Seek complete, initiating playback...");
    video.play().then(() => {
      setIsPaused(false);
    }).catch(err => {
      console.warn("Play failed after seeking:", err.message);
      setIsPaused(true);
    });
  };

  // Reset audio context and play state when stream changes
  useEffect(() => {
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
      gainNodeRef.current = null;
      sourceNodeRef.current = null;
      setBoostActive(false);
    }
  }, [activeNetmirrorUrl, hicineVideoUrl]);

  // Clean up AudioContext on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Adjust screen fit when source changes (Default to 'fill' for Server 2 / hicine to make it full screen)
  useEffect(() => {
    if (source === 'hicine') {
      setVideoFit('fill');
    } else {
      setVideoFit('contain');
    }
  }, [source]);



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

            const firstSeasonNum = raw.season && raw.season.length > 0 ? raw.season[0].se : 1;
            const currentSeason = raw.season && raw.season.find(s => s.se === activeSe);
            const seasonExists = !!currentSeason;
            const epExists = currentSeason && activeEp > 0 && activeEp <= Number(currentSeason.ep || 0);

            if (mediaType === 'tv' && (activeSe === 0 || activeEp === 0 || !seasonExists || !epExists)) {
              const targetSe = seasonExists ? activeSe : firstSeasonNum;
              const targetEp = (seasonExists && epExists) ? activeEp : 1;
              navigate(
                `/watch/${id}?source=netmirror&type=tv&se=${targetSe}&ep=${targetEp}&subjectid=${id}&dp=${encodeURIComponent(dp || raw.dp || '')}&title=${encodeURIComponent(title || raw.title || '')}`,
                { replace: true }
              );
              return;
            }

            if (raw.season && raw.season.length > 0) {
              setActiveSeasonTab(activeSe || raw.season[0].se);
            }
          }
        } 
        else if (source === 'hicine') {
          // Hicine simple metadata
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
      if (mediaType === 'tv' && (activeSe === 0 || activeEp === 0)) {
        return;
      }
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
      }).catch(async (err) => {
        console.error('[Stream Resolve Error]:', err.message);
        const fallbackSuccess = await triggerServer2Fallback();
        if (!fallbackSuccess) {
          setError(err.message || 'Failed to resolve streaming sources from Server 1.');
        }
      }).finally(() => {
        setNetmirrorLoading(false);
      });
    }
  }, [subjectid, activeSe, activeEp, dp, movie, title, mirrorIndex, source]);

  // 3. Resolve Hicine streaming source link & episodes list
  useEffect(() => {
    if (source === 'hicine' && href) {
      setHicineLoading(true);
      setHicineVideoUrl('');
      setHicineQualities([]);
      setError('');
      api.external.hicine.getMediaSource(href)
        .then(data => {
          if (data && data.videoUrl) {
            setHicineVideoUrl(data.videoUrl);
            if (data.qualities && data.qualities.length > 0) {
              setHicineQualities(data.qualities);
            }
            if (data.episodes) {
              setHicineEpisodes(data.episodes);
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
          setHicineLoading(false);
        });
    }
  }, [href, source]);

  // 4. Background Search for the opposite stream server link
  const movieTitle = movie?.title || title;

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
      // Search Hicine (Server 2) for this title
      api.external.hicine.search(searchTitle)
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
    else if (source === 'hicine') {
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
      const res = await api.external.netmirror.search(query);
      return res?.results || [];
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

        // Auto-redirect to Hindi track if current is not Hindi and a Hindi track is available
        const langPref = params.get('lang_pref');
        if (langPref !== 'user' && source === 'netmirror' && tracks.length > 0) {
          const isCurrentHindi = (movie?.title || title || '').toLowerCase().includes('hindi') || 
                                 (movie?.title || title || '').toLowerCase().includes('[hin]') || 
                                 (movie?.title || title || '').toLowerCase().includes('dubbed') || 
                                 (movie?.title || title || '').toLowerCase().includes('hin-') ||
                                 (params.get('tab') === 'bollywood');
                                 
          if (!isCurrentHindi) {
            const hindiTrack = tracks.find(t => t.language === 'Hindi');
            if (hindiTrack && hindiTrack.id !== id) {
              console.log("[Auto-Language-Fallback]: Redirecting to Hindi track player:", hindiTrack.title);
              navigate(`/watch/${hindiTrack.id}?source=netmirror&type=${mediaType}&subjectid=${hindiTrack.id}&dp=${encodeURIComponent(hindiTrack.dp || '')}&title=${encodeURIComponent(hindiTrack.title)}&se=${activeSe}&ep=${activeEp}&tab=${params.get('tab') || ''}`, { replace: true });
            }
          }
        }
      } catch (err) {
        console.error("Failed to resolve audio tracks:", err);
      }
    };

    runSearch();
  }, [movieTitle, source, params, id, mediaType, activeSe, activeEp, navigate]);

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
    navigate(`/watch/${id}?source=hicine&href=${encodeURIComponent(oppositeLink.path || oppositeLink.href)}&title=${encodeURIComponent(oppositeLink.title || movieTitle)}`);
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
    
    const country = (movie?.country || '').toLowerCase();
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
      if (tabParam === 'southindian' || tLower.includes('south')) return 'South Indian Audio (Original)';
      if (tLower.includes('punjabi') || tLower.includes('punj')) return 'Punjabi Audio (Original)';
      return 'Hindi Audio (Original)';
    }
    
    const tabParam = params.get('tab') || '';
    if (tabParam === 'korean') return 'Korean Audio (English Subtitles)';
    if (tabParam === 'japanese') return 'Japanese Audio (English Subtitles)';
    if (tabParam === 'southindian') return 'South Indian Audio (Original)';
    if (tabParam === 'hollywood') return 'English Audio (Original)';
    
    return 'Original Audio';
  };
  const currentLang = getCurrentAudioLanguage();

  if (loading) return <div className="loading" style={{ paddingTop: '100px' }}>Loading streaming content…</div>;
  if (error && !hicineLoading) {
    return (
      <div className="empty-state" style={{ paddingTop: '120px', maxWidth: '600px', margin: '0 auto', padding: '0 24px' }}>
        <h2 style={{ color: 'var(--red)', textShadow: '0 0 10px rgba(255,0,85,0.2)' }}>Playback Error</h2>
        <p style={{ color: 'var(--text-dim)', marginTop: '8px', marginBottom: '24px' }}>{error}</p>
        
        {source === 'netmirror' && (
          <div style={{
            background: 'var(--bg-elev)',
            border: '1px solid rgba(0, 243, 255, 0.15)',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>📡 Alternative Stream Available?</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '16px' }}>
              Server 1 database is currently offline or unreachable. We can try loading this title from Server 2 (Premium HD Stream).
            </p>
            {oppositeLink ? (
              <button
                onClick={handleSwitchToServer2}
                style={{
                  background: 'linear-gradient(90deg, #00f3ff 0%, #0070f3 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 0 15px rgba(0, 243, 255, 0.4)'
                }}
              >
                ⚡ Switch to Server 2 (HD)
              </button>
            ) : oppositeSearching ? (
              <div style={{ color: 'var(--cyan)', fontSize: '13.5px', fontWeight: 'bold' }}>
                🔍 Searching Server 2 for "{movieTitle}"...
              </div>
            ) : (
              <div style={{ color: '#aaa', fontSize: '13px' }}>
                😔 Sorry, this title is not available on Server 2 either.
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link to="/" className="btn btn-secondary">Back to Home</Link>
        </div>
      </div>
    );
  }

  const artplayerServerControls = [
    {
      name: 'audioTrack',
      position: 'right',
      html: 'Audio',
      index: 10,
      selector: [
        { html: 'Hindi', lang: 'hi' },
        { html: 'English', lang: 'en' },
        { html: 'Tamil', lang: 'ta' },
        { html: 'Telugu', lang: 'te' }
      ],
      onSelect: function (item) {
        artInstanceRef.current?.notice?.show('Audio track not available on this server. Try Server 2.');
        return 'Audio';
      }
    },
    {
      name: 'serverSwitch',
      position: 'right',
      html: 'Server',
      index: 11,
      selector: [
        { html: 'Server 1 (FHD)', server: 'server1', default: source === 'netmirror' },
        { html: 'Server 2 (HD)', server: 'server2', default: source === 'hicine' }
      ],
      onSelect: function (item) {
        if (item.server === 'server1' && source !== 'netmirror') {
          handleSwitchToServer1();
        } else if (item.server === 'server2' && source !== 'hicine') {
          handleSwitchToServer2();
        }
        return 'Server';
      }
    }
  ];

  const hasSidebar = (source === 'netmirror' && mediaType === 'tv' && seasons.length > 0) || (source === 'hicine' && hicineEpisodes.length > 0);

  return (
    <div className="player-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '14px', textDecoration: 'none', cursor: 'pointer', padding: 0 }}
        >
          ← Back to Catalog
        </button>
        
        {/* Source info tags - completely hidden Netmirror/Hicine brand names */}
        <span style={{ 
          background: source === 'netmirror' ? '#0070f3' : source === 'hicine' ? '#00a000' : 'var(--red)',
          fontSize: '11px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          padding: '4px 10px',
          borderRadius: '4px'
        }}>
          {source === 'netmirror' ? 'Server 1 (FHD)' : source === 'hicine' ? 'Server 2 (HD)' : 'Local library'}
        </span>
      </div>

      <h1>
        {cleanHicineTitle(movieTitle)} 
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
        <div style={{ flex: '1 1 700px', maxWidth: '100%', minWidth: 0 }}>
          <div className="player" style={{ position: 'relative', overflow: 'hidden', width: '100%', paddingTop: '56.25%', background: '#000', minHeight: '260px' }}>
            {source === 'local' && movie?.videoFile?.includes('drive.google.com') ? (
              <iframe
                title="Google Drive Video Player"
                src={movie.videoFile.replace('/view', '/preview').replace('?usp=drive_link', '')}
                allowFullScreen
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              />
            ) : source === 'local' ? (
              <ArtplayerComponent
                option={{
                  url: movie?.videoFile?.startsWith('http') ? movie.videoFile : api.streamUrl(id),
                  type: (movie?.videoFile?.includes('.m3u8') || api.streamUrl(id).includes('.m3u8')) ? 'm3u8' : 'auto',
                  poster: api.thumbnailUrl(id),
                  autoplay: true,
                  volume: 1,
                  isLive: false,
                  muted: false,
                  theme: '#00f3ff',
                  fullscreen: true,
                  fullscreenWeb: true,
                  setting: true,
                  playbackRate: true,
                  aspectRatio: true,
                  miniProgressBar: true,
                  playsInline: true,
                  setting: true,
                  controls: [
                    {
                      name: 'audioTrack',
                      position: 'right',
                      html: 'Audio',
                      index: 10,
                      selector: [
                        { html: 'Hindi', lang: 'hi' },
                        { html: 'English', lang: 'en' },
                        { html: 'Tamil', lang: 'ta' },
                        { html: 'Telugu', lang: 'te' }
                      ],
                      onSelect: function (item) {
                        artInstanceRef.current?.notice?.show('Audio track not available on this server. Try Server 2.');
                        return 'Audio';
                      }
                    },
                    ...artplayerServerControls
                  ]
                }}
                getInstance={(art) => {
                  videoRef.current = art.video;
                }}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', '--video-fit': videoFit }}
                onPlay={(e) => {
                  handleAutoVolumeBoost();
                  setVideoBuffering(false);
                  setIsPaused(false);
                }}
                onPause={() => {
                  setVideoBuffering(false);
                  setIsPaused(true);
                }}
                onEnded={() => {
                  setIsPaused(true);
                  if (autoPlayNext) {
                    handleNextEp();
                  }
                }}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onSeeked={handleSeeked}
                {...bufferingHandlers}
              />
            ) : null}

            {source === 'netmirror' && (
              netmirrorLoading ? (
                <div className="loading" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
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
                activeNetmirrorUrl.includes('drive.google.com') ? (
                  <iframe
                    title="Google Drive Video Player"
                    src={activeNetmirrorUrl.replace('/view', '/preview').replace('?usp=drive_link', '')}
                    allowFullScreen={true}
                    webkitallowfullscreen="true"
                    mozallowfullscreen="true"
                    allow="autoplay; fullscreen"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  />
                ) : (
                  <ArtplayerComponent
                    option={{
                      url: api.external.netmirror.getProxyUrl(activeNetmirrorUrl),
                      type: api.external.netmirror.getProxyUrl(activeNetmirrorUrl).includes('.m3u8') ? 'm3u8' : 'auto',
                      quality: netmirrorQualities && netmirrorQualities.length > 0 ? netmirrorQualities.map(q => {
                        let label = q.quality;
                        if (label === '1080' || label === '1080p') label = '1080p (FHD)';
                        else if (label === '720' || label === '720p') label = '720p (HD)';
                        else if (label === '480' || label === '480p') label = '480p (SD)';
                        else if (label === '360' || label === '360p') label = '360p (SD)';
                        return {
                          html: label,
                          url: api.external.netmirror.getProxyUrl(q.url),
                          default: q.url === activeNetmirrorUrl
                        };
                      }) : [],
                      autoplay: true,
                      volume: 1,
                      isLive: false,
                      muted: false,
                      theme: '#00f3ff',
                      fullscreen: true,
                      fullscreenWeb: true,
                      setting: true,
                      playbackRate: true,
                      aspectRatio: true,
                      miniProgressBar: true,
                      playsInline: true,
                      controls: artplayerServerControls
                    }}
                    getInstance={(art) => {
                      videoRef.current = art.video;
                      artInstanceRef.current = art;
                    }}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', '--video-fit': videoFit }}
                    onPlay={(e) => {
                      handleAutoVolumeBoost();
                      setVideoBuffering(false);
                      setIsPaused(false);
                    }}
                    onPause={() => {
                      setVideoBuffering(false);
                      setIsPaused(true);
                    }}
                    onEnded={() => {
                      setIsPaused(true);
                      if (autoPlayNext) {
                        handleNextEp();
                      }
                    }}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onSeeked={handleSeeked}
                    {...bufferingHandlers}
                  />
                )
              ) : (
                <div className="empty-state" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <h3>Video stream failed to load</h3>
                  <p>Please try switching sever next to watch movie</p>
                </div>
              )
            )}

            {source === 'hicine' && (
              hicineLoading ? (
                <div className="loading" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
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
              ) : hicineVideoUrl ? (
                hicineVideoUrl.includes('drive.google.com') ? (
                  <iframe
                    title="Google Drive Video Player"
                    src={hicineVideoUrl.replace('/view', '/preview').replace('?usp=drive_link', '')}
                    allowFullScreen={true}
                    webkitallowfullscreen="true"
                    mozallowfullscreen="true"
                    allow="autoplay; fullscreen"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  />
                ) : (
                  <ArtplayerComponent
                    option={{
                      url: api.hicineProxyUrl(hicineVideoUrl),
                      type: api.hicineProxyUrl(hicineVideoUrl).includes('.m3u8') ? 'm3u8' : 'auto',
                      quality: hicineQualities && hicineQualities.length > 0 ? hicineQualities.map(q => {
                        let label = q.quality;
                        if (label === '1080' || label === '1080p') label = '1080p (FHD)';
                        else if (label === '720' || label === '720p') label = '720p (HD)';
                        else if (label === '480' || label === '480p') label = '480p (SD)';
                        else if (label === '360' || label === '360p') label = '360p (SD)';
                        return {
                          html: label,
                          url: api.hicineProxyUrl(q.url),
                          default: q.url === hicineVideoUrl
                        };
                      }) : [],
                      autoplay: true,
                      volume: 1,
                      isLive: false,
                      muted: false,
                      theme: '#00f3ff',
                      fullscreen: true,
                      fullscreenWeb: true,
                      setting: true,
                      playbackRate: true,
                      aspectRatio: true,
                      miniProgressBar: true,
                      playsInline: true,
                      controls: artplayerServerControls
                    }}
                    getInstance={(art) => {
                      videoRef.current = art.video;
                      artInstanceRef.current = art;
                    }}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', '--video-fit': videoFit }}
                    onPlay={(e) => {
                      handleAutoVolumeBoost();
                      setVideoBuffering(false);
                      setIsPaused(false);
                    }}
                    onPause={() => {
                      setVideoBuffering(false);
                      setIsPaused(true);
                    }}
                    onEnded={() => {
                      setIsPaused(true);
                      if (autoPlayNext) {
                        handleNextEp();
                      }
                    }}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onSeeked={handleSeeked}
                    {...bufferingHandlers}
                  />
                )
              ) : (
                <div className="empty-state" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
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

          {/* Quick Player Navigation / Control Bar */}
          {hasSidebar && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.95) 0%, rgba(10, 10, 10, 0.95) 100%)',
              padding: '12px 20px',
              borderRadius: '8px',
              marginTop: '12px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
              backdropFilter: 'blur(4px)',
            }}>
              {/* Previous Episode Button */}
              <button
                onClick={handlePrevEp}
                style={{
                  background: 'linear-gradient(90deg, #333 0%, #222 100%)',
                  color: '#fff',
                  border: '1px solid #444',
                  padding: '10px 24px',
                  borderRadius: '6px',
                  fontSize: '13.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = '1px solid #00f3ff';
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 243, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = '1px solid #444';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span style={{ fontSize: '15px' }}>⏮</span>
                <span>Prev Episode</span>
              </button>

              {/* Next Episode Button */}
              <button
                onClick={handleNextEp}
                style={{
                  background: 'linear-gradient(90deg, #ff0055 0%, #ff007f 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '6px',
                  fontSize: '13.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 0 15px rgba(255, 0, 85, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 25px rgba(255, 0, 85, 0.7)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 0, 85, 0.4)';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <span>Next Episode</span>
                <span style={{ fontSize: '15px' }}>⏭</span>
              </button>
            </div>
          )}

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
                  onClick={source === 'hicine' ? handleSwitchToServer1 : undefined}
                  disabled={source === 'netmirror' || source === 'local' || (source === 'hicine' && !oppositeLink && !oppositeSearching) || oppositeSearching}
                  style={{
                    background: (source === 'netmirror' || source === 'local') ? '#0070f3' : '#333',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: (source === 'netmirror' || source === 'local') ? 'default' : (source === 'hicine' && !oppositeLink) ? 'not-allowed' : 'pointer',
                    opacity: (source === 'netmirror' || source === 'local') ? 1 : (source === 'hicine' && !oppositeLink) ? 0.4 : 1
                  }}
                >
                  Stream Server 1 (FHD) {oppositeSearching ? ' (Searching...)' : (source === 'hicine' && !oppositeLink) ? ' (Unavailable)' : ''}
                </button>
                <button
                  onClick={(source === 'netmirror' || source === 'local') ? handleSwitchToServer2 : undefined}
                  disabled={source === 'hicine' || ((source === 'netmirror' || source === 'local') && !oppositeLink && !oppositeSearching) || oppositeSearching}
                  style={{
                    background: source === 'hicine' ? '#00a000' : '#333',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: source === 'hicine' ? 'default' : ((source === 'netmirror' || source === 'local') && !oppositeLink) ? 'not-allowed' : 'pointer',
                    opacity: source === 'hicine' ? 1 : ((source === 'netmirror' || source === 'local') && !oppositeLink) ? 0.4 : 1
                  }}
                >
                  Stream Server 2 (HD) {oppositeSearching ? ' (Searching...)' : ((source === 'netmirror' || source === 'local') && !oppositeLink) ? ' (Unavailable)' : ''}
                </button>
              </div>
            </div>

            {/* Universal Quality Selector */}
            {(!netmirrorLoading && !hicineLoading && availableQualities.length > 0) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', borderTop: '1px solid #333', paddingTop: '12px', marginTop: '4px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-dim)', fontWeight: 'bold' }}>🎬 Video Quality:</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {availableQualities.map((qLabel) => {
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

            {/* Screen Mode / Auto Play Selector */}
            {(!netmirrorLoading && !hicineLoading) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', borderTop: '1px solid #333', paddingTop: '12px', marginTop: '4px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-dim)', fontWeight: 'bold' }}>📺 Screen Mode:</span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                      { value: 'contain', label: 'Fit (Original)' },
                      { value: 'fill', label: 'Stretch (Full Screen)' },
                      { value: 'cover', label: 'Zoom (Crop)' }
                    ].map((fitOption) => {
                      const isActive = videoFit === fitOption.value;
                      return (
                        <button
                          key={fitOption.value}
                          onClick={() => setVideoFit(fitOption.value)}
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
                          {fitOption.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Auto Play Toggle */}
                {hasSidebar && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-dim)', fontWeight: 'bold' }}>Auto Play Next Ep:</span>
                    <button
                      onClick={toggleAutoPlay}
                      style={{
                        background: autoPlayNext ? 'linear-gradient(90deg, #00f3ff 0%, #0070f3 100%)' : '#333',
                        color: '#fff',
                        border: autoPlayNext ? '1px solid #00f3ff' : '1px solid #444',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: autoPlayNext ? '0 0 10px rgba(0, 243, 255, 0.4)' : 'none',
                        transition: 'all 0.3s'
                      }}
                    >
                      {autoPlayNext ? 'ON' : 'OFF'}
                    </button>
                  </div>
                )}
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

              {/* Audio Switcher buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-dim)', fontWeight: 'bold' }}>🔄 Switch Language:</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {audioTracks.map((track) => {
                    const isActive = source === 'netmirror' && track.id.toString() === subjectid?.toString();
                    return (
                      <button
                        key={track.id}
                        onClick={() => {
                          if (isActive) return;
                          navigate(`/watch/${track.id}?source=netmirror&type=${mediaType}&subjectid=${track.id}&dp=${encodeURIComponent(track.dp || '')}&title=${encodeURIComponent(track.title)}&se=${activeSe}&ep=${activeEp}&lang_pref=user`);
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

                  {/* Hindi Playback Button */}
                  {!audioTracks.some(t => t.language === 'Hindi') && (
                    <button
                      onClick={async () => {
                        const base = (movieTitle || '').replace(/\[.*?\]|\(.*?\)/g, '').trim();
                        const btn = document.getElementById('btn-hindi-auto');
                        if(btn) btn.innerText = 'Loading...';
                        
                        try {
                          const res = await api.external.netmirror.search(base);
                          const tracks = res?.results || [];
                          const hindiTrack = tracks.find(r => r.title.toLowerCase().includes('hindi') || r.title.toLowerCase().includes('hin'));
                          
                          if (hindiTrack) {
                            navigate(`/watch/${hindiTrack.id}?source=netmirror&type=${mediaType}&subjectid=${hindiTrack.id}&dp=${encodeURIComponent(hindiTrack.dp || '')}&title=${encodeURIComponent(hindiTrack.title)}&se=${activeSe}&ep=${activeEp}&lang_pref=user`);
                          } else {
                            if(btn) btn.innerText = 'Not Found';
                            setTimeout(() => { if(btn) btn.innerText = 'Hindi'; }, 2000);
                          }
                        } catch(err) {
                          if(btn) btn.innerText = 'Error';
                          setTimeout(() => { if(btn) btn.innerText = 'Hindi'; }, 2000);
                        }
                      }}
                      id="btn-hindi-auto"
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
                  
                  {/* English/Original Playback Button */}
                  {!audioTracks.some(t => t.language === 'English' || t.language === 'Original') && (
                    <button
                      onClick={async () => {
                        const base = (movieTitle || '').replace(/hindi|dubbed|\[.*?\]|\(.*?\)/gi, '').trim();
                        const btn = document.getElementById('btn-eng-auto');
                        if(btn) btn.innerText = 'Loading...';
                        
                        try {
                          const res = await api.external.netmirror.search(base);
                          const tracks = res?.results || [];
                          // Find a track that is NOT explicitly labeled Hindi
                          const engTrack = tracks.find(r => !r.title.toLowerCase().includes('hindi') && !r.title.toLowerCase().includes('hin-'));
                          
                          if (engTrack) {
                            navigate(`/watch/${engTrack.id}?source=netmirror&type=${mediaType}&subjectid=${engTrack.id}&dp=${encodeURIComponent(engTrack.dp || '')}&title=${encodeURIComponent(engTrack.title)}&se=${activeSe}&ep=${activeEp}&lang_pref=user`);
                          } else {
                            if(btn) btn.innerText = 'Not Found';
                            setTimeout(() => { if(btn) btn.innerText = 'Original / English'; }, 2000);
                          }
                        } catch(err) {
                          if(btn) btn.innerText = 'Error';
                          setTimeout(() => { if(btn) btn.innerText = 'Original / English'; }, 2000);
                        }
                      }}
                      id="btn-eng-auto"
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
                      Original / English
                    </button>
                  )}
                </div>
              </div>
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

            {/* Server 2 (Hicine) Scraped Episode List */}
            {source === 'hicine' && hicineEpisodes.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {hicineEpisodes.map((ep, idx) => {
                  const isActive = href === ep.path;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        navigate(`/watch/${id}?source=hicine&href=${encodeURIComponent(ep.path)}&title=${encodeURIComponent(cleanHicineTitle(ep.title))}`);
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
                        🎬 {cleanHicineTitle(ep.title)}
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

import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useHistory } from '../hooks/useHistory';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const activeTab = searchParams.get('tab') || 'bollywood';
  const hasQuery = !!searchParams.get('q');
  
  const { searchHistory, addSearchHistory, removeSearchHistory } = useHistory();
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function submitSearch(e) {
    e.preventDefault();
    if (query.trim()) {
      addSearchHistory(query.trim());
      setShowHistory(false);
      navigate(`/?q=${encodeURIComponent(query.trim())}`);
    } else {
      navigate('/');
    }
  }

  // Synchronize query text with search input when URL changes
  useEffect(() => {
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

  return (
    <div className={`navbar ${scrolled ? 'scrolled' : ''}`} style={{
      background: scrolled ? 'var(--bg)' : 'linear-gradient(180deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
      transition: 'background 0.3s ease'
    }}>
      {/* Brand logo */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Link to="/" className="logo">
          <span className="logo-j">JANI</span>
          <span className="logo-x">x</span>
          <span className="logo-f">FLIX</span>
        </Link>
      </div>

      <nav 
        className="navbar-nav"
        style={{ 
          display: 'flex', 
          gap: '6px', 
          alignItems: 'center', 
          flexWrap: 'nowrap',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <Link 
          to="/" 
          className={`nav-link ${(!searchParams.get('tab') && !hasQuery) ? 'active' : ''}`}
        >
          <span className="hide-emoji-mobile">🏠</span> Home
        </Link>
        <Link 
          to="/?tab=bollywood" 
          className={`nav-link ${(activeTab === 'bollywood' && !hasQuery) ? 'active' : ''}`}
        >
          <span className="hide-emoji-mobile">🇮🇳</span> Bollywood Movies
        </Link>
        <Link 
          to="/?tab=southindian" 
          className={`nav-link ${(activeTab === 'southindian' && !hasQuery) ? 'active' : ''}`}
        >
          <span className="hide-emoji-mobile">🌴</span> South Indian Movies
        </Link>
        <Link 
          to="/?tab=punjabi" 
          className={`nav-link ${(activeTab === 'punjabi' && !hasQuery) ? 'active' : ''}`}
        >
          <span className="hide-emoji-mobile">🌾</span> Punjabi
        </Link>
        <Link 
          to="/?tab=hollywood" 
          className={`nav-link ${(activeTab === 'hollywood' && !hasQuery) ? 'active' : ''}`}
        >
          <span className="hide-emoji-mobile">🇺🇸</span> Hollywood
        </Link>
        <Link 
          to="/?tab=webseries" 
          className={`nav-link ${(activeTab === 'webseries' && !hasQuery) ? 'active' : ''}`}
        >
          <span className="hide-emoji-mobile">📺</span> Web Series
        </Link>
        <Link 
          to="/?tab=indiantvshows" 
          className={`nav-link ${(activeTab === 'indiantvshows' && !hasQuery) ? 'active' : ''}`}
        >
          <span className="hide-emoji-mobile">🇮🇳</span> TV Shows
        </Link>
        <Link 
          to="/?tab=hollywoodtvshows" 
          className={`nav-link ${(activeTab === 'hollywoodtvshows' && !hasQuery) ? 'active' : ''}`}
        >
          <span className="hide-emoji-mobile">🛸</span> US Hollywood TV
        </Link>
        <Link 
          to="/?tab=korean" 
          className={`nav-link ${(activeTab === 'korean' && !hasQuery) ? 'active' : ''}`}
        >
          <span className="hide-emoji-mobile">🇰🇷</span> Korean
        </Link>
        <Link 
          to="/?tab=anime" 
          className={`nav-link ${(activeTab === 'anime' && !hasQuery) ? 'active' : ''}`}
        >
          <span className="hide-emoji-mobile">⛩️</span> Anime
        </Link>
      </nav>

      {/* Right-aligned Search Input & Social Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto', flexWrap: 'wrap', position: 'relative' }}>
        <form className="search" onSubmit={submitSearch} style={{ margin: '0' }}>
          <span onClick={submitSearch} style={{ cursor: 'pointer', userSelect: 'none' }}>🔍</span>
          <input
            type="text"
            placeholder="Titles, genres..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowHistory(true)}
            onBlur={() => setTimeout(() => setShowHistory(false), 200)}
          />
        </form>
        
        {/* Search History Dropdown */}
        {showHistory && searchHistory.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '45px',
            left: 0,
            width: '200px',
            background: 'var(--bg-elev)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            zIndex: 100,
            overflow: 'hidden'
          }}>
            <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-dim)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Recent Searches</span>
            </div>
            {searchHistory.map((term, idx) => (
              <div 
                key={idx} 
                style={{ 
                  padding: '10px 12px', 
                  fontSize: '13px', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
                className="search-history-item"
              >
                <span 
                  style={{ flex: 1 }}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent input onBlur from firing immediately
                    setQuery(term);
                    addSearchHistory(term);
                    setShowHistory(false);
                    navigate(`/?q=${encodeURIComponent(term)}`);
                  }}
                >
                  🕒 {term}
                </span>
                <span 
                  style={{ fontSize: '12px', color: 'var(--text-dim)', padding: '0 4px' }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeSearchHistory(term);
                  }}
                  title="Remove"
                >
                  ✕
                </span>
              </div>
            ))}
            <style>{`
              .search-history-item:hover {
                background: rgba(255, 255, 255, 0.05);
              }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
}

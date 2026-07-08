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
          <span className="hide-emoji-mobile">🇮🇳</span> Bollywood
        </Link>
        <Link 
          to="/?tab=southindian" 
          className={`nav-link ${(activeTab === 'southindian' && !hasQuery) ? 'active' : ''}`}
        >
          <span className="hide-emoji-mobile">🌴</span> South <span className="hide-mobile">Indian</span>
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
          to="/?tab=indianwebseries" 
          className={`nav-link ${(activeTab === 'indianwebseries' && !hasQuery) ? 'active' : ''}`}
        >
          <span className="hide-emoji-mobile">📺</span> <span className="hide-mobile">Web </span>Series
        </Link>
        <Link 
          to="/?tab=indiantvshows" 
          className={`nav-link ${(activeTab === 'indiantvshows' && !hasQuery) ? 'active' : ''}`}
        >
          <span className="hide-emoji-mobile">🇮🇳</span> TV <span className="hide-mobile">Shows</span>
        </Link>
        <Link 
          to="/?tab=hollywoodtvshows" 
          className={`nav-link ${(activeTab === 'hollywoodtvshows' && !hasQuery) ? 'active' : ''}`}
        >
          <span className="hide-emoji-mobile">🛸</span> US <span className="hide-mobile">Hollywood </span>TV
        </Link>
        <Link 
          to="/?tab=korean" 
          className={`nav-link ${(activeTab === 'korean' && !hasQuery) ? 'active' : ''}`}
        >
          <span className="hide-emoji-mobile">🇰🇷</span> Korean
        </Link>
        <Link 
          to="/?tab=japanese" 
          className={`nav-link ${(activeTab === 'japanese' && !hasQuery) ? 'active' : ''}`}
        >
          <span className="hide-emoji-mobile">🇯🇵</span> <span className="hide-mobile">Japanese & </span>Anime
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
                  onClick={() => {
                    setQuery(term);
                    addSearchHistory(term);
                    navigate(`/?q=${encodeURIComponent(term)}`);
                  }}
                >
                  🕒 {term}
                </span>
                <span 
                  style={{ fontSize: '12px', color: 'var(--text-dim)', padding: '0 4px' }}
                  onClick={(e) => {
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

        {/* Telegram icon link */}
        <a 
          href="https://t.me/nikkgill" 
          target="_blank" 
          rel="noopener noreferrer"
          title="Telegram"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(0, 243, 255, 0.25)',
            color: '#00f3ff',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            textDecoration: 'none',
            boxShadow: '0 0 5px rgba(0, 243, 255, 0.1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 243, 255, 0.15)';
            e.currentTarget.style.border = '1px solid rgba(0, 243, 255, 0.6)';
            e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 243, 255, 0.6)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
            e.currentTarget.style.border = '1px solid rgba(0, 243, 255, 0.25)';
            e.currentTarget.style.boxShadow = '0 0 5px rgba(0, 243, 255, 0.1)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </a>

        {/* Instagram icon link */}
        <a 
          href="https://instagram.com/nikk_batwal" 
          target="_blank" 
          rel="noopener noreferrer"
          title="Instagram"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 0, 127, 0.25)',
            color: '#ff007f',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            textDecoration: 'none',
            boxShadow: '0 0 5px rgba(255, 0, 127, 0.1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 0, 127, 0.15)';
            e.currentTarget.style.border = '1px solid rgba(255, 0, 127, 0.6)';
            e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 0, 127, 0.6)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
            e.currentTarget.style.border = '1px solid rgba(255, 0, 127, 0.25)';
            e.currentTarget.style.boxShadow = '0 0 5px rgba(255, 0, 127, 0.1)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg>
        </a>
      </div>
    </div>
  );
}

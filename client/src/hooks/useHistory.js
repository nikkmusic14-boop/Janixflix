import { useState, useEffect } from 'react';

const SEARCH_HISTORY_KEY = 'janixflix_search_history';
const VIEW_HISTORY_KEY = 'janixflix_view_history';

export function useHistory() {
  const [searchHistory, setSearchHistory] = useState([]);
  const [viewHistory, setViewHistory] = useState([]);

  // Load history on mount
  useEffect(() => {
    try {
      const storedSearches = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY));
      if (Array.isArray(storedSearches)) {
        setSearchHistory(storedSearches);
      }

      const storedViews = JSON.parse(localStorage.getItem(VIEW_HISTORY_KEY));
      if (Array.isArray(storedViews)) {
        setViewHistory(storedViews);
      }
    } catch (e) {
      console.warn("Failed to load history from local storage", e);
    }
  }, []);

  // Add to search history (max 5)
  const addSearchHistory = (query) => {
    if (!query || !query.trim()) return;
    
    const term = query.trim();
    setSearchHistory(prev => {
      // Remove if it exists to push to front
      const filtered = prev.filter(q => q.toLowerCase() !== term.toLowerCase());
      const updated = [term, ...filtered].slice(0, 5); // Keep last 5
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const removeSearchHistory = (term) => {
    setSearchHistory(prev => {
      const updated = prev.filter(q => q.toLowerCase() !== term.toLowerCase());
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Add to view history (max 10)
  const addViewHistory = (movie) => {
    if (!movie || !movie.id) return;
    
    setViewHistory(prev => {
      // Remove if exists to move to top
      const filtered = prev.filter(m => m.id === movie.id ? false : true); // avoid duplicate ID
      
      // Store minimal data to save space
      const historyItem = {
        id: movie.id,
        title: movie.title,
        dp: movie.dp,
        poster_path: movie.poster_path || movie.backdrop_path,
        media_type: movie.media_type,
        source: movie.source || 'netmirror',
        type: movie.type, // might be 'tv' or 'movie' from component context
        timestamp: Date.now()
      };

      const updated = [historyItem, ...filtered].slice(0, 10); // Keep last 10
      localStorage.setItem(VIEW_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return {
    searchHistory,
    addSearchHistory,
    removeSearchHistory,
    viewHistory,
    addViewHistory
  };
}

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:4000' : window.location.origin);


async function request(pathname, options = {}) {
  const res = await fetch(`${API_URL}${pathname}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(msg.error || `Request failed (${res.status})`);
  }
  // 204 / empty body
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  // Movies
  listMovies: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/movies${qs ? `?${qs}` : ''}`);
  },
  getMovie: (id) => request(`/api/movies/${id}`),
  getFeatured: () => request(`/api/movies/featured`),
  updateMovie: (id, patch) =>
    request(`/api/movies/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteMovie: (id) => request(`/api/movies/${id}`, { method: 'DELETE' }),

  // Upload (multipart — uses FormData, NOT JSON)
  uploadMovie: (formData, targetApiUrl = null) => {
    const baseUrl = targetApiUrl || API_URL;
    return fetch(`${baseUrl}/api/movies/upload`, { method: 'POST', body: formData })
      .then(async (res) => {
        if (!res.ok) {
          const m = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(m.error || 'Upload failed');
        }
        return res.json();
      });
  },

  // Media URLs
  streamUrl: (id) => `${API_URL}/api/stream/${id}`,
  thumbnailUrl: (id) => `${API_URL}/api/stream/thumbnail/${id}`,
  hicineProxyUrl: (url) => {
    if (url && url.includes('.r2.dev')) {
      return url; // r2.dev URLs fail with 403 if proxied with Hicine Referer
    }
    const ext = url.includes('.m3u8') ? '/stream.m3u8' : '/stream.mp4';
    return `${API_URL}/api/external/hicine/proxy-stream${ext}?url=${encodeURIComponent(url)}`;
  },

  // External APIs (Netmirror & Hicine proxy/scrapers)
  external: {
    netmirror: {
      list: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return request(`/api/external/netmirror/filter${qs ? `?${qs}` : ''}`);
      },
      search: (q, page = 0) => request(`/api/external/netmirror/search?q=${encodeURIComponent(q)}&page=${page}`),
      getDetails: (mediaType, id) => request(`/api/external/netmirror/details/${mediaType}/${id}`),
      getStreamUrl: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return request(`/api/external/netmirror/stream-url${qs ? `?${qs}` : ''}`);
      },
      getVideoSources: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return request(`/api/external/netmirror/video-sources${qs ? `?${qs}` : ''}`);
      },
      getProxyUrl: (url) => {
        // Return URL directly as the CDN does not require proxying and blocks Render IPs
        return url;
      }
    },
    hicine: {
      list: (category, page) => {
        const qs = page !== undefined ? `?page=${page}` : '';
        return request(`/api/external/hicine/category/${category}${qs}`);
      },
      search: (q) => request(`/api/external/hicine/search?q=${encodeURIComponent(q)}`),
      getMediaSource: (path) => request(`/api/external/hicine/movie-source?path=${encodeURIComponent(path)}`)
    }
  }
};

export { API_URL };

import { Router } from 'express';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';

const router = Router();

// Netmirror Secret Key and Mirrors Configuration
const NETMIRROR_SECRET = 'net###@@sss';
const MIRRORS = [
  'https://speed.watch22.shop/play/watchbox.php',
  'https://play.watch22.shop/play/watchbox.php',
  'https://play.watch21.shop/play/watchbox.php',
  'https://playnew.watch21.shop/play/watchbox.php'
];

// Helper to fetch with timeout
async function fetchWithTimeout(url, options = {}) {
  const { timeout = 8000, headers = {}, ...fetchOpts } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  
  let targetUrl = url;
  const isOkjatt = targetUrl.includes('okjatt.bond');
  
  if (isOkjatt) {
    targetUrl = 'https://translate.google.com/translate?sl=auto&tl=en&u=' + encodeURIComponent(url);
  }

  try {
    const defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      ...headers
    };
    
    // We fetch and immediately intercept if it's an Okjatt HTML scrape
    const response = await fetch(targetUrl, { ...fetchOpts, headers: defaultHeaders, signal: controller.signal });
    clearTimeout(timer);
    
    if (isOkjatt && !fetchOpts.stream) {
       // Wrap the response so we can hook .text()
       const originalText = response.text.bind(response);
       response.text = async () => {
         let html = await originalText();
         // Normalize Google Translate links back to their original form
         html = html.replace(/https:\/\/translate\.google\.com\/website\?[^"'\s]*u=([^"'\s]+)/g, (m, p1) => {
           return decodeURIComponent(p1.replace(/&amp;/g, '&'));
         });
         return html;
       };
    }
    
    return response;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ────────────────────────────────────────────────────────────
// 1. NETMIRROR PROXIES
// ────────────────────────────────────────────────────────────

// Filter and Categories Listing
router.get('/netmirror/filter', async (req, res) => {
  try {
    const urls = [
      new URL('https://api2.imdb3.shop/api/movies/filter'),
      new URL('https://api2.imdb4.shop/api/movies/filter')
    ];
    
    // Copy query parameters to modify them
    const params = { ...req.query };
    
    // Translate "cn" (country code) to the "country" parameter name expected by the API
    if (params.cn) {
      if (params.cn === 'India') {
        params.country = 'India';
      } else if (params.cn === 'US') {
        params.country = 'United States';
      } else if (params.cn === 'Japan') {
        params.country = 'Japan';
      } else {
        params.country = params.cn;
      }
      delete params.cn;
    }
    
    // Translate "genre_ids" to "genre_id" expected by the API
    if (params.genre_ids) {
      const gId = Array.isArray(params.genre_ids) ? params.genre_ids[0] : params.genre_ids;
      if (gId) {
        params.genre_id = gId;
      }
      delete params.genre_ids;
    }

    let response;
    for (const baseUrl of urls) {
      // Apply params to the URL
      for (const key in params) {
        if (Array.isArray(params[key])) {
          params[key].forEach(val => baseUrl.searchParams.append(`${key}[]`, val));
        } else {
          baseUrl.searchParams.set(key, params[key]);
        }
      }
      
      try {
        response = await fetchWithTimeout(baseUrl.toString(), { timeout: 15000 });
        if (response.ok) {
          const data = await response.json();
          return res.json(data);
        }
      } catch (err) {
        console.warn(`Netmirror filter failed on URL ${baseUrl.toString()}:`, err.message);
      }
    }
    
    throw new Error('Netmirror filter failed on all endpoints');
  } catch (err) {
    console.error('[Netmirror Filter Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Search
router.get('/netmirror/search', async (req, res) => {
  const { q, page = 0 } = req.query;
  if (!q) return res.status(400).json({ error: 'Search query is required' });

  // Try imdb3, fallback to imdb4 if it fails
  const urls = [
    `https://api2.imdb3.shop/api/search2/${encodeURIComponent(q)}?page=${page}`,
    `https://api2.imdb4.shop/api/search2/${encodeURIComponent(q)}?page=${page}`
  ];

  for (const url of urls) {
    try {
      const response = await fetchWithTimeout(url, { timeout: 15000 });
      if (response.ok) {
        const data = await response.json();
        return res.json(data);
      }
    } catch (err) {
      console.warn(`Netmirror search failed on URL ${url}:`, err.message);
    }
  }

  res.status(500).json({ error: 'Failed to search Netmirror endpoints' });
});

// Movie/TV Details
router.get('/netmirror/details/:mediaType/:id', async (req, res) => {
  let { mediaType, id } = req.params;
  if (mediaType !== 'movie' && mediaType !== 'tv') {
    return res.status(400).json({ error: 'Invalid media type. Must be "movie" or "tv".' });
  }

  if (id === '108824') {
    id = '1186';
  }

  try {
    const urls = [
      `https://api2.imdb3.shop/api/${mediaType}/${id}`,
      `https://api2.imdb4.shop/api/${mediaType}/${id}`
    ];
    
    let response;
    for (const url of urls) {
      try {
        response = await fetchWithTimeout(url, { timeout: 15000 });
        if (response.ok) {
          const data = await response.json();
          return res.json(data);
        }
      } catch (err) {
        console.warn(`Netmirror details failed on URL ${url}:`, err.message);
      }
    }
    
    throw new Error(`Netmirror details failed on all endpoints`);
  } catch (err) {
    console.error('[Netmirror Details Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// signed stream player URL generator
router.get('/netmirror/stream-url', (req, res) => {
  const { id, se = 0, ep = 0, dp, title, mirrorIndex = 0 } = req.query;
  if (!id || !dp) {
    return res.status(400).json({ error: 'Params "id" (subjectid) and "dp" are required' });
  }

  const mirror = MIRRORS[Number(mirrorIndex)] || MIRRORS[0];
  const ts = Math.floor(Date.now() / 1000);
  
  // HMAC-SHA256 signature using timestamp and secret key
  const sig = crypto
    .createHmac('sha256', NETMIRROR_SECRET)
    .update(String(ts))
    .digest('hex');

  const na = Buffer.from(title || '').toString('base64');

  const signedUrl = `${mirror}?id=${id}&se=${se}&ep=${ep}&dp=${encodeURIComponent(dp)}&na=${encodeURIComponent(na)}&ts=${ts}&sig=${sig}&exten=true`;
  
  res.json({ url: signedUrl, mirrors: MIRRORS });
});

// Get direct video stream sources for a Netmirror movie/episode
router.get('/netmirror/video-sources', async (req, res) => {
  const { id, se = 0, ep = 0, dp, title, mirrorIndex = 0 } = req.query;

  if (
    (title && title.toLowerCase().includes('satluj')) || 
    (dp && dp.toLowerCase().includes('satluj')) || 
    (id && id.toLowerCase().includes('satluj')) ||
    (id === '122059')
  ) {
    const driveUrl = 'https://drive.google.com/file/d/1fopIoNNpdvC_J49Y8cXquDT7f1-S4lEt/view?usp=drive_link';
    return res.json({
      qualities: [
        { quality: '2160p ZEE5 WEB-DL (Google Drive)', url: driveUrl }
      ],
      chromecastUrl: driveUrl,
      mirrors: []
    });
  }

  if (!id || !dp) {
    return res.status(400).json({ error: 'Params "id" and "dp" are required' });
  }

  const mirror = MIRRORS[Number(mirrorIndex)] || MIRRORS[0];
  const ts = Math.floor(Date.now() / 1000);
  
  const sig = crypto
    .createHmac('sha256', NETMIRROR_SECRET)
    .update(String(ts))
    .digest('hex');

  const na = Buffer.from(title || '').toString('base64');
  const signedUrl = `${mirror}?id=${id}&se=${se}&ep=${ep}&dp=${encodeURIComponent(dp)}&na=${encodeURIComponent(na)}&ts=${ts}&sig=${sig}&exten=true`;

  try {
    const response = await fetchWithTimeout(signedUrl, {
      headers: {
        'Referer': 'http://localhost:5173/'
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch stream page, status ${response.status}`);
    }
    const html = await response.text();

    // Extract standard quality list
    const qualities = [];
    const qualityRegex = /html:\s*'([^']+)',\s*url:\s*'([^']+)'/g;
    let match;
    while ((match = qualityRegex.exec(html)) !== null) {
      if (match[2].startsWith('http')) {
        qualities.push({ quality: match[1], url: match[2] });
      }
    }

    // Extract Chromecast URL
    const chromecastRegex = /url:\s*'([^']+cast=1[^']+)'/;
    const chromecastMatch = html.match(chromecastRegex);
    const chromecastUrl = chromecastMatch ? chromecastMatch[1] : null;

    console.log(`[Netmirror Stream] ID: ${id}, Qualities: ${qualities.length}, Chromecast: ${!!chromecastUrl}`);
    if (qualities.length === 0 && !chromecastUrl) {
      console.log(`[Netmirror Stream] No URLs matched. HTML Length: ${html.length}`);
    }

    res.json({ qualities, chromecastUrl, mirrors: MIRRORS });
  } catch (err) {
    console.error('[Netmirror Video Sources Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Proxy endpoint to stream external videos with referrer and range support
router.get('/netmirror/proxy-stream', async (req, res) => {
  let { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Param "url" is required' });

  const controller = new AbortController();
  req.on('close', () => {
    controller.abort();
  });

  try {
    // Replace blocked hostname with the mobile stream proxy hostname
    if (url.includes('bcdnxw.hakunaymatata.com')) {
      url = url.replace('bcdnxw.hakunaymatata.com', 'bcdn.watch22.shop');
    }

    const headers = {
      'Referer': 'https://speed.watch22.shop/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const response = await fetch(url, { headers, signal: controller.signal });
    res.status(response.status);

    response.headers.forEach((val, key) => {
      if (['content-type', 'content-length', 'content-range', 'accept-ranges'].includes(key)) {
        res.setHeader(key, val);
      }
    });

    if (response.body) {
      const stream = Readable.fromWeb(response.body);
      stream.on('error', (err) => {
        console.error('[Netmirror Proxy Stream pipe error]:', err.message);
      });
      stream.pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('[Netmirror Proxy Stream]: Upstream request aborted because client disconnected.');
      return;
    }
    console.error('[Netmirror Proxy Stream Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────
// 2. HICINE PROXIES & SCRAPERS
// ────────────────────────────────────────────────────────────

const HICINE_BASE = 'https://api.hicine.info/api';

const HICINE_CATEGORY_URLS = {
  bollywood: `${HICINE_BASE}/movies`, // API doesn't have bollywood directly, fallback to movies
  southindian: `${HICINE_BASE}/movies`,
  punjabi: `${HICINE_BASE}/movies`,
  hollywood: `${HICINE_BASE}/movies`,
  webseries: `${HICINE_BASE}/webseries`,
  indianwebseries: `${HICINE_BASE}/webseries`,
  indiantvshows: `${HICINE_BASE}/webseries`,
  tvshows: `${HICINE_BASE}/webseries`,
  hollywoodtvshows: `${HICINE_BASE}/webseries`,
  bgrade: `${HICINE_BASE}/movies`,
  anime: `${HICINE_BASE}/anime`
};

// Category Listing Scraper
router.get('/hicine/category/:cat', async (req, res) => {
  const { cat } = req.params;
  
  let url = HICINE_CATEGORY_URLS[cat] || `${HICINE_BASE}/recent`;

  try {
    const response = await fetchWithTimeout(url, { timeout: 15000 });
    if (!response.ok) {
      throw new Error(`Hicine fetch failed with status ${response.status}`);
    }
    const json = await response.json();
    const dataList = json.data || json;
    
    const items = dataList.map(item => ({
      id: item.url_slug || item._id,
      href: item.links || `/api/${item.url_slug || item._id}`,
      title: item.title,
      quality: 'HD',
      thumbnail: item.featured_image || item.poster,
      source: 'hicine',
      raw: item
    }));

    res.json({
      page: 1,
      category: cat,
      results: items
    });
  } catch (err) {
    console.error('[Hicine Category Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Search Scraper
router.get('/hicine/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Search query is required' });

  try {
    const url = `${HICINE_BASE}/search/${encodeURIComponent(q)}`;
    const response = await fetchWithTimeout(url, { timeout: 15000 });
    if (!response.ok) {
      throw new Error(`Hicine search failed with status ${response.status}`);
    }
    const json = await response.json();
    const dataList = json.data || json;
    
    const items = dataList.map(item => ({
      id: item.url_slug || item._id,
      href: item.links || `/api/${item.url_slug || item._id}`,
      title: item.title,
      quality: 'HD',
      thumbnail: item.featured_image || item.poster,
      source: 'hicine',
      raw: item
    }));
    
    res.json(items);
  } catch (err) {
    console.error('[Hicine Search Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Direct Media Link Scraper for Hicine movies/episodes
router.get('/hicine/movie-source', async (req, res) => {
  let { path: mediaPath } = req.query;

  if (mediaPath && mediaPath.toLowerCase().includes('satluj')) {
    const driveUrl = 'https://drive.google.com/file/d/1fopIoNNpdvC_J49Y8cXquDT7f1-S4lEt/view?usp=drive_link';
    return res.json({ videoUrl: driveUrl });
  }

  if (!mediaPath) return res.status(400).json({ error: 'Param "path" is required' });

  try {
    let linksStr = mediaPath;

    // If the path is a slug like /api/movie-slug, we need to fetch the item details
    if (mediaPath.startsWith('/api/')) {
      const slug = mediaPath.replace('/api/', '');
      // Some titles might not match perfectly if we just replace hyphens, but it's our best bet.
      const query = slug.replace(/-download-\d+\.html$/, '').replace(/-complete\.html$/, '').replace(/-/g, ' ');
      
      let item = null;
      
      // Try direct endpoints first
      const endpoints = ['anime', 'webseries', 'movies'];
      for (const ep of endpoints) {
        try {
          const res = await fetchWithTimeout(`${HICINE_BASE}/${ep}/${slug}`, { timeout: 5000 });
          if (res.ok) {
            const data = await res.json();
            if (data && data._id) {
              item = data;
              break;
            }
          }
        } catch(e) {}
      }

      // Fallback to search
      if (!item) {
        const searchRes = await fetchWithTimeout(`${HICINE_BASE}/search/${encodeURIComponent(query)}`, { timeout: 15000 });
        if (searchRes.ok) {
          const json = await searchRes.json();
          const dataList = json.data || json;
          item = dataList.find(i => i.url_slug === slug || i._id === slug) || dataList[0];
        }
      }
        
      if (item) {
          // Check if it's a TV Series
          if (item.season_1) {
            const seasons = [];
            for (let i = 1; i <= 20; i++) {
              if (item[`season_${i}`]) {
                seasons.push({ title: `Season ${i}`, path: item[`season_${i}`] });
              }
            }
            if (item.season_zip) {
              seasons.push({ title: 'Complete Zip', path: item.season_zip });
            }
            return res.json({ type: 'tv_series', seasons });
          } else if (item.links) {
            linksStr = item.links;
          }
        }
    }

    // Check if it's a TV Season containing episodes
    if (linksStr.includes('Episode ')) {
      const episodes = [];
      const lines = linksStr.split(/\r?\n|\\n/);
      
      for (const line of lines) {
        if (line.toLowerCase().includes('episode')) {
          // Format: "Episode 1 : url1,,480p : url2,,720p : url3,,1080p"
          const parts = line.split(' : ');
          if (parts.length >= 2) {
            const epTitle = parts[0].trim();
            const remaining = line.substring(epTitle.length + 3);
            const formattedLinks = remaining.split(' : ').map(part => part.replace(',,', ', ')).join('\\n');
            episodes.push({ title: epTitle, path: formattedLinks });
          }
        }
      }
      if (episodes.length > 0) {
        return res.json({ type: 'tv_season', episodes });
      }
    }

    // Parse the links string for a direct video
    // Format: "https://worker.../?vcloud=..., Link2, Link3..., 480p\nhttps://worker..., 720p"
    const lines = linksStr.split(/\r?\n|\\n/);
    let bestUrl = null;
    
    for (const line of lines) {
       const parts = line.split(',');
       if (parts.length > 0) {
          const urlCandidate = parts[0].trim();
          if (urlCandidate.startsWith('http')) {
             bestUrl = urlCandidate;
             if (line.includes('720p') || line.includes('1080p')) {
                bestUrl = urlCandidate;
                break;
             }
          }
       }
    }
    
    if (bestUrl) {
      // Convert the Hicine worker URL into a direct raw video URL to bypass ads and html player
      if (bestUrl.includes('?vcloud=')) {
        try {
          const urlObj = new URL(bestUrl);
          const vcloudParam = urlObj.searchParams.get('vcloud');
          const origin = urlObj.origin;
          
          const linksRes = await fetch(`${origin}/api/links?vcloud=${encodeURIComponent(vcloudParam)}`);
          if (linksRes.ok) {
            const data = await linksRes.json();
            if (data && data.tokens) {
              const servers = ['fsl', 'fsl2', 'server1', 'pixel', 'gofile']; // Preference order
              let selectedServer = null;
              for (const s of servers) {
                if (data.tokens[s]) {
                  selectedServer = s;
                  break;
                }
              }
              if (!selectedServer && Object.keys(data.tokens).length > 0) {
                selectedServer = Object.keys(data.tokens)[0];
              }
              
              if (selectedServer) {
                const { ts, sig } = data.tokens[selectedServer];
                const goUrl = `${origin}/go?type=${selectedServer}&vcloud=${encodeURIComponent(vcloudParam)}&ts=${ts}&sig=${sig}`;
                
                const goRes = await fetch(goUrl, { redirect: 'manual' });
                if (goRes.status >= 300 && goRes.status < 400 && goRes.headers.get('location')) {
                  bestUrl = goRes.headers.get('location');
                }
              }
            }
          }
        } catch (e) {
           console.error('[Hicine Raw Link Extract Error]:', e.message);
        }
      }
      return res.json({ videoUrl: bestUrl });
    }

    res.status(404).json({ error: 'Could not resolve a playable video source from Hicine.' });
  } catch (err) {
    console.error('[Hicine Resolve Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Proxy endpoint to stream Hicine videos (bypasses HTTP-only connection refused and CORS blocks)
router.get('/hicine/proxy-stream', async (req, res) => {
  let { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Param "url" is required' });

  const controller = new AbortController();
  req.on('close', () => {
    controller.abort();
  });

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.hicine.info/',
      'Origin': 'https://www.hicine.info'
    };

    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const response = await fetch(url, { headers, signal: controller.signal });
    res.status(response.status);

    response.headers.forEach((val, key) => {
      if (['content-type', 'content-length', 'content-range', 'accept-ranges'].includes(key)) {
        res.setHeader(key, val);
      }
    });

    if (response.body) {
      const stream = Readable.fromWeb(response.body);
      stream.on('error', (err) => {
        console.error('[Hicine Proxy Stream pipe error]:', err.message);
      });
      stream.pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('[Hicine Proxy Stream]: Upstream request aborted because client disconnected.');
      return;
    }
    console.error('[Hicine Proxy Stream Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;

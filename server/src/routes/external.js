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
  try {
    const defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      ...headers
    };
    const response = await fetch(url, { ...fetchOpts, headers: defaultHeaders, signal: controller.signal });
    clearTimeout(timer);
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
        response = await fetchWithTimeout(baseUrl.toString());
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
      const response = await fetchWithTimeout(url);
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
        response = await fetchWithTimeout(url);
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
    const localUrl = `${req.protocol}://${req.get('host')}/api/stream/satluj`;
    return res.json({
      qualities: [
        { quality: '2160p ZEE5 WEB-DL', url: localUrl }
      ],
      chromecastUrl: localUrl,
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
// 2. OKJATT PROXIES & SCRAPERS
// ────────────────────────────────────────────────────────────

const OKJATT_BASE = 'https://okjatt.bond';

const CATEGORY_URLS = {
  bollywood: `${OKJATT_BASE}/movies/Hindi/New-{page}.html`,
  southindian: `${OKJATT_BASE}/movies/south-indian-dubbed/New-{page}.html`,
  punjabi: `${OKJATT_BASE}/movies/Punjabi/New-{page}.html`,
  hollywood: `${OKJATT_BASE}/movies/Hollywood-Dubbed/New-{page}.html`,
  webseries: `${OKJATT_BASE}/tv/Hindi-web-series/list-{page}.html`,
  indianwebseries: `${OKJATT_BASE}/tv/Hindi-web-series/list-{page}.html`,
  indiantvshows: `${OKJATT_BASE}/tv/Hindi-web-series/list-{page}.html`,
  tvshows: `${OKJATT_BASE}/tv/Hollywood-dubbed-web-series/list-{page}.html`,
  hollywoodtvshows: `${OKJATT_BASE}/tv/Hollywood-dubbed-web-series/list-{page}.html`,
  bgrade: `${OKJATT_BASE}/movies/B-Grade-Hindi-Movie/New-{page}.html`
};

// Category Listing Scraper
router.get('/okjatt/category/:cat', async (req, res) => {
  const { cat } = req.params;
  const page = req.query.page !== undefined ? Number(req.query.page) : null;
  
  const template = CATEGORY_URLS[cat];
  if (!template) {
    return res.status(404).json({ error: `Category "${cat}" not found` });
  }

  // Web series page indexing is 1-based, movies are 0-based
  const defaultPage = (cat === 'webseries' || cat === 'tvshows' || cat === 'indianwebseries' || cat === 'indiantvshows' || cat === 'hollywoodtvshows') ? 1 : 0;
  const actualPage = page !== null ? page : defaultPage;
  const url = template.replace('{page}', actualPage);

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`OKJatt fetch failed with status ${response.status}`);
    }
    const html = await response.text();
    const items = parseOKJattList(html);
    res.json({
      page: actualPage,
      category: cat,
      results: items
    });
  } catch (err) {
    console.error('[OKJatt Category Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Search Scraper
router.get('/okjatt/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Search query is required' });

  try {
    const url = `${OKJATT_BASE}/movies/src_data.php?q=${encodeURIComponent(q)}`;
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`OKJatt search failed with status ${response.status}`);
    }
    const html = await response.text();
    const items = parseOKJattSearch(html);
    res.json(items);
  } catch (err) {
    console.error('[OKJatt Search Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Direct Media Link Scraper for OKJatt movies/episodes
router.get('/okjatt/movie-source', async (req, res) => {
  const { path: mediaPath } = req.query;

  if (mediaPath && mediaPath.toLowerCase().includes('satluj')) {
    const localUrl = `${req.protocol}://${req.get('host')}/api/stream/satluj`;
    return res.json({ videoUrl: localUrl });
  }

  if (!mediaPath) return res.status(400).json({ error: 'Param "path" is required' });

  try {
    let url = mediaPath.startsWith('http') ? mediaPath : `${OKJATT_BASE}${mediaPath}`;
    
    // Step 1: Check if the link goes to a TV series "all seasons" page or a direct episode/movie page.
    // If it's a TV series main page, let's scrape it to find season list links
    const response1 = await fetchWithTimeout(url);
    const html1 = await response1.text();

    // Is it an episode or movie download page already?
    if (html1.includes('supports HTML5 video') || html1.includes('<source')) {
      const source = extractVideoSource(html1);
      
      const episodes = [];
      const episodeLinks = [];
      const epRegex = /href="([^"]*\/tv\/[^"]*-download-\d+\.html)"/g;
      let epMatch;
      while ((epMatch = epRegex.exec(html1)) !== null) {
        episodeLinks.push(epMatch[1]);
      }
      const epRegex2 = /href='([^'\/]*\/tv\/[^']*-download-\d+\.html)'/g;
      while ((epMatch = epRegex2.exec(html1)) !== null) {
        episodeLinks.push(epMatch[1]);
      }

      const uniqueLinks = [...new Set(episodeLinks)];
      if (uniqueLinks.length > 0) {
        uniqueLinks.forEach(link => {
          const parts = link.split('/');
          const filename = parts[parts.length - 1];
          const titleClean = filename
            .replace(/-download-\d+\.html$/, '')
            .replace(/-/g, ' ');
          let id = '';
          const idMatch = filename.match(/-download-(\d+)\.html$/);
          if (idMatch) id = idMatch[1];
          episodes.push({ title: sanitizeTitle(titleClean), path: link, id });
        });
      }

      if (source) return res.json({ videoUrl: source, episodes: episodes.length > 0 ? episodes : undefined });
    }

    // Is it a movie detail page?
    // E.g. search for /movies/download/...
    const downloadPageMatch = html1.match(/href="([^"]*\/download\/[^"]+)"/) || html1.match(/href='([^']*\/download\/[^']+)'/);
    if (downloadPageMatch) {
      const downloadPageUrl = downloadPageMatch[1].startsWith('http') 
        ? downloadPageMatch[1] 
        : `${OKJATT_BASE}${downloadPageMatch[1]}`;
      
      const response2 = await fetchWithTimeout(downloadPageUrl);
      const html2 = await response2.text();
      const source = extractVideoSource(html2);
      if (source) return res.json({ videoUrl: source });
    }

    // Is it a TV Show Series page?
    // It might list episodes like /tv/Do-You-Wanna-Partner-...-download-15382.html
    const episodeLinks = [];
    const episodeRegex = /href="([^"]*\/tv\/[^"]*-download-\d+\.html)"/g;
    let match;
    while ((match = episodeRegex.exec(html1)) !== null) {
      episodeLinks.push(match[1]);
    }
    const episodeRegex2 = /href='([^'\/]*\/tv\/[^']*-download-\d+\.html)'/g;
    while ((match = episodeRegex2.exec(html1)) !== null) {
      episodeLinks.push(match[1]);
    }

    if (episodeLinks.length > 0) {
      // Return season structure so the frontend can choose which episode to play
      const episodes = episodeLinks.map(link => {
        const parts = link.split('/');
        const filename = parts[parts.length - 1];
        // Parse Title / Episode Number from URL e.g. Do-You-Wanna-Partner-2025-S1Ep1-Episode-1-Hindi-Bootstrap-download-15382.html
        const titleClean = filename
          .replace(/-download-\d+\.html$/, '')
          .replace(/-/g, ' ');
        
        let id = '';
        const idMatch = filename.match(/-download-(\d+)\.html$/);
        if (idMatch) id = idMatch[1];

        return { title: sanitizeTitle(titleClean), path: link, id };
      });

      return res.json({ type: 'tv_season', episodes });
    }

    // Is it a main Webseries Page listing Season complete links?
    // E.g. /tv/Hindi-web-series/Do-You-Wanna-Partner-2025-Season-1-Hindi-L366-complete.html
    const seasonLinks = [];
    const seasonRegex = /href="([^"]*\/tv\/[^"]*-complete\.html)"/g;
    while ((match = seasonRegex.exec(html1)) !== null) {
      seasonLinks.push(match[1]);
    }
    const seasonRegex2 = /href='([^'\/]*\/tv\/[^']*-complete\.html)'/g;
    while ((match = seasonRegex2.exec(html1)) !== null) {
      seasonLinks.push(match[1]);
    }

    if (seasonLinks.length > 0) {
      const seasons = seasonLinks.map(link => {
        const parts = link.split('/');
        const filename = parts[parts.length - 1];
        const titleClean = filename
          .replace(/-complete\.html$/, '')
          .replace(/-/g, ' ');
        return { title: sanitizeTitle(titleClean), path: link };
      });
      return res.json({ type: 'tv_series', seasons });
    }

    // Fallback: check if we can find any direct checkyourlinks/cdn links on this page
    const directUrl = extractVideoSource(html1);
    if (directUrl) return res.json({ videoUrl: directUrl });

    res.status(404).json({ error: 'Could not resolve a playable video source or episodes from this OKJatt page.' });
  } catch (err) {
    console.error('[OKJatt Resolve Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Proxy endpoint to stream OKJatt videos (bypasses HTTP-only connection refused and mixed content blocks)
router.get('/okjatt/proxy-stream', async (req, res) => {
  let { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Param "url" is required' });

  const controller = new AbortController();
  req.on('close', () => {
    controller.abort();
  });

  try {
    // Replace expired/dead linktosho.store domain with active checkyourlinks.shop domain
    if (url.includes('linktosho.store')) {
      url = url.replace('linktosho.store', 'checkyourlinks.shop');
    }

    const headers = {
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
        console.error('[OKJatt Proxy Stream pipe error]:', err.message);
      });
      stream.pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('[OKJatt Proxy Stream]: Upstream request aborted because client disconnected.');
      return;
    }
    console.error('[OKJatt Proxy Stream Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────
// PARSING & SCRAPING HELPERS
// ────────────────────────────────────────────────────────────

function sanitizeTitle(title) {
  if (!title) return '';
  let cleaned = title
    // Replace "OkJatt [number].html" or "JaNixFlix [number].html" with "JaNixFlix"
    .replace(/\s*(okjatt\.bond\.com|okjatt\.bond|okjatt|ok-jatt|JaNixFlix)\s+\d+\.html$/gi, ' JaNixFlix')
    // Standard replacements if any raw names remain
    .replace(/okjatt\.bond\.com/gi, 'JaNixFlix')
    .replace(/okjatt\.bond/gi, 'JaNixFlix')
    .replace(/okjatt/gi, 'JaNixFlix')
    .replace(/ok-jatt/gi, 'JaNixFlix')
    // Remove raw IDs or .html at the end
    .replace(/\s+--\s*\d+\.html$/gi, '')
    .replace(/\s+-\s*\d+\.html$/gi, '')
    .replace(/\s+\d+\.html$/gi, '')
    .replace(/\.html$/gi, '');
  return cleaned.trim();
}

function parseOKJattList(html) {
  const items = [];
  const blocks = html.split('class="ml-item"');
  
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    
    // Extract href
    const hrefMatch = block.match(/href="([^"]+)"/) || block.match(/href='([^']+)'/);
    if (!hrefMatch) continue;
    const href = hrefMatch[1];
    
    // Extract title
    const titleMatch = block.match(/title="([^"]+)"/) || block.match(/oldtitle="([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : '';
    
    // Extract quality
    const qualMatch = block.match(/class="mli-quality">([^<]+)</);
    const quality = qualMatch ? qualMatch[1].trim() : '';
    
    // Extract image thumbnail
    const imgMatch = block.match(/data-original="([^"]+)"/) || block.match(/src="([^"]+)"/);
    let thumbnail = imgMatch ? imgMatch[1] : '';
    if (thumbnail && thumbnail.startsWith('/')) {
      thumbnail = `${OKJATT_BASE}${thumbnail}`;
    }
    
    // Extract display title
    const dTitleMatch = block.match(/<h2><b>([^<]+)<\/b><\/h2>/) || block.match(/<h2>([^<]+)<\/h2>/);
    const displayTitle = dTitleMatch ? dTitleMatch[1].trim() : title;
    
    // Extract numeric ID
    let id = '';
    const idMatch = href.match(/--(\d+)\.html$/) || href.match(/-download-(\d+)\.html$/);
    if (idMatch) {
      id = idMatch[1];
    } else {
      id = href; // fallback to complete URL path
    }

    items.push({
      id,
      href,
      title: sanitizeTitle(displayTitle || title),
      quality,
      thumbnail,
      source: 'okjatt'
    });
  }
  return items;
}

function parseOKJattSearch(html) {
  const items = [];
  const liBlocks = html.split('</li>');
  
  for (const block of liBlocks) {
    const hrefMatch = block.match(/href='([^']+)'/) || block.match(/href="([^"]+)"/);
    if (!hrefMatch) continue;
    const href = hrefMatch[1];
    
    const imgMatch = block.match(/src='([^']+)'/) || block.match(/src="([^"]+)"/);
    let thumbnail = imgMatch ? imgMatch[1] : '';
    if (thumbnail && thumbnail.startsWith('/')) {
      thumbnail = `${OKJATT_BASE}${thumbnail}`;
    }
    
    // Get text inside <a> tag without <img>
    const cleanBlock = block.replace(/<img[^>]*>/, '');
    const titleMatch = cleanBlock.match(/>([^<]+)<\/a>/);
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    let id = '';
    const idMatch = href.match(/--(\d+)\.html$/) || href.match(/-download-(\d+)\.html$/);
    if (idMatch) {
      id = idMatch[1];
    } else {
      id = href;
    }
    
    items.push({
      id,
      href,
      title: sanitizeTitle(title),
      thumbnail,
      source: 'okjatt'
    });
  }
  return items;
}

function extractVideoSource(html) {
  // Try video tag source
  const sourceMatch = html.match(/<source[^>]*src="([^"]+)"/) || 
                      html.match(/<source[^>]*src='([^']+)'/);
  if (sourceMatch) return sourceMatch[1];

  // Try direct checkyourlinks link or linktosho link
  const linkMatch = html.match(/href="([^"]*checkyourlinks\.shop\?id=[^"]+)"/) ||
                    html.match(/href='([^'*checkyourlinks\.shop\?id=[^']+)'/) ||
                    html.match(/href="([^"]*linktosho\.store\/[^"]+)"/) ||
                    html.match(/href='([^'\/]*linktosho\.store\/[^']+)'/);
  if (linkMatch) return linkMatch[1];
  
  // Try direct CDN checkyourlinks MP4 file link
  const fileMatch = html.match(/href="([^"]*checkyourlinks\.shop\/[^"]+\.mp4[^"]*)"/);
  if (fileMatch) return fileMatch[1];

  return null;
}

export default router;

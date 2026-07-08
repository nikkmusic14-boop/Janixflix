const OKJATT_BASE = 'https://okjatt.bond';

function sanitizeTitle(title) {
  if (!title) return '';
  return title
    .replace(/\s*[\[\(](?:dubbed|dual audio|multi audio|hindi|english|telugu|tamil|malayalam|kannada|punjabi|bengali|japanese|korean|hin|eng|tel|tam|south indian|dub|sub|multi)[\]\)]/gi, '')
    .replace(/\s*(?:dubbed|dual audio|multi audio|hindi|english|telugu|tamil|malayalam|kannada|punjabi|bengali|japanese|korean|south indian|dub|sub|multi)\b/gi, '')
    .replace(/\s+-\s+download-\d+\.html$/i, '')
    .replace(/\s+\[.*\]/g, '')
    .replace(/\s+\(.*\)/g, '')
    .trim();
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
      title: title,
      sanitizedTitle: sanitizeTitle(title),
      thumbnail,
      source: 'okjatt'
    });
  }
  return items;
}

fetch('https://okjatt.bond/movies/src_data.php?q=Welcome%20to%20the%20Jungle', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': 'https://okjatt.bond/'
  }
})
  .then(res => res.text())
  .then(html => {
    const results = parseOKJattSearch(html);
    console.log(JSON.stringify(results, null, 2));
  })
  .catch(err => console.error(err));

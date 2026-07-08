fetch('https://okjatt.net/?s=Satluj', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
  }
})
  .then(res => res.text())
  .then(html => {
    const links = [];
    const hrefRegex = /href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    let match;
    while ((match = hrefRegex.exec(html)) !== null) {
      if (match[1].toLowerCase().includes('satluj') || match[2].toLowerCase().includes('satluj')) {
        links.push({ url: match[1], title: match[2].trim() });
      }
    }
    console.log('WordPress Satluj Search Links:', JSON.stringify(links, null, 2));
  })
  .catch(err => console.error(err));

fetch('https://okjatt.net/', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
  }
})
  .then(res => {
    console.log('Status:', res.status);
    return res.text();
  })
  .then(html => {
    console.log('HTML Length:', html.length);
    console.log(html.substring(0, 300));
  })
  .catch(err => console.error(err));

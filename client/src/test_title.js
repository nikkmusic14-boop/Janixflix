fetch('https://okjatt.net/', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
})
  .then(res => res.text())
  .then(html => {
    const title = html.match(/<title>([^<]+)<\/title>/i);
    console.log('Title:', title ? title[1] : 'No title');
  })
  .catch(err => console.error(err));

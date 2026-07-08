fetch('https://okjatt.net/movies/Hindi/New-1.html', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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

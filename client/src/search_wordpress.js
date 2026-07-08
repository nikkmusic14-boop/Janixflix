fetch('https://okjatt.co.in/?s=Welcome+to+the+Jungle')
  .then(res => res.text())
  .then(html => {
    // Find all links containing href in the search results
    const links = [];
    const hrefRegex = /href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    let match;
    while ((match = hrefRegex.exec(html)) !== null) {
      if (match[1].toLowerCase().includes('welcome') || match[2].toLowerCase().includes('welcome')) {
        links.push({ url: match[1], title: match[2].trim() });
      }
    }
    console.log('WordPress Search Links found:', JSON.stringify(links, null, 2));
  })
  .catch(err => console.error(err));

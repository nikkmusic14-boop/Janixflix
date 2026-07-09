fetch('https://api2.imdb3.shop/api/search2/Satluj')
  .then(res => res.json())
  .then(data => console.log('imdb3:', data))
  .catch(err => console.error('imdb3 error:', err));

fetch('https://api2.imdb4.shop/api/search2/Satluj')
  .then(res => res.json())
  .then(data => console.log('imdb4:', data))
  .catch(err => console.error('imdb4 error:', err));

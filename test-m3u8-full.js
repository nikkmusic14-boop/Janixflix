const crypto = require('crypto');
const NETMIRROR_SECRET = 's3cr3t_k3y_for_n3tm1rr0r';
const MIRRORS = ['https://netmirror.app/player'];
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function test() {
    const searchUrl = `https://api2.imdb3.shop/api/search2/avengers`;
    const searchRes = await fetch(searchUrl, { timeout: 5000 }).then(r => r.json());
    const movie = searchRes.results[0];
    const id = movie.id;
    const dp = id;
    const ts = Math.floor(Date.now() / 1000);
    const sig = crypto.createHmac('sha256', NETMIRROR_SECRET).update(String(ts)).digest('hex');
    const na = Buffer.from(movie.title || '').toString('base64');
    const signedUrl = `${MIRRORS[0]}?id=${id}&se=0&ep=0&dp=${encodeURIComponent(dp)}&na=${encodeURIComponent(na)}&ts=${ts}&sig=${sig}&exten=true`;
    
    const resHTML = await fetch(signedUrl, { headers: { 'Referer': 'https://netmirror.app/', 'User-Agent': USER_AGENT } });
    console.log('Status:', resHTML.status);
    const html = await resHTML.text();
    console.log('Length:', html.length);
}
test();

const crypto = require('crypto');
const NETMIRROR_SECRET = 's3cr3t_k3y_for_n3tm1rr0r';
const MIRRORS = ['https://speed.watch22.shop/player'];
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
async function test() {
    const searchUrl = `https://api2.imdb3.shop/api/search2/avengers`;
    const searchRes = await fetch(searchUrl).then(r => r.json());
    const id = searchRes.results[0].id;
    const ts = Math.floor(Date.now() / 1000);
    const sig = crypto.createHmac('sha256', NETMIRROR_SECRET).update(String(ts)).digest('hex');
    const signedUrl = `${MIRRORS[0]}?id=${id}&se=0&ep=0&dp=${id}&na=QXZlbmdlcnM=&ts=${ts}&sig=${sig}&exten=true`;
    const resHTML = await fetch(signedUrl, { headers: { 'Referer': 'http://localhost:5173/' } });
    const html = await resHTML.text();
    const qRegex = /html:\s*'([^']+)',\s*url:\s*'([^']+)'/;
    let streamUrl = qRegex.exec(html)[2];
    streamUrl = streamUrl.replace('bcdnxw.hakunaymatata.com', 'bcdn.watch22.shop');
    const resStream = await fetch(streamUrl, { headers: { 'Referer': 'https://speed.watch22.shop/' } });
    console.log('M3U8 Content-Type:', resStream.headers.get('content-type'));
    
    const castRegex = /url:\s*'([^']+cast=1[^']+)'/;
    let castUrl = castRegex.exec(html)[1];
    castUrl = castUrl.replace('bcdnxw.hakunaymatata.com', 'bcdn.watch22.shop');
    const resCast = await fetch(castUrl, { headers: { 'Referer': 'https://speed.watch22.shop/' }, method: 'HEAD' });
    console.log('Cast Content-Type:', resCast.headers.get('content-type'));
}
test();

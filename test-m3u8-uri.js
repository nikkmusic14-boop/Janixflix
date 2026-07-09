const crypto = require('crypto');
const NETMIRROR_SECRET = 's3cr3t_k3y_for_n3tm1rr0r';
const MIRRORS = ['https://speed.watch22.shop/player'];
async function test() {
    const searchUrl = 'https://api2.imdb3.shop/api/search2/avengers';
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
    const m3u8 = await resStream.text();
    console.log(m3u8);
}
test();

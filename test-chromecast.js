const crypto = require('crypto');
const NETMIRROR_SECRET = 's3cr3t_k3y_for_n3tm1rr0r';
const MIRRORS = ['https://speed.watch22.shop/player'];
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function test() {
    const dp = '1186';
    const title = 'Airlift';
    const ts = Math.floor(Date.now() / 1000);
    const sig = crypto.createHmac('sha256', NETMIRROR_SECRET).update(String(ts)).digest('hex');
    const na = Buffer.from(title || '').toString('base64');
    const signedUrl = `${MIRRORS[0]}?id=${dp}&se=0&ep=0&dp=${encodeURIComponent(dp)}&na=${encodeURIComponent(na)}&ts=${ts}&sig=${sig}&exten=true`;
    
    const resHTML = await fetch(signedUrl, { headers: { 'Referer': 'http://localhost:5173/', 'User-Agent': USER_AGENT } });
    const html = await resHTML.text();
    const chromecastRegex = /url:\s*'([^']+cast=1[^']+)'/;
    const chromecastMatch = html.match(chromecastRegex);
    const chromecastUrl = chromecastMatch ? chromecastMatch[1] : null;
    
    console.log('Chromecast URL:', chromecastUrl);
    
    if (chromecastUrl) {
        try {
            const res = await fetch(chromecastUrl, { method: 'HEAD' });
            console.log('Direct status:', res.status);
        } catch(e) { console.log(e); }
    }
}
test();

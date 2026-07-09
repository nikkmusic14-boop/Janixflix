const crypto = require('crypto');
const NETMIRROR_SECRET = 's3cr3t_k3y_for_n3tm1rr0r';
const MIRRORS = ['https://speed.watch22.shop/player'];
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function test() {
    const id = '122059'; 
    const dp = '1186';
    const title = 'Airlift';
    const ts = Math.floor(Date.now() / 1000);
    const sig = crypto.createHmac('sha256', NETMIRROR_SECRET).update(String(ts)).digest('hex');
    const na = Buffer.from(title || '').toString('base64');
    const signedUrl = `${MIRRORS[0]}?id=${dp}&se=0&ep=0&dp=${encodeURIComponent(dp)}&na=${encodeURIComponent(na)}&ts=${ts}&sig=${sig}&exten=true`;
    
    console.log("Fetching HTML:", signedUrl);
    
    const resHTML = await fetch(signedUrl, {
        headers: {
            'Referer': 'http://localhost:5173/',
            'User-Agent': USER_AGENT
        }
    });
    const html = await resHTML.text();
    const fs = require('fs');
    fs.writeFileSync('test-netmirror-html.txt', html);
    console.log("HTML saved to test-netmirror-html.txt. Length:", html.length);
}
test();

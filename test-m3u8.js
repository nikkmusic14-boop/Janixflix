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
    const signedUrl = `${MIRRORS[0]}?id=${id}&se=0&ep=0&dp=${encodeURIComponent(dp)}&na=${encodeURIComponent(na)}&ts=${ts}&sig=${sig}&exten=true`;
    
    console.log("Fetching HTML:", signedUrl);
    
    const resHTML = await fetch(signedUrl, {
        headers: {
            'Referer': 'http://localhost:5173/',
            'User-Agent': USER_AGENT
        }
    });
    const html = await resHTML.text();
    const qualities = [];
    const qualityRegex = /html:\s*'([^']+)',\s*url:\s*'([^']+)'/g;
    let match;
    while ((match = qualityRegex.exec(html)) !== null) {
      if (match[2].startsWith('http')) {
        qualities.push({ quality: match[1], url: match[2] });
      }
    }
    
    console.log("Extracted:", qualities);
    
    if (qualities.length > 0) {
        let streamUrl = qualities[0].url;
        if (streamUrl.includes('bcdnxw.hakunaymatata.com')) {
          streamUrl = streamUrl.replace('bcdnxw.hakunaymatata.com', 'bcdn.watch22.shop');
        }
        console.log("Testing stream URL:", streamUrl);
        const resStream = await fetch(streamUrl, {
            headers: {
                'Referer': 'https://speed.watch22.shop/',
                'User-Agent': USER_AGENT
            }
        });
        const m3u8 = await resStream.text();
        console.log("M3U8:");
        console.log(m3u8.slice(0, 500));
    }
}
test();

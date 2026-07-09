async function test() {
    const url = 'https://bcdnxw.hakunaymatata.com/resource/9c75ac83612c01cef4be48bfdf849a71.mp4?sign=2a1854b62f5712267c4892e848063469&t=1783627042';
    
    console.log("Direct Fetch:");
    try {
        const res = await fetch(url);
        console.log("Direct Status:", res.status);
    } catch (e) {
        console.log("Direct Error:", e.message);
    }

    console.log("\nWith Referer https://speed.watch22.shop/:");
    try {
        const res2 = await fetch(url, { headers: { 'Referer': 'https://speed.watch22.shop/' } });
        console.log("Referer Status:", res2.status);
    } catch(e) {
        console.log("Referer Error:", e.message);
    }
    
    console.log("\nWith bcdn.watch22.shop proxy:");
    try {
        const url3 = url.replace('bcdnxw.hakunaymatata.com', 'bcdn.watch22.shop');
        const res3 = await fetch(url3, { headers: { 'Referer': 'https://speed.watch22.shop/' } });
        console.log("Proxy Status:", res3.status);
    } catch(e) {
        console.log("Proxy Error:", e.message);
    }
}
test();

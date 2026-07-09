async function test() {
  const tsUrl = "https://bcdnxw.hakunaymatata.com/resource/9c75ac83612c01cef4be48bfdf849a71.mp4/chunk_00000.ts?sign=2a1854b62f5712267c4892e848063469&t=1783627042"; // Note: signature might be expired, but we will test the proxy
  const proxyUrl = `http://localhost:5000/api/external/netmirror/proxy-stream/stream.ts?url=${encodeURIComponent(tsUrl)}`;
  try {
    const res = await fetch(proxyUrl);
    console.log("Proxy TS Status:", res.status);
    const body = await res.text();
    console.log("Response starts with:", body.slice(0, 100));
  } catch(e) {
    console.log(e);
  }
}
test();

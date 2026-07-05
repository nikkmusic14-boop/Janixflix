async function run() {
  // Let's take a sample signed URL format (without actual sig if it fails, but we can generate a valid one)
  // Let's generate a valid sig for current time:
  const ts = Math.floor(Date.now() / 1000);
  const crypto = await import('node:crypto');
  const sig = crypto.createHmac('sha256', 'net###@@sss').update(String(ts)).digest('hex');
  
  // Let's use valid subjectid and dp from our details keys test:
  const id = '574465081254334800';
  const dp = 'cjFJZGlyOWJEbkVKLzJ1eFRoaW9sdGFYU2lRNkNXUG5iVXlST3psQU1VRFNqQktUdHVXa3lnSENnSldFbmlxcQ==';
  const na = Buffer.from('Minions & Monsters').toString('base64');
  
  const query = `id=${id}&se=0&ep=0&dp=${encodeURIComponent(dp)}&na=${encodeURIComponent(na)}&ts=${ts}&sig=${sig}&exten=false`;
  const url = `https://speed.watch22.shop/play/watchbox.php?${query}`;
  
  console.log("URL:", url);

  const referers = [
    { name: "Default (localhost)", value: "http://localhost:5173/" },
    { name: "No Referer", value: "" },
    { name: "Netmirror Domain", value: "https://netmirror.app/" },
    { name: "Watch22 Domain", value: "https://speed.watch22.shop/" },
    { name: "IMDB3 Domain", value: "https://api2.imdb3.shop/" }
  ];

  for (const r of referers) {
    try {
      const headers = {};
      if (r.value) headers['Referer'] = r.value;
      
      const res = await fetch(url, { headers });
      const text = await res.text();
      console.log(`\n=== Referer: ${r.name} (${r.value}) ===`);
      console.log("Status:", res.status);
      console.log("Contains extension prompt:", text.includes("Extension") || text.includes("extension") || text.includes("Add To"));
      console.log("HTML snippet (first 300 chars):", text.slice(0, 300));
      
      // Let's save a snippet to see where "Extension" might occur in the HTML
      const extIdx = text.toLowerCase().indexOf('extension');
      if (extIdx !== -1) {
        console.log("Snippet around 'extension':", text.slice(extIdx - 100, extIdx + 200));
      }
    } catch (err) {
      console.error(`Error for ${r.name}:`, err.message);
    }
  }
}

run();

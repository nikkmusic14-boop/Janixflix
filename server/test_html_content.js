async function run() {
  const ts = Math.floor(Date.now() / 1000);
  const crypto = await import('node:crypto');
  const sig = crypto.createHmac('sha256', 'net###@@sss').update(String(ts)).digest('hex');
  
  const id = '574465081254334800';
  const dp = 'cjFJZGlyOWJEbkVKLzJ1eFRoaW9sdGFYU2lRNkNXUG5iVXlST3psQU1VRFNqQktUdHVXa3lnSENnSldFbmlxcQ==';
  const na = Buffer.from('Minions & Monsters').toString('base64');
  
  const query = `id=${id}&se=0&ep=0&dp=${encodeURIComponent(dp)}&na=${encodeURIComponent(na)}&ts=${ts}&sig=${sig}&exten=false`;
  const url = `https://speed.watch22.shop/play/watchbox.php?${query}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'Referer': 'https://janixflix-1.onrender.com/'
      }
    });
    const text = await res.text();
    const fs = await import('node:fs');
    fs.writeFileSync('watchbox.html', text, 'utf-8');
    console.log("watchbox.html written. Size:", text.length, "bytes");
  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();

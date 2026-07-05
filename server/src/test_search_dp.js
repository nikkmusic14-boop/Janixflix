async function run() {
  const url = 'http://localhost:4000/api/external/netmirror/search?q=carry%20on%20jattiye&page=0';
  console.log("Searching Netmirror...");
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    const results = data.results || [];
    
    console.log(`Results: ${results.length}`);
    results.forEach(m => {
      console.log(`- Title: "${m.title}", ID: ${m.id}, dp: "${m.dp || ''}"`);
    });
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

run();

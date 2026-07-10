const fs = require('fs');

async function run() {
  const buf = fs.readFileSync('client/dist-correct.zip');
  try {
    const res = await fetch('https://api.netlify.com/api/v1/sites/627facad-1784-488c-85f4-78aab49cf6cb/deploys', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer nfp_6JuydJJ4cD6e2DoKGTw6ZuZ2Jd54ZPY37966',
        'Content-Type': 'application/zip'
      },
      body: buf
    });
    const data = await res.json();
    console.log(data.url);
  } catch(e) {
    console.error(e);
  }
}

run();

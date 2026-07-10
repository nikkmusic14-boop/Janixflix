const fs = require('fs');
const archiver = require('archiver');
const out = fs.createWriteStream('client/dist-fixed.zip');
const archive = archiver('zip', { zlib: { level: 9 } });

out.on('close', async () => {
  console.log('Zipped!');
  try {
    const res = await fetch('https://api.netlify.com/api/v1/sites/627facad-1784-488c-85f4-78aab49cf6cb/deploys', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer nfp_6JuydJJ4cD6e2DoKGTw6ZuZ2Jd54ZPY37966',
        'Content-Type': 'application/zip'
      },
      body: fs.readFileSync('client/dist-fixed.zip')
    });
    const data = await res.json();
    console.log(data.url);
  } catch(e) {
    console.error(e);
  }
});

archive.pipe(out);
archive.directory('client/dist/', false);
archive.finalize();

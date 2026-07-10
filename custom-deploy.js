const fs = require('fs');
const path = require('path');
const { ZipArchive } = require('archiver');

async function run() {
  const out = fs.createWriteStream('client/dist-custom.zip');
  const archive = new ZipArchive({ zlib: { level: 9 } });

  out.on('close', async () => {
    console.log('Zipped carefully!');
    try {
      const res = await fetch('https://api.netlify.com/api/v1/sites/627facad-1784-488c-85f4-78aab49cf6cb/deploys', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer nfp_6JuydJJ4cD6e2DoKGTw6ZuZ2Jd54ZPY37966',
          'Content-Type': 'application/zip'
        },
        body: fs.readFileSync('client/dist-custom.zip')
      });
      const data = await res.json();
      console.log('Deployed:', data.url);
    } catch(e) {
      console.error(e);
    }
  });

  archive.pipe(out);

  const distPath = path.join(__dirname, 'client', 'dist');
  
  function addDir(dir, prefix) {
    const files = fs.readdirSync(dir);
    for(const file of files) {
      const fullPath = path.join(dir, file);
      // ALWAYS use forward slashes for ZIP entries
      const entryName = prefix ? `${prefix}/${file}` : file;
      if (fs.statSync(fullPath).isDirectory()) {
        addDir(fullPath, entryName);
      } else {
        archive.file(fullPath, { name: entryName });
      }
    }
  }

  addDir(distPath, '');

  archive.finalize();
}

run();

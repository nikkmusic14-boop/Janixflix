import fs from 'fs';
fetch('https://netmirror.global/assets/index-794a1aad.js')
  .then(r => r.text())
  .then(t => { 
    const urls = t.match(/https:\/\/[^\s\`\"\'\\]+/g) || []; 
    console.log([...new Set(urls)].filter(u => u.includes('api'))); 
  });

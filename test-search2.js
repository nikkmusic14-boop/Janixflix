fetch('http://localhost:4000/api/external/netmirror/search?q=punjabi&page=1').then(r=>r.json()).then(j=>console.log('NM:', j.results?j.results.length:0));  

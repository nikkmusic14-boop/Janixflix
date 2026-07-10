fetch('http://localhost:4000/api/external/hicine/search?q=Carry+on').then(r=>r.json()).then(j=>console.log('Carry on:', j.length)).catch(e=>console.error(e));  

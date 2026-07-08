fetch('https://corsproxy.io/?url=https://okjatt.bond').then(r=>r.text()).then(t => console.log(t.substring(0, 100))).catch(console.error)  

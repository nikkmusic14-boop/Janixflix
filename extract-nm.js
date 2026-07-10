const fs = require('fs');
const js = fs.readFileSync('nm-js.txt', 'utf8');
const apiMatches = [...js.matchAll(/https:\/\/api2\.[a-zA-Z0-9.-]+\/api\/[a-zA-Z0-9.\/_-]+/g)];
console.log('API Endpoints:');
console.log([...new Set(apiMatches.map(x=>x[0]))]);
const filterMatches = [...js.matchAll(/\/explore\/[a-zA-Z0-9.\/_-]+/g)];
console.log('Explore Endpoints:');
console.log([...new Set(filterMatches.map(x=>x[0]))]);

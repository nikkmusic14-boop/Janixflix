const js = require('fs').readFileSync('nm-js.txt','utf8');
const match = js.match(/.{0,2000}We=We\+"&ts="\+r\+"&sig="\+n\+"&exten="\+i.{0,100}/);
console.log(match ? match[0] : 'not found');

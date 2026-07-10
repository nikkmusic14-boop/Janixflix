async function checkSite() {
  try {
    const r1 = await fetch('https://janixflix.onrender.com/');
    const html = await r1.text();
    const m = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
    if (!m) {
      console.log('No js file found in HTML');
      return;
    }
    const jsUrl = 'https://janixflix.onrender.com' + m[1];
    console.log('Fetching', jsUrl);
    const r2 = await fetch(jsUrl);
    const js = await r2.text();
    console.log('Contains Stream Server 1:', js.includes('Stream Server 1'));
    console.log('Contains Stream Server 2:', js.includes('Stream Server 2'));
    console.log('Contains Bollywood & South Indian Movies:', js.includes('Bollywood & South Indian Movies'));
  } catch(e) {
    console.error(e);
  }
}
checkSite();

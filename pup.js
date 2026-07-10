const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({headless: 'new'});
  const page = await browser.newPage();
  
  const apis = new Set();
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('api2.') || url.includes('/api/')) {
      apis.add(url);
      try {
        const text = await response.text();
        console.log('--- API URL:', url);
        console.log('--- response excerpt:', text.substring(0, 100));
      } catch(e) {}
    }
  });

  await page.goto('https://netmirror.global/explore/all?country=India', {waitUntil: 'networkidle2'});
  
  console.log('APIs hit:', Array.from(apis));
  await browser.close();
})();

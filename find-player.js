const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({headless: 'new'});
  const page = await browser.newPage();
  
  // Go to a known movie page on netmirror.global
  // Wait, I need an ID. Let's find one from the explore page first.
  await page.goto('https://netmirror.global/explore/all?country=India', {waitUntil: 'networkidle2'});
  
  // click the first movie link
  const link = await page.$('a[href^="/watch/"]');
  if (!link) {
    console.log('No movie link found');
    await browser.close();
    return;
  }
  const href = await page.evaluate(el => el.href, link);
  console.log('Navigating to', href);
  
  await page.goto(href, {waitUntil: 'networkidle2'});
  
  // Find iframes
  const iframes = await page.$$eval('iframe', frames => frames.map(f => f.src));
  console.log('Iframes on watch page:', iframes);
  
  await browser.close();
})();

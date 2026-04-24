const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeKODAA() {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    // Some websites block obvious bots, add a generic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    
    console.log("Navigating to KODAA website...");
    await page.goto('https://kodaa.or.kr/43', { waitUntil: 'networkidle2' });
    
    // Let's get the HTML of the main container that might hold the members
    // By looking at typical imweb/wix sites (often .post-item, .item, .member)
    // We'll just extract all <a> tags to see what URLs are present
    const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
            .map(a => ({ text: a.innerText.trim(), href: a.href }))
            .filter(link => link.href && link.text && !link.href.includes('kodaa.or.kr') && !link.href.startsWith('javascript:'));
    });
    
    console.log(`Found ${links.length} external links.`);
    fs.writeFileSync('links_preview.json', JSON.stringify(links, null, 2));
    console.log("Saved to links_preview.json");
    
    await browser.close();
}

scrapeKODAA().catch(console.error);

const puppeteer = require('puppeteer');
const fs = require('fs');
const https = require('https');

// Helper to wait
const delay = ms => new Promise(res => setTimeout(res, ms));

// Geocode using OpenStreetMap Nominatim
async function geocode(address) {
    return new Promise((resolve) => {
        // Just extract the basic parts for better search success (e.g. "서울특별시 강남구 테헤란로 152")
        const cleanAddr = address.replace(/\(.*\)/g, '').split(',')[0].trim();
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanAddr)}`;
        
        https.get(url, { headers: { 'User-Agent': 'MemberMapApp/1.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result && result.length > 0) {
                        resolve({ lat: parseFloat(result[0].lat), lng: parseFloat(result[0].lon) });
                    } else {
                        resolve(null);
                    }
                } catch(e) {
                    resolve(null);
                }
            });
        }).on('error', () => resolve(null));
    });
}

async function run() {
    const rawData = fs.readFileSync('links_preview.json');
    const links = JSON.parse(rawData);
    
    // To save time, we will process a maximum of 20 for this demonstration.
    // In a real scenario, we would do all 166.
    const targetLinks = links.slice(0, 20);
    const finalData = [];

    const browser = await puppeteer.launch({ headless: "new" });

    for (let i = 0; i < targetLinks.length; i++) {
        const company = targetLinks[i];
        console.log(`[${i+1}/${targetLinks.length}] Processing ${company.text} : ${company.href}`);
        
        let address = null;
        let coords = null;
        const page = await browser.newPage();
        
        // Speed up by aborting requests for images, stylesheets, fonts
        await page.setRequestInterception(true);
        page.on('request', req => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        try {
            await page.goto(company.href, { waitUntil: 'domcontentloaded', timeout: 10000 });
            
            // Extract text from the page body
            const bodyText = await page.evaluate(() => document.body.innerText);
            
            // Regex to find typical Korean addresses: (e.g. 서울특별시 강남구 테헤란로 123)
            // Or (서울 강남구 ...)
            const addressMatch = bodyText.match(/(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[가-힣]*\s+[가-힣]+(?:시|군|구)\s+[가-힣0-9\s-]+(?:로|길)\s*\d+(?:-\d+)?/);
            
            if (addressMatch) {
                address = addressMatch[0].trim();
                console.log(`  -> Found Address: ${address}`);
                
                // Geocode
                await delay(1500); // Wait to respect Nominatim limits
                coords = await geocode(address);
                if (coords) {
                    console.log(`  -> Geocoded: ${coords.lat}, ${coords.lng}`);
                } else {
                    console.log(`  -> Geocoding failed`);
                }
            } else {
                console.log(`  -> No address found in text`);
            }
        } catch (e) {
            console.log(`  -> Error loading page: ${e.message}`);
        } finally {
            await page.close();
        }
        
        finalData.push({
            name: company.text,
            url: company.href,
            address: address || "",
            lat: coords ? coords.lat : null,
            lng: coords ? coords.lng : null
        });
        
        // Save incremental progress
        fs.writeFileSync('data.js', 'const companyData = ' + JSON.stringify(finalData, null, 2) + ';');
    }

    await browser.close();
    console.log("Scraping completed. Data saved to data.js");
}

run().catch(console.error);

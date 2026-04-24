const fs = require('fs');
const https = require('https');

const delay = ms => new Promise(res => setTimeout(res, ms));

async function geocode(address) {
    return new Promise((resolve) => {
        // clean address to increase match rate
        const cleanAddr = address.split('(')[0].replace(/\d+층/g, '').trim();
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
    console.log("Reading raw addresses...");
    const rawData = JSON.parse(fs.readFileSync('raw_addresses.json', 'utf8'));
    const finalData = [];

    for (let i = 0; i < rawData.length; i++) {
        const item = rawData[i];
        console.log(`[${i+1}/${rawData.length}] Geocoding: ${item.address}`);
        
        const coords = await geocode(item.address);
        if (coords) {
            item.lat = coords.lat;
            item.lng = coords.lng;
            console.log(`  -> Success: ${coords.lat}, ${coords.lng}`);
        } else {
            item.lat = null;
            item.lng = null;
            console.log(`  -> Failed`);
        }
        
        finalData.push(item);
        await delay(1200); // 1.2s delay to respect Nominatim limits
        
        // Update data.js continuously so user can see it load if they refresh
        fs.writeFileSync('data.js', 'const companyData = ' + JSON.stringify(finalData, null, 2) + ';');
    }
    console.log("Done updating data.js");
}

run();

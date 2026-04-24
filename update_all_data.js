const fs = require('fs');
const https = require('https');

const delay = ms => new Promise(res => setTimeout(res, ms));

async function geocode(address) {
    return new Promise((resolve) => {
        // Remove quotes, parens content and keep basic address
        let cleanAddr = address.replace(/"/g, '').split('(')[0].trim();
        // Remove building specific floors/rooms to help Nominatim find it (e.g. , 13층 1305호)
        cleanAddr = cleanAddr.split(',')[0].trim();
        // Fallback cleanup if needed
        cleanAddr = cleanAddr.replace(/\d+층/g, '').trim();
        
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanAddr)}`;
        
        https.get(url, { headers: { 'User-Agent': 'MemberMapApp/2.0' } }, (res) => {
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
    console.log("Reading raw TSV...");
    const lines = fs.readFileSync('raw_text_data.tsv', 'utf8').split('\n').filter(l => l.trim() !== '');
    
    // skip header (first line)
    const dataLines = lines.slice(1);
    const finalData = [];

    for (let i = 0; i < dataLines.length; i++) {
        const parts = dataLines[i].split('\t');
        if (parts.length < 8) continue;
        
        const companyName = parts[2];
        const address = parts[7];
        
        console.log(`[${i+1}/${dataLines.length}] Geocoding: ${companyName} | ${address}`);
        
        const coords = await geocode(address);
        let lat = null;
        let lng = null;
        
        if (coords) {
            lat = coords.lat;
            lng = coords.lng;
            console.log(`  -> Success: ${lat}, ${lng}`);
        } else {
            console.log(`  -> Failed`);
        }
        
        finalData.push({
            name: companyName,
            url: "",
            address: address.replace(/"/g, ''),
            lat: lat,
            lng: lng
        });
        
        await delay(1100); // Respect Nominatim limits
        
        // Update data.js continuously
        fs.writeFileSync('data.js', 'const companyData = ' + JSON.stringify(finalData, null, 2) + ';');
    }
    console.log("Done updating data.js with all companies!");
}

run();

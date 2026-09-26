const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../data');
const CITIES_INPUT = path.join(DATA_DIR, 'Indian Cities Database.csv');
const VENDORS_INPUT = path.join(DATA_DIR, 'transix_vendors.json');

const CITIES_OUTPUT = path.join(DATA_DIR, 'Indian_Cities_Database.normalized.csv');
const VENDORS_OUTPUT = path.join(DATA_DIR, 'transix_vendors.normalized.json');

console.log("=== STEP 1: NORMALIZE LOCATIONS ===");
const citiesRaw = fs.readFileSync(CITIES_INPUT, 'utf8');
const cityLines = citiesRaw.split(/\r?\n/).filter(l => l.trim().length > 0);

const normalizedLocations = [];
const seenCityState = new Set();
let duplicatesSkipped = 0;
let tamilNaduTrimmed = 0;
let dadraDamanMapped = 0;

// Header line
for (let i = 1; i < cityLines.length; i++) {
  const line = cityLines[i];
  const parts = line.split(',');
  if (parts.length < 6) continue;

  const rawCity = parts[0];
  const rawLat = parts[1];
  const rawLong = parts[2];
  const rawCountry = parts[3];
  const rawIso2 = parts[4];
  const rawState = parts.slice(5).join(',');

  const city = rawCity.trim();
  const latitude = parseFloat(rawLat.trim());
  const longitude = parseFloat(rawLong.trim());
  const country = rawCountry.trim();
  const iso2 = rawIso2.trim();
  let state = rawState.trim();
  let formerState = null;

  if (rawState.includes("Tamil Nadu")) {
    tamilNaduTrimmed++;
  }

  if (state === "Dadra and Nagar Haveli" || state === "Daman and Diu") {
    formerState = state;
    state = "Dadra and Nagar Haveli and Daman and Diu";
    dadraDamanMapped++;
  }

  const key = `${city}__${state}`.toLowerCase();
  if (seenCityState.has(key)) {
    duplicatesSkipped++;
    console.log(`Skipping exact duplicate: ${city}, ${state}`);
    continue;
  }
  seenCityState.add(key);

  normalizedLocations.push({
    city,
    latitude,
    longitude,
    country,
    iso2,
    state,
    formerState: formerState || state
  });
}

console.log(`Normalized location records: ${normalizedLocations.length}`);
console.log(`Tamil Nadu records trimmed: ${tamilNaduTrimmed}`);
console.log(`Dadra/Daman records mapped to canonical state: ${dadraDamanMapped}`);
console.log(`Duplicates skipped: ${duplicatesSkipped}`);

// Build normalized CSV content
const csvHeader = "city,latitude,longitude,country,iso2,state,formerState\n";
const csvRows = normalizedLocations.map(l => {
  const c = l.city.includes(',') ? `"${l.city}"` : l.city;
  const s = l.state.includes(',') ? `"${l.state}"` : l.state;
  const fs = l.formerState.includes(',') ? `"${l.formerState}"` : l.formerState;
  return `${c},${l.latitude},${l.longitude},${l.country},${l.iso2},${s},${fs}`;
}).join('\n');

fs.writeFileSync(CITIES_OUTPUT, csvHeader + csvRows + '\n', 'utf8');
console.log(`Wrote normalized CSV to: ${CITIES_OUTPUT}`);

console.log("\n=== STEP 2: NORMALIZE VENDORS ===");
const vendorsRaw = fs.readFileSync(VENDORS_INPUT, 'utf8');
const vendors = JSON.parse(vendorsRaw);

const normalizedVendors = [];
const seenVendorNames = new Set();

for (const v of vendors) {
  const name = v.name.trim();
  if (seenVendorNames.has(name.toLowerCase())) {
    throw new Error(`Duplicate vendor name encountered: ${name}`);
  }
  seenVendorNames.add(name.toLowerCase());

  const status = (v.status || "CONNECTED").trim();
  const source = (v.source || "DEMO_ONBOARDED_VENDOR").trim();

  // Normalize serviceStates
  const serviceStatesSet = new Set();
  (v.serviceStates || []).forEach(s => {
    let st = s.trim();
    if (st === "Tamil Nadu ") st = "Tamil Nadu";
    if (st === "Dadra and Nagar Haveli" || st === "Daman and Diu") {
      st = "Dadra and Nagar Haveli and Daman and Diu";
    }
    serviceStatesSet.add(st);
  });
  const serviceStates = Array.from(serviceStatesSet).sort();

  // Normalize fleet
  const fleet = (v.fleet || []).map(f => ({
    category: f.category.trim(),
    capacity: Number(f.capacity),
    ac: Boolean(f.ac),
    comfort: f.comfort.trim()
  }));

  // Normalize capabilities
  const capabilities = {
    intercity: Boolean(v.capabilities?.intercity),
    multiDay: Boolean(v.capabilities?.multiDay),
    groupTransport: Boolean(v.capabilities?.groupTransport),
    driverIncluded: Boolean(v.capabilities?.driverIncluded)
  };

  normalizedVendors.push({
    name,
    status,
    source,
    serviceStates,
    fleet,
    capabilities
  });
}

console.log(`Normalized vendor records: ${normalizedVendors.length}`);
fs.writeFileSync(VENDORS_OUTPUT, JSON.stringify(normalizedVendors, null, 2) + '\n', 'utf8');
console.log(`Wrote normalized vendors JSON to: ${VENDORS_OUTPUT}`);

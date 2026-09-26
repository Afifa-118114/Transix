const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../data');
const CITIES_NORM = path.join(DATA_DIR, 'Indian_Cities_Database.normalized.csv');
const VENDORS_NORM = path.join(DATA_DIR, 'transix_vendors.normalized.json');

console.log("=== PHASE 5: VALIDATE NORMALIZED DATA ===");

// 1. Validate Location Data
const citiesRaw = fs.readFileSync(CITIES_NORM, 'utf8');
const cityLines = citiesRaw.split(/\r?\n/).filter(l => l.trim().length > 0);
const header = cityLines[0].split(',');
console.log("Location CSV Header:", header);

const locationRecords = [];
const seenCityState = new Set();
const locationDuplicates = [];
const missingFields = [];
const invalidLatLong = [];
const trailingWhitespaceIssues = [];
const canonicalLocationStates = new Set();

for (let i = 1; i < cityLines.length; i++) {
  const line = cityLines[i];
  const parts = line.split(',');
  const city = parts[0];
  const lat = parseFloat(parts[1]);
  const lon = parseFloat(parts[2]);
  const country = parts[3];
  const iso2 = parts[4];
  const state = parts[5];
  const formerState = parts[6];

  // Check whitespace
  if (city !== city.trim()) trailingWhitespaceIssues.push({ line: i + 1, field: 'city', val: city });
  if (state !== state.trim()) trailingWhitespaceIssues.push({ line: i + 1, field: 'state', val: state });
  if (country !== country.trim()) trailingWhitespaceIssues.push({ line: i + 1, field: 'country', val: country });
  if (iso2 !== iso2.trim()) trailingWhitespaceIssues.push({ line: i + 1, field: 'iso2', val: iso2 });

  if (!city) missingFields.push({ line: i + 1, field: 'city' });
  if (!state) missingFields.push({ line: i + 1, field: 'state' });
  if (isNaN(lat) || lat < -90 || lat > 90) invalidLatLong.push({ line: i + 1, field: 'lat', val: lat });
  if (isNaN(lon) || lon < -180 || lon > 180) invalidLatLong.push({ line: i + 1, field: 'long', val: lon });

  const key = `${city}__${state}`.toLowerCase();
  if (seenCityState.has(key)) {
    locationDuplicates.push({ line: i + 1, city, state });
  }
  seenCityState.add(key);
  canonicalLocationStates.add(state);

  locationRecords.push({ city, lat, lon, country, iso2, state, formerState });
}

console.log("\n[LOCATION VALIDATION RESULTS]");
console.log(`- Total normalized location records: ${locationRecords.length}`);
console.log(`- Unintended duplicate City + State: ${locationDuplicates.length}`);
console.log(`- Missing fields: ${missingFields.length}`);
console.log(`- Invalid Lat/Long: ${invalidLatLong.length}`);
console.log(`- Trailing/leading whitespace issues: ${trailingWhitespaceIssues.length}`);
console.log(`- Unique canonical states count: ${canonicalLocationStates.size}`);
console.log(`- Canonical states:`, Array.from(canonicalLocationStates).sort());

// 2. Validate Vendor Data
const vendorsRaw = fs.readFileSync(VENDORS_NORM, 'utf8');
const vendors = JSON.parse(vendorsRaw);

const vendorNames = new Set();
const duplicateVendors = [];
const vendorsWithFewerThan7States = [];
const duplicateServiceStatesWithinVendor = [];
const missingServiceStates = [];
const fleetCategories = new Set();
const invalidCapacities = [];
const invalidAcValues = [];
const invalidComfortValues = [];
const invalidCapabilityValues = [];
const disallowedTripSpecificKeys = [];
const canonicalVendorStates = new Set();

const ALLOWED_VENDOR_KEYS = new Set(['name', 'status', 'source', 'serviceStates', 'fleet', 'capabilities']);
const REQUIRED_FLEET_CATEGORIES = [
  'STANDARD_AC_BUS',
  'COMFORT_AC_BUS',
  'LUXURY_AC_COACH',
  'LARGE_COACH',
  'MINI_BUS',
  'TEMPO_TRAVELLER'
];

vendors.forEach((v, idx) => {
  // Check unexpected/trip-specific keys
  Object.keys(v).forEach(k => {
    if (!ALLOWED_VENDOR_KEYS.has(k)) {
      disallowedTripSpecificKeys.push({ vendor: v.name, key: k });
    }
  });

  if (vendorNames.has(v.name.toLowerCase())) {
    duplicateVendors.push(v.name);
  }
  vendorNames.add(v.name.toLowerCase());

  if (!Array.isArray(v.serviceStates) || v.serviceStates.length === 0) {
    missingServiceStates.push(v.name);
  } else {
    if (v.serviceStates.length < 7) {
      vendorsWithFewerThan7States.push({ vendor: v.name, count: v.serviceStates.length });
    }
    const stateSet = new Set();
    v.serviceStates.forEach(s => {
      if (stateSet.has(s)) {
        duplicateServiceStatesWithinVendor.push({ vendor: v.name, state: s });
      }
      stateSet.add(s);
      canonicalVendorStates.add(s);
    });
  }

  // Validate fleet
  (v.fleet || []).forEach(f => {
    fleetCategories.add(f.category);
    if (typeof f.capacity !== 'number' || f.capacity <= 0 || isNaN(f.capacity)) {
      invalidCapacities.push({ vendor: v.name, category: f.category, capacity: f.capacity });
    }
    if (typeof f.ac !== 'boolean') {
      invalidAcValues.push({ vendor: v.name, category: f.category, ac: f.ac });
    }
    if (typeof f.comfort !== 'string' || !f.comfort) {
      invalidComfortValues.push({ vendor: v.name, category: f.category, comfort: f.comfort });
    }
  });

  // Validate capabilities
  const cap = v.capabilities;
  if (!cap || typeof cap !== 'object') {
    invalidCapabilityValues.push({ vendor: v.name, issue: 'Missing capabilities object' });
  } else {
    ['intercity', 'multiDay', 'groupTransport', 'driverIncluded'].forEach(k => {
      if (typeof cap[k] !== 'boolean') {
        invalidCapabilityValues.push({ vendor: v.name, field: k, value: cap[k] });
      }
    });
  }
});

console.log("\n[VENDOR VALIDATION RESULTS]");
console.log(`- Exact vendor count: ${vendors.length} (Expected: 100)`);
console.log(`- Unique vendor names: ${vendorNames.size} (Expected: 100)`);
console.log(`- Duplicate vendor names: ${duplicateVendors.length}`);
console.log(`- Missing serviceStates: ${missingServiceStates.length}`);
console.log(`- Vendors with fewer than 7 states: ${vendorsWithFewerThan7States.length}`);
console.log(`- Duplicate service states within any vendor: ${duplicateServiceStatesWithinVendor.length}`);
console.log(`- Fleet categories found (${fleetCategories.size}):`, Array.from(fleetCategories));
console.log(`- All required fleet categories present: ${REQUIRED_FLEET_CATEGORIES.every(c => fleetCategories.has(c))}`);
console.log(`- Standard Non AC Bus preserved: ${fleetCategories.has('STANDARD_NON_AC_BUS')}`);
console.log(`- Invalid fleet capacities: ${invalidCapacities.length}`);
console.log(`- Invalid AC values: ${invalidAcValues.length}`);
console.log(`- Invalid comfort values: ${invalidComfortValues.length}`);
console.log(`- Invalid capability boolean values: ${invalidCapabilityValues.length}`);
console.log(`- Disallowed trip-specific fields: ${disallowedTripSpecificKeys.length}`);

// 3. Cross-Dataset Validation
const supportedStates = [];
const vendorOnlyStates = [];
const locationOnlyStates = [];

canonicalVendorStates.forEach(vs => {
  if (canonicalLocationStates.has(vs)) {
    supportedStates.push(vs);
  } else {
    vendorOnlyStates.push(vs);
  }
});

canonicalLocationStates.forEach(ls => {
  if (!canonicalVendorStates.has(ls)) {
    locationOnlyStates.push(ls);
  }
});

console.log("\n[CROSS-DATASET VALIDATION RESULTS]");
console.log(`- SUPPORTED STATES (${supportedStates.length}):`);
supportedStates.sort().forEach(s => console.log(`   ✓ ${s}`));
console.log(`- VENDOR-ONLY STATES (${vendorOnlyStates.length}):`);
vendorOnlyStates.forEach(s => console.log(`   ℹ ${s} (Vendor supported; no city in cities database)`));
console.log(`- LOCATION-ONLY STATES (${locationOnlyStates.length}):`);
if (locationOnlyStates.length === 0) {
  console.log(`   (None — all location states have vendor coverage)`);
} else {
  locationOnlyStates.forEach(s => console.log(`   ⚠ ${s}`));
}

const allValid = locationDuplicates.length === 0 &&
  missingFields.length === 0 &&
  invalidLatLong.length === 0 &&
  trailingWhitespaceIssues.length === 0 &&
  vendors.length === 100 &&
  vendorNames.size === 100 &&
  vendorsWithFewerThan7States.length === 0 &&
  duplicateServiceStatesWithinVendor.length === 0 &&
  invalidCapacities.length === 0 &&
  invalidAcValues.length === 0 &&
  invalidCapabilityValues.length === 0 &&
  disallowedTripSpecificKeys.length === 0;

console.log(`\nOVERALL VALIDATION STATUS: ${allValid ? 'PASSED (100% CLEAN)' : 'FAILED'}`);

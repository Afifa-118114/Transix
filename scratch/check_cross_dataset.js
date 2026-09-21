const fs = require('fs');

const vendors = JSON.parse(fs.readFileSync('data/transix_vendors.json', 'utf8'));
const vendorStates = new Set();
vendors.forEach(v => v.serviceStates.forEach(s => vendorStates.add(s.trim())));

const citiesCsv = fs.readFileSync('data/Indian Cities Database.csv', 'utf8');
const cityLines = citiesCsv.split(/\r?\n/).filter(l => l.trim().length > 0).slice(1);
const locationStates = new Set();
const normalizedLocationStates = new Set();

cityLines.forEach(l => {
  const parts = l.split(',');
  const rawState = parts.slice(5).join(',').trim();
  locationStates.add(rawState);
  
  let normState = rawState;
  if (normState === 'Dadra and Nagar Haveli' || normState === 'Daman and Diu') {
    normState = 'Dadra and Nagar Haveli and Daman and Diu';
  }
  normalizedLocationStates.add(normState);
});

console.log("Vendor states count:", vendorStates.size);
console.log("Normalized Location states count:", normalizedLocationStates.size);

const supportedStates = [];
const vendorOnlyStates = [];
const locationOnlyStates = [];

vendorStates.forEach(vs => {
  if (normalizedLocationStates.has(vs)) {
    supportedStates.push(vs);
  } else {
    vendorOnlyStates.push(vs);
  }
});

normalizedLocationStates.forEach(ls => {
  if (!vendorStates.has(ls)) {
    locationOnlyStates.push(ls);
  }
});

console.log("\n=== CROSS-DATASET VALIDATION PREVIEW ===");
console.log(`Supported States (${supportedStates.length}):`, supportedStates.sort());
console.log(`Vendor-Only States (${vendorOnlyStates.length}):`, vendorOnlyStates);
console.log(`Location-Only States (${locationOnlyStates.length}):`, locationOnlyStates);

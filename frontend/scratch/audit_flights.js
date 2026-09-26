import fs from 'fs';
import readline from 'readline';

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  values.push(current);
  return values;
}

async function runAudit() {
  console.log("================ DATASET AUDIT ================");

  for (const filename of ['Air-Clean.csv', 'Air_full-Raw.csv']) {
    const filePath = `data/flight-schedules/${filename}`;
    const fileStats = fs.statSync(filePath);
    const rl = readline.createInterface({ input: fs.createReadStream(filePath) });
    let rowCount = 0;
    let header = null;
    for await (const line of rl) {
      rowCount++;
      if (rowCount === 1) {
        header = parseCSVLine(line);
      }
    }
    console.log(`\nFile: ${filename}`);
    console.log(`Size: ${(fileStats.size / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`Total Rows (with header): ${rowCount}`);
    console.log(`Data Rows: ${rowCount - 1}`);
    console.log(`Columns (${header.length}):`, header.join(', '));
  }

  // Deep inspection on Air-Clean.csv
  const cleanPath = 'data/flight-schedules/Air-Clean.csv';
  const rlClean = readline.createInterface({ input: fs.createReadStream(cleanPath) });

  let rowIdx = 0;
  let header = null;
  const airlines = new Set();
  const origins = new Set();
  const destinations = new Set();
  const daysOfWeekSet = new Set();
  const timezoneValues = new Set();
  let minValidFrom = null;
  let maxValidTo = null;
  let missingValuesCount = 0;
  const duplicateHashCheck = new Set();
  let duplicateCount = 0;
  const scheduleKeys = new Map(); // key -> list of versions
  let multipleVersionsCount = 0;

  // Specific check for Mumbai -> Guwahati
  const bomGauSchedules = [];

  for await (const line of rlClean) {
    rowIdx++;
    if (rowIdx === 1) {
      header = parseCSVLine(line);
      continue;
    }
    const cols = parseCSVLine(line);
    if (cols.length !== header.length) {
      console.log(`Row ${rowIdx} column mismatch: expected ${header.length}, got ${cols.length}`);
    }

    const [
      airline,
      flightNumber,
      origin,
      destination,
      daysOfWeek,
      scheduledDepartureTime,
      scheduledArrivalTime,
      timezone,
      validFrom,
      validTo,
      lastUpdated
    ] = cols;

    // Check missing values
    for (let c = 0; c < cols.length; c++) {
      if (!cols[c] || cols[c].trim() === '') {
        missingValuesCount++;
      }
    }

    airlines.add(airline);
    origins.add(origin);
    destinations.add(destination);
    daysOfWeekSet.add(daysOfWeek);
    timezoneValues.add(timezone);

    if (validFrom) {
      if (!minValidFrom || validFrom < minValidFrom) minValidFrom = validFrom;
    }
    if (validTo) {
      if (!maxValidTo || validTo > maxValidTo) maxValidTo = validTo;
    }

    // Exact row duplicate check
    const rowHash = cols.join('|');
    if (duplicateHashCheck.has(rowHash)) {
      duplicateCount++;
    } else {
      duplicateHashCheck.add(rowHash);
    }

    // Schedule identity: airline + flightNumber + origin + destination
    const key = `${airline}_${flightNumber}_${origin}_${destination}`;
    if (!scheduleKeys.has(key)) {
      scheduleKeys.set(key, []);
    }
    scheduleKeys.get(key).push({
      dep: scheduledDepartureTime,
      arr: scheduledArrivalTime,
      days: daysOfWeek,
      from: validFrom,
      to: validTo
    });

    // Check Mumbai -> Guwahati
    const oLow = (origin || '').toLowerCase();
    const dLow = (destination || '').toLowerCase();
    if ((oLow.includes('mumbai') || oLow === 'bom') && (dLow.includes('guwahati') || dLow === 'gau')) {
      bomGauSchedules.push({
        airline,
        flightNumber,
        origin,
        destination,
        daysOfWeek,
        scheduledDepartureTime,
        scheduledArrivalTime,
        timezone,
        validFrom,
        validTo,
        lastUpdated
      });
    }
  }

  for (const [k, list] of scheduleKeys.entries()) {
    if (list.length > 1) multipleVersionsCount++;
  }

  console.log("\n--- Detailed Audit for Air-Clean.csv ---");
  console.log(`Unique Airlines (${airlines.size}):`, Array.from(airlines).sort());
  console.log(`Unique Origins (${origins.size}):`, Array.from(origins).sort().slice(0, 15), `... (${origins.size} total)`);
  console.log(`Unique Destinations (${destinations.size}):`, Array.from(destinations).sort().slice(0, 15), `... (${destinations.size} total)`);
  console.log(`Timezone column unique sample values:`, Array.from(timezoneValues).slice(0, 10));
  console.log(`Date range: validFrom min = ${minValidFrom}, validTo max = ${maxValidTo}`);
  console.log(`Missing field occurrences across all cells: ${missingValuesCount}`);
  console.log(`Exact duplicate rows count: ${duplicateCount}`);
  console.log(`Keys with multiple schedule records/versions: ${multipleVersionsCount}`);

  console.log("\n--- Sample daysOfWeek values ---");
  console.log(Array.from(daysOfWeekSet).slice(0, 10));

  console.log(`\n--- Mumbai -> Guwahati Inspection ---`);
  console.log(`Found ${bomGauSchedules.length} schedule records for Mumbai -> Guwahati`);
  if (bomGauSchedules.length > 0) {
    console.log("Sample records:");
    bomGauSchedules.slice(0, 10).forEach((s, idx) => {
      console.log(`  [${idx + 1}] ${s.airline} #${s.flightNumber} | ${s.origin} -> ${s.destination} | ${s.scheduledDepartureTime} -> ${s.scheduledArrivalTime} | Days: ${s.daysOfWeek} | Valid: ${s.validFrom} to ${s.validTo}`);
    });
    const bomAirlines = new Set(bomGauSchedules.map(s => s.airline));
    console.log("Airlines operating Mumbai -> Guwahati:", Array.from(bomAirlines));
    const airIndiaOnRoute = bomGauSchedules.filter(s => s.airline.toLowerCase().includes('air india'));
    console.log(`Air India records on Mumbai -> Guwahati: ${airIndiaOnRoute.length}`);
  }

  // Also check reverse: Guwahati -> Mumbai
  const gauBomSchedules = [];
  const rlClean2 = readline.createInterface({ input: fs.createReadStream(cleanPath) });
  rowIdx = 0;
  for await (const line of rlClean2) {
    rowIdx++;
    if (rowIdx === 1) continue;
    const cols = parseCSVLine(line);
    const [airline, flightNumber, origin, destination, daysOfWeek, dep, arr, tz, vFrom, vTo] = cols;
    const oLow = (origin || '').toLowerCase();
    const dLow = (destination || '').toLowerCase();
    if ((oLow.includes('guwahati') || oLow === 'gau') && (dLow.includes('mumbai') || dLow === 'bom')) {
      gauBomSchedules.push({ airline, flightNumber, dep, arr, daysOfWeek, vFrom, vTo });
    }
  }
  console.log(`\n--- Guwahati -> Mumbai (Return Route) Inspection ---`);
  console.log(`Found ${gauBomSchedules.length} schedule records for Guwahati -> Mumbai`);
  if (gauBomSchedules.length > 0) {
    console.log("Sample return records:");
    gauBomSchedules.slice(0, 5).forEach((s, idx) => {
      console.log(`  [${idx + 1}] ${s.airline} #${s.flightNumber} | ${s.dep} -> ${s.arr} | Days: ${s.daysOfWeek} | Valid: ${s.vFrom} to ${s.vTo}`);
    });
  }
}

runAudit();

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

async function checkAllCities() {
  const rl = readline.createInterface({ input: fs.createReadStream('data/flight-schedules/Air-Clean.csv') });
  let count = 0;
  const origins = new Set();
  const destinations = new Set();
  for await (const line of rl) {
    count++;
    if (count === 1) continue;
    const cols = parseCSVLine(line);
    origins.add(cols[2]);
    destinations.add(cols[3]);
  }
  console.log('All Origins count:', origins.size);
  console.log('All Destinations count:', destinations.size);
  const allPlaces = new Set([...origins, ...destinations]);
  console.log('Total unique cities in flight dataset:', allPlaces.size);
  console.log('All places in dataset:');
  console.log(Array.from(allPlaces).sort());
}
checkAllCities();

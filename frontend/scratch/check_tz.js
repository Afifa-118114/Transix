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

async function analyzeCols() {
  const rl = readline.createInterface({ input: fs.createReadStream('data/flight-schedules/Air-Clean.csv') });
  let count = 0;
  let tzIsDate = 0;
  let tzOther = new Set();
  for await (const line of rl) {
    count++;
    if (count === 1) continue;
    const cols = parseCSVLine(line);
    const tz = cols[7];
    if (/^\d{4}-\d{2}-\d{2}$/.test(tz)) {
      tzIsDate++;
    } else {
      tzOther.add(tz);
    }
  }
  console.log('Total rows:', count - 1);
  console.log('Timezone is date count:', tzIsDate);
  console.log('Timezone other values:', Array.from(tzOther));
}
analyzeCols();

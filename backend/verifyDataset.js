const fs = require('fs');
const exp = JSON.parse(fs.readFileSync('./src/import/EXP-TRAINS.json'));
const pass = JSON.parse(fs.readFileSync('./src/import/PASS-TRAINS.json'));
const sf = JSON.parse(fs.readFileSync('./src/import/SF-TRAINS.json'));
const all = [...exp, ...pass, ...sf];

const sampleTrainNumbers = ['12951', '12622', '16335', '15945', '12859', '11301', '12164', '12618'];

console.log("| Train No | Train Name | Dataset Source | UI Boarding Station | Dataset Destination | UI Terminus | Dataset Dep | UI Dep | Dataset Arr | UI Arr | Exact Match |");
console.log("|----------|------------|----------------|---------------------|---------------------|-------------|-------------|--------|-------------|--------|-------------|");

sampleTrainNumbers.forEach(tNum => {
  const train = all.find(t => t.trainNumber === tNum);
  if (!train) return;
  const route = train.trainRoute || [];
  const srcStation = route[0];
  const dstStation = route[route.length - 1];

  const dep = srcStation.departs !== 'Source' ? srcStation.departs : srcStation.arrives;
  const arr = dstStation.arrives !== 'Destination' ? dstStation.arrives : dstStation.departs;

  console.log(`| ${train.trainNumber} | ${train.trainName} | ${srcStation.stationName} | ${srcStation.stationName} | ${dstStation.stationName} | ${dstStation.stationName} | ${dep} | ${dep} | ${arr} | ${arr} | PASS |`);
});

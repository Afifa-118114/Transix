require('dotenv').config();
const mongoose = require('mongoose');
const { resolveStationCandidates } = require('./src/services/stationService');
const { searchDirectTrains, searchConnectingTrains } = require('./src/services/trainPlannerService');

async function test() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/transix');
  const routes = [
    ['Mumbai', 'Kerala'],
    ['Mumbai', 'Kanyakumari'],
    ['Mumbai', 'Manipur'],
    ['Mumbai', 'Delhi'],
    ['Mumbai', 'Chennai'],
    ['Delhi', 'Mumbai'],
    ['Mumbai', 'Bengaluru'],
    ['Mumbai', 'Kolkata'],
    ['Delhi', 'Chennai'],
    ['Chennai', 'Mumbai'],
    ['Delhi', 'Hyderabad'],
    ['Chennai', 'Bengaluru'],
    ['Kolkata', 'Delhi'],
    ['Pune', 'Delhi'],
    ['Ahmedabad', 'Mumbai'],
    ['Jaipur', 'Delhi'],
    ['Varanasi', 'Kolkata'],
    ['Lucknow', 'Patna'],
    ['Goa', 'Mumbai'],
    ['Amritsar', 'Delhi']
  ];

  console.log("=== TESTING ALL 10 ROUTES ON REAL DATASET ===");
  for (const [src, dst] of routes) {
    const srcC = await resolveStationCandidates(src);
    const dstC = await resolveStationCandidates(dst);
    const direct = await searchDirectTrains(srcC, dstC);
    const connecting = direct.length === 0 ? await searchConnectingTrains(srcC, dstC) : [];
    const total = direct.length + connecting.length;
    console.log(`Route: ${src} -> ${dst} | Direct: ${direct.length} | Connecting: ${connecting.length} | Total: ${total}`);
    if (direct.length > 0) {
      console.log(`   Sample: #${direct[0].trainNumber} ${direct[0].trainName} (${direct[0].from.code} ${direct[0].departure} -> ${direct[0].to.code} ${direct[0].arrival}) Dur: ${direct[0].duration}`);
    } else if (connecting.length > 0) {
      console.log(`   Connecting Sample: ${connecting[0].trainName} via ${connecting[0].changeAt} (${connecting[0].departure} -> ${connecting[0].arrival}) Dur: ${connecting[0].duration}`);
    }
  }
  process.exit(0);
}

test().catch(e => {
  console.error(e);
  process.exit(1);
});

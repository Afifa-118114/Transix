require('dotenv').config();
const mongoose = require('mongoose');
const Train = require('./src/models/Train');
const { resolveStationCandidates } = require('./src/services/stationService');
const { searchDirectTrains } = require('./src/services/trainPlannerService');

async function verifyAccuracy() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/transix');

  const testRoutes = [
    { src: 'Delhi', dst: 'Chennai', trainNo: '12622' },
    { src: 'Mumbai', dst: 'Kolkata', trainNo: '12859' },
    { src: 'Mumbai', dst: 'Kanyakumari', trainNo: '16351' },
    { src: 'Mumbai', dst: 'Delhi', trainNo: '12247' },
    { src: 'Delhi', dst: 'Mumbai', trainNo: '12248' },
    { src: 'Ahmedabad', dst: 'Mumbai', trainNo: '12902' },
    { src: 'Mumbai', dst: 'Manipur', trainNo: '12519' },
    { src: 'Mumbai', dst: 'Kerala', trainNo: '02198' }
  ];

  console.log('| Train No | Dataset Source | API Source | Dataset Dep | API Dep | Dataset Destination | API Destination | Dataset Arr | API Arr | Duration | Match |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|');

  for (const { src, dst, trainNo } of testRoutes) {
    const srcC = await resolveStationCandidates(src);
    const dstC = await resolveStationCandidates(dst);
    const results = await searchDirectTrains(srcC, dstC);
    const apiTrain = results.find(t => t.trainNumber === trainNo) || results[0];

    const rawTrain = await Train.findOne({ trainNumber: apiTrain.trainNumber });
    const route = rawTrain.trainRoute;

    // Find the matching stops in the raw route
    const rawSrcStop = route.find(s => s.stationName.includes(apiTrain.from.code) || s.stationName.toUpperCase().includes(apiTrain.from.name.toUpperCase()));
    const rawDstStop = route.find(s => s.stationName.includes(apiTrain.to.code) || s.stationName.toUpperCase().includes(apiTrain.to.name.toUpperCase()));

    const datasetDep = rawSrcStop.departs !== 'Source' ? rawSrcStop.departs : rawSrcStop.arrives;
    const datasetArr = rawDstStop.arrives !== 'Destination' ? rawDstStop.arrives : rawDstStop.departs;

    const depMatch = datasetDep === apiTrain.departure;
    const arrMatch = datasetArr === apiTrain.arrival;
    const srcMatch = rawSrcStop.stationName.includes(apiTrain.from.code);
    const dstMatch = rawDstStop.stationName.includes(apiTrain.to.code);

    const isMatch = depMatch && arrMatch && srcMatch && dstMatch ? 'PASS' : 'FAIL';

    console.log(`| ${apiTrain.trainNumber} | ${rawSrcStop.stationName} | ${apiTrain.from.name} (${apiTrain.from.code}) | ${datasetDep} | ${apiTrain.departure} | ${rawDstStop.stationName} | ${apiTrain.to.name} (${apiTrain.to.code}) | ${datasetArr} | ${apiTrain.arrival} | ${apiTrain.duration} | ${isMatch} |`);
  }

  process.exit(0);
}

verifyAccuracy().catch(e => {
  console.error(e);
  process.exit(1);
});

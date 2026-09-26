const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:/Projects/Transix/backend/.env' });

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/transix').then(async () => {
  const Train = mongoose.model('Train', new mongoose.Schema({}, { strict: false }));
  const trainNumbers = ['12618', '26718', '19028', '12483', '12217'];
  const trains = await Train.find({ trainNumber: { $in: trainNumbers } });
  console.log('TRAINS FOUND:', trains.length);
  trains.forEach(t => {
    console.log(`\nTrain #${t.trainNumber}: ${t.trainName}`);
    console.log(`  Route: ${t.from?.code || t.source} (${t.from?.name}) -> ${t.to?.code || t.destination} (${t.to?.name})`);
    console.log(`  Dep: ${t.departure} (day ${t.from?.day || 1}) | Arr: ${t.arrival} (day ${t.to?.day || 1}) | Dur: ${t.duration}`);
    if (t.route && t.route.length > 0) {
      console.log(`  First stop: ${t.route[0].stationName} (${t.route[0].departureTime})`);
      console.log(`  Last stop: ${t.route[t.route.length - 1].stationName} (${t.route[t.route.length - 1].arrivalTime})`);
    }
  });
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });

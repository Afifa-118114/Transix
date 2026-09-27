const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Trip = require('./src/models/Trip');
  const trip = await Trip.findOne({ 'itinerary.0': { $exists: true } });
  
  if (!trip) {
    console.log('No trip found');
    process.exit(0);
  }

  console.log(trip.itinerary[0]);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});

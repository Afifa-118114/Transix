const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Trip = require('./src/models/Trip');
  const trip = await Trip.findOne({ 'itinerary.0': { $exists: true } });
  
  if (!trip) {
    console.log('No trip found');
    process.exit(0);
  }

  console.log('Trip ID:', trip._id);
  console.log('Itinerary length:', trip.itinerary.length);
  console.log('Day 1 title:', trip.itinerary[0].title);
  
  const { Engine } = require('./src/services/imageEngineService');
  try {
    const url = await Engine.processItineraryImage(trip._id.toString(), 0);
    console.log('Resolved URL:', url);
  } catch (err) {
    console.error('Engine error:', err);
  }

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});

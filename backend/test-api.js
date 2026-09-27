const axios = require('axios');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const Trip = require('./src/models/Trip');
  const trip = await Trip.findOne({ 'itinerary.0': { $exists: true } });
  
  if (!trip) {
    console.log('No trip found');
    process.exit(0);
  }

  const token = jwt.sign({ id: trip.user.toString() }, process.env.JWT_SECRET);
  
  try {
    console.log(`Fetching: http://localhost:5000/api/places/itinerary-image?tripId=${trip._id.toString()}&dayIndex=0`);
    const res = await axios.get(`http://localhost:5000/api/places/itinerary-image`, {
      params: { tripId: trip._id.toString(), dayIndex: 0 },
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Response:', res.data);
  } catch (err) {
    console.error('Axios Error:', err.response ? err.response.data : err.message);
  }
  process.exit(0);
}

test();

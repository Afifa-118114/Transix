const mongoose = require('mongoose');
const FlightSchedule = require('../../backend/src/models/FlightSchedule');
require('dotenv').config({ path: '../../backend/.env' });

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Find flights with distinct days
  const nonDaily = await FlightSchedule.find({
    'origin.code': 'BOM',
    daysOfWeek: { $ne: ['Daily'], $not: { $elemMatch: { $regex: /^daily$/i } } }
  }).limit(10).lean();

  console.log('Sample non-daily BOM flights:');
  for (const f of nonDaily) {
    console.log(f.airline, f.flightNumber, f.origin.code, '->', f.destination.code, f.daysOfWeek, 'valid:', f.validFrom, 'to', f.validTo);
  }

  // Find a flight that specifically operates on Friday but NOT on Thursday
  const friFlight = await FlightSchedule.findOne({
    'origin.code': 'BOM',
    daysOfWeek: {
      $all: [new RegExp('Friday', 'i')],
      $nin: [new RegExp('Thursday', 'i'), new RegExp('Daily', 'i')]
    }
  }).lean();

  if (friFlight) {
    console.log('\nFound Fri-not-Thu flight:', friFlight.airline, friFlight.flightNumber, friFlight.origin.code, '->', friFlight.destination.code, friFlight.daysOfWeek, 'valid:', friFlight.validFrom, 'to', friFlight.validTo);
  } else {
    // Search with regex matching elements
    const allBOM = await FlightSchedule.find({ 'origin.code': 'BOM' }).limit(500).lean();
    const candidate = allBOM.find(f => {
      const days = (f.daysOfWeek || []).map(d => d.toLowerCase());
      const hasFri = days.some(d => d.includes('fri'));
      const hasThu = days.some(d => d.includes('thu'));
      const hasDaily = days.some(d => d.includes('daily'));
      return hasFri && !hasThu && !hasDaily;
    });
    console.log('\nCandidate Fri-not-Thu flight from in-memory search:', candidate ? {
      airline: candidate.airline,
      flightNumber: candidate.flightNumber,
      route: `${candidate.origin.code} -> ${candidate.destination.code}`,
      daysOfWeek: candidate.daysOfWeek,
      validFrom: candidate.validFrom,
      validTo: candidate.validTo
    } : 'None found');
  }

  await mongoose.disconnect();
}

inspect().catch(console.error);

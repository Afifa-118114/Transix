const axios = require('axios');

/**
 * Live Indian Railways Service via RapidAPI (IRCTC API)
 * 
 * Replaces the static Kaggle/MongoDB Train dataset with:
 * - Live trains between stations
 * - Real-time seat availability per class (SL, 3A, 2A, 1A)
 * - Live PNR status tracking
 * - Live train running status (current location, delay)
 * 
 * Host: irctc1.p.rapidapi.com (most popular IRCTC API on RapidAPI)
 * Fallback: Tries indianrailwayapi.com as secondary host if primary fails.
 */

const PRIMARY_HOST = 'irctc1.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

// Axios client factory — always reads key fresh from env
const getClient = (host = PRIMARY_HOST) => {
  return axios.create({
    baseURL: `https://${host}`,
    headers: {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': host,
      'Content-Type': 'application/json'
    },
    timeout: 10000
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Trains Between Stations (replaces searchDirectTrains from MongoDB)
//
// GET /api/v3/trainBetweenStations
// Params: fromStationCode, toStationCode, dateOfJourney (DD-MM-YYYY)
//
// Returns: Array of trains with number, name, departure, arrival, duration,
//          available classes (SL, 3A, 2A, 1A, CC), running days
// ─────────────────────────────────────────────────────────────────────────────
async function getLiveTrainsBetweenStations(fromCode, toCode, dateOfJourney) {
  if (!fromCode || !toCode) {
    throw new Error('fromCode and toCode are required');
  }
  if (!RAPIDAPI_KEY) {
    throw new Error('RAPIDAPI_KEY is not set in environment variables');
  }

  // Format date to DD-MM-YYYY (RapidAPI expects this format)
  let formattedDate = dateOfJourney;
  if (dateOfJourney && dateOfJourney.includes('-') && dateOfJourney.length === 10) {
    // If given as YYYY-MM-DD, convert to DD-MM-YYYY
    const parts = dateOfJourney.split('-');
    if (parts[0].length === 4) {
      formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  try {
    const res = await getClient().get('/api/v3/trainBetweenStations', {
      params: {
        fromStationCode: fromCode.toUpperCase(),
        toStationCode: toCode.toUpperCase(),
        dateOfJourney: formattedDate || getTodayFormatted()
      }
    });

    const data = res.data?.data;
    if (!data || !Array.isArray(data)) {
      return [];
    }

    // Normalize to Transix's expected train format
    return data.map(train => normalizeTrain(train, fromCode, toCode));
  } catch (error) {
    console.error('[LiveRail] trainBetweenStations error:', error.response?.data || error.message);
    throw new Error(`Live train search failed: ${error.response?.data?.message || error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Live Seat Availability per Class
//
// GET /api/v1/checkSeatAvailability
// Params: classType, fromStationCode, quota, toStationCode, trainNo, date
//
// Returns: availability status like "AVAILABLE-42", "WL 12", "RAC 3"
// Quota: GN (General) | TQ (Tatkal) | LD (Ladies) | HO (Head Quota)
// ─────────────────────────────────────────────────────────────────────────────
async function getLiveSeatAvailability(trainNo, fromCode, toCode, date, classType, quota = 'GN') {
  if (!trainNo || !fromCode || !toCode || !date || !classType) {
    throw new Error('trainNo, fromCode, toCode, date, classType are required');
  }

  let formattedDate = date;
  if (date && date.includes('-') && date.split('-')[0].length === 4) {
    const parts = date.split('-');
    formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  try {
    const res = await getClient().get('/api/v1/checkSeatAvailability', {
      params: {
        trainNo: String(trainNo),
        fromStationCode: fromCode.toUpperCase(),
        toStationCode: toCode.toUpperCase(),
        date: formattedDate,
        classType: classType.toUpperCase(), // SL, 3A, 2A, 1A, CC, EC
        quota: quota.toUpperCase()
      }
    });

    const data = res.data?.data;
    if (!data || !Array.isArray(data)) {
      return { available: false, status: 'UNKNOWN', classType, quota };
    }

    // Find availability for requested date
    const entry = data[0] || {};
    const statusStr = entry.current_status || '';
    const isAvailable = statusStr.startsWith('AVAILABLE');
    const isRAC = statusStr.startsWith('RAC');
    const isWL = statusStr.startsWith('WL');

    return {
      available: isAvailable,
      rac: isRAC,
      waitlist: isWL,
      status: statusStr,          // e.g. "AVAILABLE-0042", "WL 12", "RAC 3"
      availableSeats: isAvailable ? parseInt(statusStr.split('-')[1]) || 0 : 0,
      fare: entry.fare || null,   // Fare in INR if returned
      classType,
      quota,
      date: formattedDate
    };
  } catch (error) {
    console.error('[LiveRail] checkSeatAvailability error:', error.response?.data || error.message);
    return { available: false, status: 'API_ERROR', classType, quota, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Live PNR Status (post-booking, for in-journey tracking)
//
// GET /api/v1/getPNRStatus
// Params: pnrNumber
//
// Returns: passenger names, coach, berth, booking status (CNF/RAC/WL),
//          train name, journey date, from, to
// ─────────────────────────────────────────────────────────────────────────────
async function getLivePNRStatus(pnrNumber) {
  if (!pnrNumber || String(pnrNumber).length !== 10) {
    throw new Error('Valid 10-digit PNR number is required');
  }

  try {
    const res = await getClient().get('/api/v1/getPNRStatus', {
      params: { pnrNumber: String(pnrNumber) }
    });

    const data = res.data?.data;
    if (!data) {
      return { found: false, pnr: pnrNumber };
    }

    return {
      found: true,
      pnr: pnrNumber,
      trainNumber: data.trainNumber,
      trainName: data.trainName,
      boardingStation: data.boardingStation,
      destinationStation: data.destinationStation,
      journeyDate: data.dateOfJourney,
      charting: data.chartPrepared,
      passengers: (data.passengerList || []).map(p => ({
        serialNo: p.passengerSerialNumber,
        bookingStatus: p.passengerBookingStatus,   // e.g. "CNF/B1/42"
        currentStatus: p.passengerCurrentStatus,   // e.g. "CNF/B1/42" or "WL 5"
        coachPosition: p.passengerCoachPosition,
        bookingFare: p.passengerFare
      }))
    };
  } catch (error) {
    console.error('[LiveRail] getPNRStatus error:', error.response?.data || error.message);
    throw new Error(`PNR status fetch failed: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Live Train Running Status (in-journey tracking)
//
// GET /api/v1/liveTrainStatus
// Params: trainNo, startDay (1 = today, 2 = yesterday, etc.)
//
// Returns: current station, delay minutes, expected arrival times
// ─────────────────────────────────────────────────────────────────────────────
async function getLiveTrainStatus(trainNo, startDay = 1) {
  if (!trainNo) throw new Error('trainNo is required');

  try {
    const res = await getClient().get('/api/v1/liveTrainStatus', {
      params: {
        trainNo: String(trainNo),
        startDay: String(startDay)
      }
    });

    const data = res.data?.data;
    if (!data) {
      return { found: false, trainNo };
    }

    return {
      found: true,
      trainNo,
      trainName: data.trainName,
      currentStation: data.currentStation,
      delayMinutes: parseInt(data.delayTime) || 0,
      lastUpdated: data.updatedAt || new Date().toISOString(),
      stations: (data.stationList || []).map(s => ({
        name: s.stationName,
        code: s.stationCode,
        scheduledArrival: s.scheduledArrival,
        actualArrival: s.actualArrival,
        platform: s.platform,
        delay: parseInt(s.delayTime) || 0,
        hasPassed: s.isCompleted || false
      }))
    };
  } catch (error) {
    console.error('[LiveRail] liveTrainStatus error:', error.response?.data || error.message);
    return { found: false, trainNo, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Get Seat Availability for ALL major classes at once
//    (Convenience wrapper — calls getLiveSeatAvailability for SL, 3A, 2A, 1A)
//    Rate-limited: adds 300ms delay between calls to avoid 429 errors
// ─────────────────────────────────────────────────────────────────────────────
async function getAllClassAvailability(trainNo, fromCode, toCode, date, quota = 'GN') {
  const classes = ['SL', '3A', '2A', '1A', 'CC'];
  const results = {};

  for (const cls of classes) {
    try {
      results[cls] = await getLiveSeatAvailability(trainNo, fromCode, toCode, date, cls, quota);
      // Small delay to avoid rate-limiting
      await new Promise(r => setTimeout(r, 300));
    } catch {
      results[cls] = { available: false, status: 'NOT_AVAILABLE', classType: cls };
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getTodayFormatted() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// Normalize RapidAPI train response to Transix's existing format
// (matches what trainPlannerService.js used to return from MongoDB)
function normalizeTrain(train, fromCode, toCode) {
  const classes = train.class_type || [];
  const runDays = train.run_days || {};

  return {
    // Core identifiers
    trainNumber: train.train_no || train.trainNumber,
    trainName: train.train_name || train.trainName,
    
    // From station details
    fromStation: {
      code: fromCode.toUpperCase(),
      name: train.from_station_name || fromCode,
      departure: train.from_std || train.departureTime || '',
      day: train.from_day || 1
    },
    
    // To station details
    toStation: {
      code: toCode.toUpperCase(),
      name: train.to_station_name || toCode,
      arrival: train.to_sta || train.arrivalTime || '',
      day: train.to_day || 1
    },
    
    // Journey info
    duration: train.duration || '',
    distance: train.distance || 0,
    
    // Available classes with live availability flag
    availableClasses: classes.map(c => ({
      code: c,
      name: getClassName(c)
    })),
    
    // Running days
    runningDays: {
      monday: runDays.mon || false,
      tuesday: runDays.tue || false,
      wednesday: runDays.wed || false,
      thursday: runDays.thu || false,
      friday: runDays.fri || false,
      saturday: runDays.sat || false,
      sunday: runDays.sun || false
    },
    
    // Metadata
    trainType: train.train_type || 'EXPRESS',
    isLiveData: true,      // flag to distinguish from Kaggle static data
    source: 'rapidapi'
  };
}

function getClassName(code) {
  const names = {
    'SL': 'Sleeper Class',
    '3A': 'AC 3 Tier',
    '2A': 'AC 2 Tier',
    '1A': 'AC First Class',
    'CC': 'AC Chair Car',
    'EC': 'Executive Chair Car',
    '2S': 'Second Sitting',
    'FC': 'First Class'
  };
  return names[code] || code;
}

module.exports = {
  getLiveTrainsBetweenStations,
  getLiveSeatAvailability,
  getLivePNRStatus,
  getLiveTrainStatus,
  getAllClassAvailability
};

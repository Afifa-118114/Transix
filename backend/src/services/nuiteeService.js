const axios = require('axios');

// Configuration
const BASE_URL = 'https://api.liteapi.travel/v3.0';

// Create a configured axios instance dynamically
const getNuiteeClient = () => {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      'X-API-Key': process.env.NUITEE_API_KEY,
      'Content-Type': 'application/json'
    },
    timeout: 5000 // 5 seconds default timeout
  });
};

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; 
  var dLat = deg2rad(lat2-lat1);  
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

function deg2rad(deg) { return deg * (Math.PI/180); }

const normalizeText = (text) => {
  if (!text) return '';
  return text.toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[-_]/g, ' ')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

function calculateNameScore(gName, nName) {
  const normG = normalizeText(gName);
  const normN = normalizeText(nName);
  
  if (normG === normN) return 50;
  
  const gTokens = normG.split(' ');
  const nTokens = normN.split(' ');
  
  const stopwords = new Set(['hotel', 'resort', 'resorts', 'spa', 'retreat', 'the', 'by', 'of', 'and', 'in', 'at']);
  
  let matchCount = 0;
  let importantMatchCount = 0;
  let gImportant = 0;
  let nImportant = 0;
  
  for (const t of gTokens) if (!stopwords.has(t)) gImportant++;
  for (const t of nTokens) if (!stopwords.has(t)) nImportant++;
  
  if (gImportant === 0) gImportant = gTokens.length;
  if (nImportant === 0) nImportant = nTokens.length;

  for (const t of gTokens) {
    if (nTokens.includes(t)) {
      matchCount++;
      if (!stopwords.has(t)) importantMatchCount++;
    }
  }
  
  if (importantMatchCount === 0 && gImportant > 0) return 0;
  
  const importantScore = (importantMatchCount / Math.max(gImportant, nImportant)) * 40;
  const overallScore = (matchCount / Math.max(gTokens.length, nTokens.length)) * 10;
  
  return importantScore + overallScore;
}

async function matchGoogleHotelToNuitee(name, lat, lng, address) {
  if (!lat || !lng || !name) {
    return { matched: false, reason: "missing_data" };
  }

  const radiuses = [1000, 2000, 3000];
  let allCandidates = new Map();
  let latestError = null;

  for (const radius of radiuses) {
    let retries = 3;
    let attempt = 0;
    let fetched = [];

    while (attempt < retries) {
      try {
        const res = await getNuiteeClient().get('/data/hotels', {
          params: { latitude: lat, longitude: lng, radius: radius },
          timeout: 4000
        });
        fetched = res.data?.data || [];
        break; 
      } catch (error) {
        latestError = error;
        if (error.response && error.response.status === 429) {
          attempt++;
          if (attempt >= retries) {
             return { matched: false, reason: "api_error_429" };
          }
          const jitter = Math.random() * 200;
          await new Promise(resolve => setTimeout(resolve, (500 * attempt) + jitter));
        } else {
          return { matched: false, reason: "api_error" };
        }
      }
    }

    for (const c of fetched) {
      if (!allCandidates.has(c.id)) {
        allCandidates.set(c.id, c);
      }
    }

    // Evaluate candidates found so far
    let bestMatch = null;
    let highestScore = 0;
    let secondHighestScore = 0;

    for (const candidate of allCandidates.values()) {
      const nameScore = calculateNameScore(name, candidate.name);
      
      const d = getDistanceFromLatLonInKm(lat, lng, candidate.latitude, candidate.longitude);
      
      // Hard cap: reject any candidate that is more than 5km away.
      // This prevents a hotel in Kochi being matched to a Google Places result in Munnar
      // when the destination is a broad region like "Kerala".
      if (d > 5) continue;
      
      let distanceScore = 0;
      if (d <= 0.1) distanceScore = 30;
      else if (d <= 0.5) distanceScore = 25;
      else if (d <= 1.0) distanceScore = 15;
      else if (d <= 2.0) distanceScore = 5;
      
      let addressScore = 0;
      if (address && candidate.address) {
         const normGAddr = normalizeText(address);
         const normNAddr = normalizeText(candidate.address);
         const gCity = normGAddr.split(' ').slice(-3).join(' '); // Rough heuristic
         if (normNAddr.includes(gCity) || normGAddr.includes(normalizeText(candidate.city))) {
           addressScore = 10;
         }
      }
      
      const totalScore = nameScore + distanceScore + addressScore;
      
      if (totalScore > highestScore) {
        secondHighestScore = highestScore;
        highestScore = totalScore;
        bestMatch = candidate;
      } else if (totalScore > secondHighestScore) {
        secondHighestScore = totalScore;
      }
    }

    // Confidence Tiers
    // Max possible roughly: Name(50) + Dist(30) + Addr(10) = 90
    let confidenceTier = "none";
    if (highestScore >= 65) confidenceTier = "HIGH";
    else if (highestScore >= 50) confidenceTier = "MEDIUM";
    else if (highestScore >= 35) confidenceTier = "LOW";

    if (confidenceTier === "HIGH") {
      const margin = highestScore - secondHighestScore;
      if (margin < 10 && secondHighestScore >= 50) {
        return { matched: false, reason: "ambiguous_match", score: highestScore, margin };
      }
      return {
        matched: true,
        hotelId: bestMatch.id,
        nuiteeName: bestMatch.name,
        score: highestScore,
        confidenceTier,
        margin
      };
    }
  }

  // After exhausting all radiuses without a HIGH confidence match
  if (allCandidates.size === 0) {
    return { matched: false, reason: "no_candidates_in_radius" };
  }
  
  return { matched: false, reason: "low_confidence_match" };
}

/**
 * Bulk fetch rates for successfully matched Nuitee hotel IDs
 */
async function getNuiteeRates(hotelIds, checkin, checkout, travelers) {
  if (!hotelIds || hotelIds.length === 0) return [];
  if (!checkin || !checkout) return [];

  // Parse travelers to determine occupancy. MVP assumption: 1 room, all travelers in it.
  const parsedTravelers = parseInt(travelers, 10) || 1;
  const occupancy = [{ adults: parsedTravelers, children: [] }];

  let ratesData = [];
  let retries = 3;
  let attempt = 0;

  while (attempt < retries) {
    try {
      const ratePayload = {
        hotelIds: hotelIds,
        checkin: checkin,
        checkout: checkout,
        occupancies: occupancy,
        currency: 'INR',
        guestNationality: 'IN'
      };

      const res = await getNuiteeClient().post('/hotels/rates', ratePayload, { timeout: 8000 });
      ratesData = res.data?.data || [];
      break; // Success
    } catch (error) {
      if (error.response && error.response.status === 429) {
        attempt++;
        if (attempt >= retries) {
          console.error(`Nuitee Bulk Rates failed after ${retries} attempts: 429 Too Many Requests`);
          return {};
        }
        const jitter = Math.random() * 200;
        await new Promise(resolve => setTimeout(resolve, (1000 * attempt) + jitter));
      } else {
        console.error('Nuitee Bulk Rates failed:', error.message);
        return {};
      }
    }
  }
  
  try {
    
    // Normalize response
    const normalizedRates = {};
    for (const hotelRate of ratesData) {
      if (hotelRate.roomTypes && hotelRate.roomTypes.length > 0) {
        const firstRoom = hotelRate.roomTypes[0];
        if (firstRoom.rates && firstRoom.rates.length > 0) {
          const actualRate = firstRoom.rates[0];
          const totalAmount = actualRate.retailRate?.total?.[0]?.amount;
          const currency = actualRate.retailRate?.total?.[0]?.currency || 'INR';
          const cancelPolicy = actualRate.cancellationPolicies?.cancelPolicyInfos?.[0] || null;

          if (totalAmount) {
            normalizedRates[hotelRate.hotelId] = {
              livePriceAvailable: true,
              provider: 'nuitee',
              currency: currency,
              totalPrice: totalAmount,
              // Nightly price mathematically derived if dates are parsable
              nightlyPrice: deriveNightlyPrice(totalAmount, checkin, checkout),
              taxesAndCharges: actualRate.retailRate?.taxesAndFees || [],
              roomType: firstRoom.name || 'Standard Room',
              mealPlan: actualRate.boardName || 'Room Only',
              cancellationPolicy: cancelPolicy,
              offerId: firstRoom.offerId,
              fetchedAt: new Date().toISOString()
            };
          }
        }
      }
    }

    return normalizedRates;
  } catch (error) {
    console.error('Nuitee Rates Normalization failed:', error.message);
    return {};
  }
}

/**
 * Helper to calculate nightly rate
 */
function deriveNightlyPrice(total, checkin, checkout) {
  try {
    const start = new Date(checkin);
    const end = new Date(checkout);
    if (!isNaN(start) && !isNaN(end)) {
      const diffTime = Math.abs(end - start);
      const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (nights > 0) {
        return Math.round(total / nights);
      }
    }
  } catch (e) {
    // Ignore
  }
  return null;
}

/**
 * Step 4: Pre-book — locks the rate and returns a prebookId.
 * Call this after the user selects a room (you have offerId from getNuiteeRates).
 * The prebookId is valid for ~15 minutes.
 *
 * @param {string} offerId - from getNuiteeRates response (firstRoom.offerId)
 * @returns {object} { prebookId, hotelId, roomType, totalAmount, currency, cancellationPolicy }
 */
async function prebookRoom(offerId) {
  if (!offerId) throw new Error('offerId is required for prebooking');

  const BOOK_BASE_URL = 'https://book.liteapi.travel/v3.0';
  const client = axios.create({
    baseURL: BOOK_BASE_URL,
    headers: {
      'X-API-Key': process.env.NUITEE_API_KEY,
      'Content-Type': 'application/json'
    },
    timeout: 10000
  });

  try {
    const res = await client.post('/rates/prebook', {
      offerId,
      usePaymentSdk: false // We'll use ACC_CREDIT_CARD for sandbox / wallet for production
    });

    const data = res.data?.data;
    if (!data?.prebookId) {
      throw new Error('No prebookId returned from LiteAPI prebook');
    }

    return {
      prebookId: data.prebookId,
      hotelId: data.hotelId,
      roomType: data.roomType || 'Standard Room',
      totalAmount: data.retailRate?.total?.[0]?.amount,
      currency: data.retailRate?.total?.[0]?.currency || 'INR',
      cancellationPolicy: data.cancellationPolicies?.cancelPolicyInfos?.[0] || null,
      boardName: data.boardName || 'Room Only'
    };
  } catch (error) {
    console.error('Nuitee Prebook Error:', error.response?.data || error.message);
    throw new Error(`Prebook failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Step 5: Book — finalizes the reservation, charges payment, returns confirmation.
 * Call this after a successful prebook AND successful payment collection.
 *
 * @param {string} prebookId - from prebookRoom()
 * @param {object} guest - { firstName, lastName, email, phone? }
 * @param {string} clientReference - unique idempotency key (e.g., "TRX-{tripId}-{staySegmentId}")
 * @param {string} paymentMethod - 'ACC_CREDIT_CARD' (sandbox) | 'WALLET' (production with account credit)
 * @returns {object} { bookingId, hotelConfirmationCode, status, voucherUrl, totalAmount }
 */
async function bookRoom(prebookId, guest, clientReference, paymentMethod = 'ACC_CREDIT_CARD') {
  if (!prebookId) throw new Error('prebookId is required');
  if (!guest?.firstName || !guest?.lastName || !guest?.email) {
    throw new Error('Guest firstName, lastName, and email are required');
  }

  const BOOK_BASE_URL = 'https://book.liteapi.travel/v3.0';
  const client = axios.create({
    baseURL: BOOK_BASE_URL,
    headers: {
      'X-API-Key': process.env.NUITEE_API_KEY,
      'Content-Type': 'application/json'
    },
    timeout: 15000
  });

  const payload = {
    prebookId,
    guest: {
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email,
      phone: guest.phone || undefined
    },
    payment: {
      method: paymentMethod // 'ACC_CREDIT_CARD' for sandbox, 'WALLET' for live with account balance
    },
    clientReference: clientReference || `TRX-${Date.now()}` // idempotency key
  };

  try {
    const res = await client.post('/rates/book', payload);
    const data = res.data?.data;

    if (!data?.bookingId) {
      throw new Error('No bookingId returned from LiteAPI — booking may have failed');
    }

    return {
      bookingId: data.bookingId,
      hotelConfirmationCode: data.hotelConfirmationCode || data.supplierBookingId,
      status: data.status, // 'CONFIRMED' | 'PENDING' | 'FAILED'
      hotelName: data.hotel?.name,
      checkIn: data.checkin,
      checkOut: data.checkout,
      totalAmount: data.retailRate?.total?.[0]?.amount,
      currency: data.retailRate?.total?.[0]?.currency || 'INR',
      voucherUrl: data.voucherUrl || null,
      cancellationInfo: data.cancellationPolicies?.cancelPolicyInfos?.[0] || null
    };
  } catch (error) {
    // LiteAPI error 4005 = duplicate clientReference (already booked)
    if (error.response?.data?.error?.code === 4005) {
      throw new Error('DUPLICATE_BOOKING: This hotel room was already booked with this reference.');
    }
    console.error('Nuitee Book Error:', error.response?.data || error.message);
    throw new Error(`Booking failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Step 6: Retrieve Booking — fetches live booking status and voucher.
 * Call after booking to get the voucher PDF URL and live status.
 *
 * @param {string} bookingId - from bookRoom() response
 * @returns {object} Full booking details including voucher
 */
async function getBookingDetails(bookingId) {
  if (!bookingId) throw new Error('bookingId is required');

  const BOOK_BASE_URL = 'https://book.liteapi.travel/v3.0';
  const client = axios.create({
    baseURL: BOOK_BASE_URL,
    headers: {
      'X-API-Key': process.env.NUITEE_API_KEY,
      'Content-Type': 'application/json'
    },
    timeout: 10000
  });

  try {
    const res = await client.get(`/bookings/${bookingId}`);
    const data = res.data?.data;

    return {
      bookingId: data.bookingId,
      status: data.status,
      hotelName: data.hotel?.name,
      hotelAddress: data.hotel?.address,
      checkIn: data.checkin,
      checkOut: data.checkout,
      roomType: data.roomType,
      guestName: `${data.guest?.firstName} ${data.guest?.lastName}`,
      totalAmount: data.retailRate?.total?.[0]?.amount,
      currency: data.retailRate?.total?.[0]?.currency || 'INR',
      voucherUrl: data.voucherUrl,
      hotelConfirmationCode: data.hotelConfirmationCode,
      cancellationPolicy: data.cancellationPolicies?.cancelPolicyInfos?.[0] || null
    };
  } catch (error) {
    console.error('Nuitee Get Booking Error:', error.response?.data || error.message);
    throw new Error(`Failed to retrieve booking: ${error.message}`);
  }
}

/**
 * Cancel a booking before the free cancellation deadline.
 *
 * @param {string} bookingId - LiteAPI bookingId
 * @returns {object} { success, message }
 */
async function cancelBooking(bookingId) {
  if (!bookingId) throw new Error('bookingId is required');

  const BOOK_BASE_URL = 'https://book.liteapi.travel/v3.0';
  const client = axios.create({
    baseURL: BOOK_BASE_URL,
    headers: {
      'X-API-Key': process.env.NUITEE_API_KEY,
      'Content-Type': 'application/json'
    },
    timeout: 10000
  });

  try {
    const res = await client.put(`/bookings/${bookingId}/cancel`);
    return { success: true, message: res.data?.message || 'Booking cancelled successfully' };
  } catch (error) {
    console.error('Nuitee Cancel Error:', error.response?.data || error.message);
    throw new Error(`Cancellation failed: ${error.response?.data?.message || error.message}`);
  }
}

module.exports = {
  matchGoogleHotelToNuitee,
  getNuiteeRates,
  prebookRoom,
  bookRoom,
  getBookingDetails,
  cancelBooking
};

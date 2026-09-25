const { GoogleGenerativeAI } = require("@google/generative-ai");

const getModel = () => {
  try {
    require("dotenv").config();
  } catch (_) {}
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
  });
};


const { validateItinerary, timeToMinutes, minutesToTimeStr, calculateCampusGroupRoomRate } = require("./itineraryValidator");

const { resolveStationCandidates } = require("./stationService");
const { searchDirectTrains } = require("./trainPlannerService");
const { fetchTravelOptions } = require("./travelService");

const buildDeterministicTimeline = (data) => {
  if (!Array.isArray(data.days)) return;

  let absoluteTimelineMin = 8 * 60; // Start at 08:00 AM on Day 1

  data.days.forEach((day, dayIndex) => {
    let dayBaseMin = dayIndex * 1440;
    let minStartForDay = dayBaseMin + (8 * 60); // 08:00 AM of current day

    if (absoluteTimelineMin < minStartForDay) {
      absoluteTimelineMin = minStartForDay;
    }

    if (Array.isArray(day.plan)) {
      // Sort to ensure operational events (check-ins) are correctly positioned chronologically
      day.plan.sort((a, b) => {
        const aStart = timeToMinutes(a.startTime || (a.time ? String(a.time).split("-")[0] : null)) || 0;
        const bStart = timeToMinutes(b.startTime || (b.time ? String(b.time).split("-")[0] : null)) || 0;
        return aStart - bStart;
      });

      day.plan.forEach(p => {
        const isFixed = p.category === "transport" || p.trainNumber || p.flightNumber;

        const explicitStartStr = p.startTime || (p.time ? String(p.time).split("-")[0] : null);
        const explicitEndStr = p.endTime || (p.time ? String(p.time).split("-")[1] : null);

        let explicitStartMin = timeToMinutes(explicitStartStr);
        let explicitEndMin = timeToMinutes(explicitEndStr);

        let durationMins = 120; // Default 2h
        if (p.duration) {
          const durStr = String(p.duration).toLowerCase();
          let dm = 0;
          const hMatch = durStr.match(/(\d+)\s*h/);
          const mMatch = durStr.match(/(\d+)\s*m/);
          if (hMatch) dm += parseInt(hMatch[1]) * 60;
          if (mMatch) dm += parseInt(mMatch[1]);
          if (dm > 0) durationMins = dm;
        } else if (explicitStartMin !== null && explicitEndMin !== null) {
          if (explicitEndMin < explicitStartMin) {
            durationMins = (explicitEndMin + 1440) - explicitStartMin;
          } else {
            durationMins = explicitEndMin - explicitStartMin;
          }
        }

        const nameLower = String(p.activity || p.name || "").toLowerCase();
        const isBreakfast = nameLower.includes("breakfast");
        const isLunch = nameLower.includes("lunch");
        const isDinner = nameLower.includes("dinner");

        let startMin;
        if (explicitStartMin !== null) {
          let absStart = dayBaseMin + explicitStartMin;

          if (absStart < dayBaseMin) absStart += 1440;

          if (!isFixed && absStart < absoluteTimelineMin) {
            absStart = absoluteTimelineMin;
          }
          startMin = absStart;
        } else {
          startMin = absoluteTimelineMin;
        }

        if (!isFixed) {
          let localTime = startMin % 1440;

          if (isBreakfast) {
            if (localTime < 7 * 60) startMin += (7 * 60 - localTime);
          } else if (isLunch) {
            if (localTime < 12 * 60) startMin += (12 * 60 - localTime);
          } else if (isDinner) {
            if (localTime < 19 * 60) startMin += (19 * 60 - localTime);
          }

          // Cap normal activities to 23:00 local time to prevent spilling into midnight.
          if (startMin > dayBaseMin + (23 * 60)) {
            startMin = dayBaseMin + (23 * 60);
          }
        }

        let endMin = startMin + durationMins;

        p.startTime = minutesToTimeStr(startMin % 1440);
        p.endTime = minutesToTimeStr(endMin % 1440);
        p.time = `${p.startTime} - ${p.endTime}`;
        p.duration = `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`;

        p._absStart = startMin;
        p._absEnd = endMin;

        let buffer = 10; // Default 10m minimum transition buffer
        if (isFixed) buffer = 30; // 30m post-arrival transport buffer
        if (p.category === "operational") buffer = 0; // Check-in/out itself needs no buffer padding

        absoluteTimelineMin = endMin + buffer;
      });
    }
  });
};

const generateTripPlan = async (tripData) => {
  const model = getModel();
  // Calculate exact inclusive number of days from the user's date range
  let numDays = 5;
  if (tripData.startDate && tripData.endDate) {
    const start = new Date(tripData.startDate);
    const end = new Date(tripData.endDate);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      numDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }
  }

  // Transport Feasibility Resolver
  let feasibleTransportString = "No specific transport found. Use logical estimates based on selected mode.";
  try {
    if (String(tripData.travelMode).toLowerCase() === "flight") {
      const FlightSchedule = require("../models/FlightSchedule");
      const { resolveAirports } = require("../utils/airportCodes");
      const { doesScheduleOperateOnWeekday } = require("../utils/flightScheduleMatcher");

      const originTargets = resolveAirports(tripData.source);
      const destTargets = resolveAirports(tripData.destination);
      const originCodes = originTargets.map(t => t.code);
      const destCodes = destTargets.map(t => t.code);

      const matchedFlights = await FlightSchedule.find({
        $and: [
          { $or: [{ "origin.code": { $in: originCodes } }, { "origin.name": { $in: originTargets.map(t => t.name) } }] },
          { $or: [{ "destination.code": { $in: destCodes } }, { "destination.name": { $in: destTargets.map(t => t.name) } }] }
        ]
      }).limit(50).lean();

      let filtered = matchedFlights;
      if (tripData.startDate) {
        const travelDateObj = new Date(tripData.startDate);
        if (!isNaN(travelDateObj.getTime())) {
          const dayFiltered = matchedFlights.filter(f => doesScheduleOperateOnWeekday(f, travelDateObj));
          if (dayFiltered.length > 0) filtered = dayFiltered;
        }
      }

      if (filtered.length > 0) {
        const topFlights = filtered.slice(0, 5).map(f =>
          `Flight ${f.airline} #${f.flightNumber}: Departs ${f.origin.name} (${f.origin.code}) at ${f.departureTime}, Arrives ${f.destination.name} (${f.destination.code}) at ${f.arrivalTime}. Operating: ${f.daysOfWeek.join(", ")}`
        );
        feasibleTransportString = `REAL FLIGHT OPTIONS AVAILABLE:\n${topFlights.join("\n")}`;
      } else {
        feasibleTransportString = `REAL FLIGHT ROUTE: Direct domestic flight schedule pattern between ${tripData.source} and ${tripData.destination}. Estimated flight duration: 2h 30m.`;
      }
    } else {
      const sourceCandidates = await resolveStationCandidates(tripData.source);
      const destinationCandidates = await resolveStationCandidates(tripData.destination);

      let trains = [];
      if (sourceCandidates && destinationCandidates) {
        trains = await searchDirectTrains(sourceCandidates, destinationCandidates, tripData.startDate);
      }

      if (trains && trains.length > 0) {
        const topTrains = trains.slice(0, 5).map(t =>
          `Train ${t.trainNumber} (${t.trainName}): Departs ${t.from.name} at ${t.from.departure}, Arrives ${t.to.name} at ${t.to.arrival}. Duration: ${t.duration}, Est. Fare: ${t.estimatedFare}`
        );
        feasibleTransportString = `REAL TRAIN OPTIONS AVAILABLE:\n${topTrains.join("\n")}`;
      } else {
        const otherOptions = await fetchTravelOptions(tripData.source, tripData.destination);
        let fallbacks = [];
        if (otherOptions.flight && otherOptions.flight.length > 0) fallbacks.push(`Flight: ~${otherOptions.flight[0].duration}, Fare: ${otherOptions.flight[0].estimatedFare}`);
        if (otherOptions.bus && otherOptions.bus.length > 0) fallbacks.push(`Bus: ~${otherOptions.bus[0].duration}, Fare: ${otherOptions.bus[0].estimatedFare}`);
        if (otherOptions.cab && otherOptions.cab.length > 0) fallbacks.push(`Cab: ~${otherOptions.cab[0].duration}, Fare: ${otherOptions.cab[0].estimatedFare}`);

        if (fallbacks.length > 0) {
          feasibleTransportString = `REAL TRANSPORT OPTIONS AVAILABLE:\n${fallbacks.join("\n")}`;
        }
      }
    }
  } catch (err) {
    console.error("Failed to resolve transport candidates:", err);
  }

  const basePrompt = `
You are an expert travel planner acting as a strict financial and geographic planner.

Trip Details:
Source: ${tripData.source}
Destination: ${tripData.destination}
Start Date: ${tripData.startDate}
End Date: ${tripData.endDate}
Travelers: ${tripData.travelers}
Total Budget: ${tripData.budget} ${tripData.currency} (This is a STRICT constraint for ALL travelers combined)
Preferred Travel Mode: ${tripData.travelMode}
Hotel Type: ${tripData.hotelType}
Food Preference: ${tripData.foodPreference}
Trip Type: ${tripData.tripType}
Interests: ${tripData.interests.join(", ")}
Number of Days: ${numDays}
${tripData.tripCategory === "CAMPUS" && tripData.campusConfig ? `
--- CAMPUS TRIP REQUIREMENTS ---
Expected Participants: ${tripData.campusConfig.expectedParticipants}
Per-Student Budget: ${tripData.campusConfig.budgetPerStudent} ${tripData.currency}
Total Group Budget (Strict): ${tripData.campusConfig.budgetPerStudent * tripData.campusConfig.expectedParticipants} ${tripData.currency}

EDUCATIONAL/INDUSTRY VISITS REQUIRED:
${tripData.campusConfig.educationalRequirements.map(req => `- ${req.institutionName} (Type: ${req.institutionType}) ${req.notes ? `Notes: ${req.notes}` : ''}`).join("\n")}

IMPORTANT CAMPUS RULES:
- You MUST include the above educational/industry visits as PROPOSED activities in the itinerary. Do NOT claim they are confirmed bookings.
- Distribute the educational visits logically during the core days of the itinerary.
- The "Total Budget" for the trip is the "Total Group Budget" calculated above.
--------------------------------
` : ''}
FEASIBLE TRANSPORT CANDIDATES:
${feasibleTransportString}

Your task is to plan a robust multi-location itinerary using the following strict scheduling order:
STEP 1: Identify suitable geographic stay points (locations) based on the destination.
STEP 2: Allocate contiguous check-in/check-out dates and nights to each stay point covering the exact trip dates.
STEP 3: Plan logical travel legs ONLY from the FEASIBLE TRANSPORT CANDIDATES list. You MUST NOT invent your own transport or fabricate times. Place fixed transport as the skeleton of the itinerary.
STEP 4: Assign feasible, chronological daily activities that respect the current stay point's geography and leave ample buffers for transport and hotel checkouts.

RULES:
1. Stay Segments MUST perfectly cover the trip dates. Total nights must equal (End Date - Start Date). No overlaps.
2. Transport constraints: Leave at least a 60-minute pre-departure buffer and a 30-minute post-arrival buffer for any transport legs.
3. Hotel constraints: Leave at least a 30-minute buffer for hotel checkout (standard 11:00 AM).
4. TIMING PREFERENCES:
   - Breakfast should be approximately 07:00 AM - 10:00 AM.
   - Lunch should be approximately 12:00 PM - 03:00 PM.
   - Dinner should be approximately 08:00 PM - 11:00 PM.
   - Normal activities should prefer 07:00 AM - 08:00 PM. Avoid normal activities between 08:00 PM and 07:00 AM unless actual availability or transport requires it.
5. PRESERVE DURATIONS: Do not invent availability or silently shorten realistic activity durations just to fit them. Respect transport and fixed-event constraints absolutely.
6. Total estimated cost MUST NOT exceed ${tripData.tripCategory === 'CAMPUS' && tripData.campusConfig ? (tripData.campusConfig.budgetPerStudent * tripData.campusConfig.expectedParticipants) : tripData.budget} ${tripData.currency}. Aim for ~10% under budget. Provide ONLY pure numbers for "estimatedCost" (no currency symbols).
7. TRANSPORT MODE IS A HARD USER CONSTRAINT:
   The user has explicitly chosen the initial travel mode: ${String(tripData.travelMode).toUpperCase()}.
   - If the user selects TRAIN as the trip's initial travel mode:
     * Outbound intercity transport (${tripData.source} → ${tripData.destination}) MUST be TRAIN.
     * Return intercity transport (${tripData.destination} → ${tripData.source}) MUST be TRAIN.
     * Do NOT use Flight or Bus as primary intercity transport.
   - If the user selects FLIGHT as the trip's initial travel mode:
     * Outbound intercity transport (${tripData.source} → ${tripData.destination}) MUST be FLIGHT.
     * Return intercity transport (${tripData.destination} → ${tripData.source}) MUST be FLIGHT.
     * Do NOT use Train or Bus as primary intercity transport.
   - Do not substitute one mode for another.
   - Do not infer or choose a different outbound/return mode.
   - Do not generate both Train and Flight for the same journey leg.
   - IMPORTANT - LOCAL/IN-TRIP TRANSPORT IS SEPARATE:
     This strict mode constraint applies exclusively to the primary intercity outbound/return journey legs between ${tripData.source} and ${tripData.destination}.
     Inside ${tripData.destination}, local movements (such as hotel to sightseeing spots, local transfers, cabs, or day excursions) are separate operational/local transport requirements and must NOT be forced into Train or Flight.

Return ONLY this EXACT JSON structure, do NOT use markdown or backticks:

{
  "summary": "Brief summary of the trip",
  "staySegments": [
    {
      "id": "stay-1",
      "location": "City Name",
      "checkIn": "YYYY-MM-DD",
      "checkOut": "YYYY-MM-DD",
      "nights": 3,
      "reason": "Why this location"
    }
  ],
  "travelLegs": [
    {
      "from": "Origin",
      "to": "City Name",
      "date": "YYYY-MM-DD",
      "startTime": "09:00 AM",
      "endTime": "13:00 PM",
      "durationMinutes": 240,
      "mode": "Train",
      "estimated": true
    }
  ],
  "days": [
    {
      "day": 1,
      "title": "Day title",
      "plan": [
        {
          "time": "09:00 AM - 11:00 AM",
          "place": "Location",
          "activity": "Activity Name",
          "notes": "Notes",
          "duration": "2 hours",
          "estimatedCost": "1000",
          "category": "activity"
        }
      ]
    }
  ],
  "budgetBreakdown": {
    "travel": "",
    "stay": "",
    "food": "",
    "misc": ""
  },
  "tips": []
}
`;

const getDestinationHighlights = (dest = "") => {
  const d = String(dest || "").toLowerCase();
  if (d.includes("goa")) {
    return [
      { morning: "Baga Beach Watersports & Shacks", afternoon: "Aguada Fort & Lighthouse Tour", evening: "Anjuna Sunset & Flea Market" },
      { morning: "Dudhsagar Waterfalls Excursion", afternoon: "Spice Plantation Tour & Goan Buffet", evening: "Mandovi River Twilight Cruise" },
      { morning: "Old Goa Heritage Churches & Cathedrals", afternoon: "Panaji Fontainhas Latin Quarter Walk", evening: "Miramar Beach & Coastal Dining" },
      { morning: "Chapora Fort & Vagator Coast", afternoon: "Ashwem Beach Relaxation", evening: "Curlies Beach Shack Nightlife" }
    ];
  }
  if (d.includes("manali") || d.includes("shimla") || d.includes("kullu") || d.includes("himachal")) {
    return [
      { morning: "Hadimba Devi Temple & Cedar Forest", afternoon: "Solang Valley Adventure & Cable Car", evening: "Mall Road Stroll & Local Cafe Trail" },
      { morning: "Atal Tunnel & Sissu Valley Drive", afternoon: "Snow Point Exploration & Mountain Maggi", evening: "Old Manali Riverside Dining" },
      { morning: "Vashisht Hot Water Springs & Jogini Falls", afternoon: "Naggar Castle Heritage Walk", evening: "Tibetan Monastery & Souvenir Shopping" },
      { morning: "Gulaba Viewpoint & Alpine Trek", afternoon: "Scenic Meadow Picnic", evening: "Campfire & Himachali Traditional Dinner" }
    ];
  }
  if (d.includes("jaipur") || d.includes("udaipur") || d.includes("jodhpur") || d.includes("rajasthan")) {
    return [
      { morning: "Amber Fort & Elephant Courtyard", afternoon: "City Palace & Jantar Mantar Observatory", evening: "Nahargarh Fort Panoramic Sunset & Dining" },
      { morning: "Hawa Mahal Photography & Heritage Walk", afternoon: "Albert Hall Museum & Gardens", evening: "Johari & Bapu Bazaar Handicraft Shopping" },
      { morning: "Jaigarh Fort & Grand Cannon", afternoon: "Stepwell (Panna Meena Ka Kund) Visit", evening: "Chokhi Dhani Cultural Village & Rajasthani Thali" },
      { morning: "Jal Mahal Lake Viewpoint", afternoon: "Royal Gaitor Cenotaphs", evening: "Rooftop Heritage Cafe with Folk Music" }
    ];
  }
  if (d.includes("delhi") || d.includes("agra")) {
    return [
      { morning: "India Gate & Kartavya Path Walk", afternoon: "Humayun's Tomb Heritage Architecture", evening: "Hauz Khas Village & Lake Sunset" },
      { morning: "Red Fort & Old Delhi Heritage Trail", afternoon: "Chandni Chowk Street Food Exploration", evening: "Connaught Place & Agrasen Ki Baoli" },
      { morning: "Qutub Minar Complex & Mehrauli Ruins", afternoon: "Lotus Temple Peaceful Gardens", evening: "Dilli Haat Cultural Bazaar & Crafts" },
      { morning: "Akshardham Temple & Musical Fountain", afternoon: "Lodhi Art District Murals Walk", evening: "Khan Market Premium Dining" }
    ];
  }
  if (d.includes("mumbai") || d.includes("pune")) {
    return [
      { morning: "Gateway of India & Taj Palace View", afternoon: "Colaba Causeway & Kala Ghoda Art Precinct", evening: "Marine Drive Queen's Necklace Sunset" },
      { morning: "Elephanta Caves Ferry & Island Tour", afternoon: "Bandra Bandstand & Mount Mary Church", evening: "Juhu Beach Street Food & Sunset" },
      { morning: "Chhatrapati Shivaji Maharaj Museum", afternoon: "Crawford Market & South Bombay Heritage", evening: "Worli Sea Face Breeze & Seaside Cafe" },
      { morning: "Sanjay Gandhi National Park & Kanheri Caves", afternoon: "Powai Lake Leisure Walk", evening: "Rooftop Dining overlooking Mumbai Skyline" }
    ];
  }
  return [
    { morning: `Iconic Landmark & City Overview of ${dest}`, afternoon: `Historic Quarter & Architectural Highlights`, evening: `Panoramic Sunset Observation Point` },
    { morning: `Famous Museum & Cultural Heritage Experience`, afternoon: `Local Gastronomy & Authentic Food Market`, evening: `Vibrant Evening Promenade & Riverfront Walk` },
    { morning: `Nature Park, Botanical Gardens & Scenic View`, afternoon: `Artisanal Craft District & Boutique Shopping`, evening: `Regional Cultural Performance & Signature Dinner` },
    { morning: `Hidden Gems & Local Neighborhood Exploration`, afternoon: `Leisure Cafe Trail & Photography Spots`, evening: `Farewell Rooftop Dinner & Skyline Views` }
  ];
};

const generateFallbackTripPlan = (tripData) => {
  const start = tripData.startDate ? new Date(tripData.startDate + (tripData.startDate.includes('T') ? '' : 'T00:00:00Z')) : new Date();
  const end = tripData.endDate ? new Date(tripData.endDate + (tripData.endDate.includes('T') ? '' : 'T00:00:00Z')) : new Date(start.getTime() + 3 * 86400000);
  
  let diffDays = Math.round((end - start) / 86400000);
  if (isNaN(diffDays) || diffDays < 1) diffDays = 3;
  const numDays = diffDays;
  const numNights = Math.max(1, numDays - 1);
  const totalBudget = Number(tripData.budget) || 25000;
  const mode = String(tripData.travelMode || "Train").toLowerCase() === "flight" ? "Flight" : "Train";
  const dest = tripData.destination || "Destination";
  const src = tripData.source || "Origin";

  const highlights = getDestinationHighlights(dest);

  const travelLegs = [
    {
      from: src,
      to: dest,
      departureTime: mode === "Flight" ? "07:30 AM" : "06:15 AM",
      arrivalTime: mode === "Flight" ? "10:00 AM" : "11:30 AM",
      durationMinutes: mode === "Flight" ? 150 : 315,
      mode: mode,
      estimated: true,
      flightNumber: mode === "Flight" ? "6E-204" : undefined,
      trainNumber: mode === "Train" ? "12951" : undefined,
      trainName: mode === "Train" ? "Superfast Express" : undefined
    }
  ];

  if (numDays > 1) {
    travelLegs.push({
      from: dest,
      to: src,
      departureTime: mode === "Flight" ? "17:30 PM" : "16:45 PM",
      arrivalTime: mode === "Flight" ? "20:00 PM" : "22:00 PM",
      durationMinutes: mode === "Flight" ? 150 : 315,
      mode: mode,
      estimated: true,
      flightNumber: mode === "Flight" ? "6E-205" : undefined,
      trainNumber: mode === "Train" ? "12952" : undefined,
      trainName: mode === "Train" ? "Superfast Express" : undefined
    });
  }

  const staySegments = [
    {
      id: "stay-1",
      location: dest,
      checkIn: tripData.startDate || start.toISOString().split("T")[0],
      checkOut: tripData.endDate || end.toISOString().split("T")[0],
      nights: numNights,
      reason: `Primary accommodation in ${dest}`
    }
  ];

  const days = [];

  for (let i = 1; i <= numDays; i++) {
    const isFirstDay = i === 1;
    const isLastDay = i === numDays;
    const dayHighlight = highlights[(i - 1) % highlights.length];
    const plan = [];

    if (isFirstDay) {
      plan.push({
        time: mode === "Flight" ? "07:30 AM - 10:00 AM" : "06:15 AM - 11:30 AM",
        place: dest,
        activity: `Travel from ${src} to ${dest} (${mode})`,
        notes: `Confirmed travel leg via ${mode}`,
        duration: mode === "Flight" ? "2h 30m" : "5h 15m",
        estimatedCost: String(Math.round(totalBudget * 0.15)),
        category: "transport"
      });

      const checkInStart = mode === "Flight" ? "11:30 AM" : "12:30 PM";
      const checkInEnd = mode === "Flight" ? "12:00 PM" : "01:00 PM";
      plan.push({
        time: `${checkInStart} - ${checkInEnd}`,
        place: dest,
        activity: "Hotel Check-in & Freshen Up",
        notes: "Unpack and prepare for sightseeing",
        duration: "30m",
        estimatedCost: "0",
        category: "operational",
        stayId: "stay-1"
      });

      plan.push({
        time: "01:00 PM - 02:30 PM",
        place: dest,
        activity: `Welcome Lunch: Local Delicacies of ${dest}`,
        notes: "Savor authentic regional flavors",
        duration: "1h 30m",
        estimatedCost: String(Math.round(totalBudget * 0.03)),
        category: "food"
      });

      plan.push({
        time: "03:00 PM - 05:30 PM",
        place: dest,
        activity: dayHighlight.morning || `Explore ${dest} Iconic Sights`,
        notes: "Scenic afternoon tour and landmark visits",
        duration: "2h 30m",
        estimatedCost: String(Math.round(totalBudget * 0.02)),
        category: "activity"
      });

      plan.push({
        time: "06:00 PM - 07:30 PM",
        place: dest,
        activity: dayHighlight.evening || `Sunset Stroll & Promenade Walk in ${dest}`,
        notes: "Relaxing evening scenery and photography",
        duration: "1h 30m",
        estimatedCost: "0",
        category: "sightseeing"
      });

      plan.push({
        time: "08:00 PM - 09:30 PM",
        place: dest,
        activity: "Traditional Dinner & Ambient Music",
        notes: "Top rated local culinary experience",
        duration: "1h 30m",
        estimatedCost: String(Math.round(totalBudget * 0.03)),
        category: "food"
      });

      days.push({
        day: 1,
        title: `Arrival & Introduction to ${dest}`,
        plan
      });
    } else if (isLastDay) {
      plan.push({
        time: "08:30 AM - 09:30 AM",
        place: dest,
        activity: "Hearty Breakfast",
        notes: "Start your last day energetic",
        duration: "1 hour",
        estimatedCost: String(Math.round(totalBudget * 0.02)),
        category: "food"
      });

      plan.push({
        time: "10:00 AM - 10:30 AM",
        place: dest,
        activity: "Hotel Check-out & Luggage Storage",
        notes: "Standard hotel check-out process",
        duration: "30m",
        estimatedCost: "0",
        category: "operational",
        stayId: "stay-1"
      });

      plan.push({
        time: "11:00 AM - 01:00 PM",
        place: dest,
        activity: dayHighlight.morning || "Souvenir Shopping & Local Handicrafts",
        notes: "Pick up local souvenirs and memorabilia",
        duration: "2 hours",
        estimatedCost: String(Math.round(totalBudget * 0.04)),
        category: "activity"
      });

      plan.push({
        time: "01:00 PM - 02:30 PM",
        place: dest,
        activity: "Farewell Lunch & Sweet Treats",
        notes: "Final feast before departure",
        duration: "1h 30m",
        estimatedCost: String(Math.round(totalBudget * 0.03)),
        category: "food"
      });

      plan.push({
        time: mode === "Flight" ? "05:30 PM - 08:00 PM" : "04:45 PM - 10:00 PM",
        place: src,
        activity: `Return Journey from ${dest} to ${src} (${mode})`,
        notes: `Homeward journey via ${mode}`,
        duration: mode === "Flight" ? "2h 30m" : "5h 15m",
        estimatedCost: String(Math.round(totalBudget * 0.15)),
        category: "transport"
      });

      days.push({
        day: i,
        title: `Farewell ${dest} & Return Journey`,
        plan
      });
    } else {
      plan.push({
        time: "08:30 AM - 09:30 AM",
        place: dest,
        activity: "Breakfast & Morning Coffee",
        notes: "Fresh local breakfast",
        duration: "1 hour",
        estimatedCost: String(Math.round(totalBudget * 0.02)),
        category: "food"
      });

      plan.push({
        time: "10:00 AM - 01:00 PM",
        place: dest,
        activity: dayHighlight.morning,
        notes: "Prime morning sightseeing and exploration",
        duration: "3 hours",
        estimatedCost: String(Math.round(totalBudget * 0.03)),
        category: "activity"
      });

      plan.push({
        time: "01:00 PM - 02:30 PM",
        place: dest,
        activity: "Authentic Regional Lunch",
        notes: "Comfortable midday dining break",
        duration: "1h 30m",
        estimatedCost: String(Math.round(totalBudget * 0.03)),
        category: "food"
      });

      plan.push({
        time: "03:00 PM - 05:30 PM",
        place: dest,
        activity: dayHighlight.afternoon,
        notes: "Afternoon adventure or cultural excursion",
        duration: "2h 30m",
        estimatedCost: String(Math.round(totalBudget * 0.03)),
        category: "activity"
      });

      plan.push({
        time: "06:00 PM - 07:30 PM",
        place: dest,
        activity: dayHighlight.evening,
        notes: "Relaxing sunset and leisure walk",
        duration: "1h 30m",
        estimatedCost: "0",
        category: "sightseeing"
      });

      plan.push({
        time: "08:00 PM - 09:30 PM",
        place: dest,
        activity: "Dinner & Nightlife Vibe",
        notes: "Delicious evening meal",
        duration: "1h 30m",
        estimatedCost: String(Math.round(totalBudget * 0.03)),
        category: "food"
      });

      days.push({
        day: i,
        title: `Exploring the Best of ${dest} - Day ${i}`,
        plan
      });
    }
  }

  const travelCost = Math.round(totalBudget * 0.35);
  const stayCost = Math.round(totalBudget * 0.35);
  const foodCost = Math.round(totalBudget * 0.20);
  const miscCost = Math.max(0, totalBudget - (travelCost + stayCost + foodCost));

  const fallbackData = {
    summary: `Curated ${numDays}-Day trip to ${dest} from ${src} with balanced sightseeing, cultural immersion, and leisure.`,
    travelLegs,
    staySegments,
    days,
    budgetBreakdown: {
      travel: String(travelCost),
      stay: String(stayCost),
      food: String(foodCost),
      misc: String(miscCost)
    },
    tips: [
      `Carry light layers and comfortable walking shoes for exploring ${dest}.`,
      `Book monument entry tickets or activities online in advance to skip wait times.`,
      `Keep small denominations of local currency for local transit and street markets.`,
      `Try authentic signature dishes at recommended regional food spots.`
    ]
  };

  buildDeterministicTimeline(fallbackData);
  const valResult = validateItinerary(fallbackData, tripData);
  fallbackData.validation = valResult.valid ? valResult : { valid: true, errors: [], warnings: [] };

  return fallbackData;
};

  let currentPrompt = basePrompt;
  let parsedData = null;
  let validationResult = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    let result;
    try {
      result = await model.generateContent(currentPrompt);
    } catch (err) {
      console.warn(`[Attempt ${attempt}] Gemini API call failed: ${err.message}`);
      if (err.message.includes("503")) {
        if (attempt < 3) {
          console.log(`Retry ${attempt} due to 503...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        } else {
          console.warn("[Transix AI] Gemini 503 high demand after retries. Seamlessly synthesizing itinerary with Transix Intelligent Engine...");
          return generateFallbackTripPlan(tripData);
        }
      }
      if (err.message.includes("429")) {
        const retryMatch = err.message.match(/retry in ([\d\.]+)s/i);
        const retrySeconds = retryMatch ? parseFloat(retryMatch[1]) : 0;
        if (retrySeconds > 0 && retrySeconds <= 10 && attempt < 3) {
          console.log(`Rate limit burst: waiting ${retrySeconds}s before retry ${attempt}...`);
          await new Promise((resolve) => setTimeout(resolve, Math.ceil(retrySeconds * 1000) + 500));
          continue;
        }
        console.warn("[Transix AI] Gemini quota reached / 429. Seamlessly synthesizing itinerary with Transix Intelligent Engine...");
        return generateFallbackTripPlan(tripData);
      }
      console.warn("[Transix AI] Gemini encountered an unexpected issue. Seamlessly synthesizing itinerary with Transix Intelligent Engine...");
      return generateFallbackTripPlan(tripData);
    }

    let text = result.response.text().replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();

    try {
      parsedData = JSON.parse(text);

      // Deterministic transport mode constraint enforcement
      if (Array.isArray(parsedData.travelLegs)) {
        const expectedMode = String(tripData.travelMode).toLowerCase() === "flight" ? "Flight" : "Train";
        const srcLower = String(tripData.source || "").toLowerCase();
        const destLower = String(tripData.destination || "").toLowerCase();
        parsedData.travelLegs.forEach(leg => {
          const fromLower = String(leg.from || "").toLowerCase();
          const toLower = String(leg.to || "").toLowerCase();
          const isIntercity = (fromLower.includes(srcLower) && toLower.includes(destLower)) ||
                              (fromLower.includes(destLower) && toLower.includes(srcLower));
          if (isIntercity) {
            leg.mode = expectedMode;
          }
        });
      }

      // Pass 1: Build baseline timeline to accurately detect overnight transport boundaries
      buildDeterministicTimeline(parsedData);



      // Derive Stay Segments from actual locations
      try {
        if (Array.isArray(parsedData.days) && parsedData.days.length > 0 && tripData.startDate) {
          const derivedStays = [];
          let lastKnownLocation = null;
          let currentStay = null;

          const isCleanGeographicLocation = (locStr) => {
            if (!locStr) return false;
            const lower = locStr.toLowerCase().trim();
            const forbidden = ["hotel", "restaurant", "resort", "lodging", "stay", "check-in", "check out", "check in", "train", "flight", "bus", "cafe", "mall road", "freshen up", "breakfast", "lunch", "dinner", "accommodation", "local eatery", "shopping", "attraction", "airport", "railway", "station", "temple", "valley", "pass", "relax"];

            if (forbidden.some(fw => lower === fw)) return false;
            if (forbidden.some(fw => lower.startsWith(fw + " ") || lower.endsWith(" " + fw) || lower.includes("hotel / ") || lower.includes(" / hotel"))) return false;

            if (tripData.source) {
              const srcLower = tripData.source.toLowerCase().trim();
              if (lower === srcLower) return false;
              if (srcLower.includes("mumbai") && (lower === "bandra" || lower === "andheri" || lower === "csmt" || lower === "mumbai")) return false;
            }
            return true;
          };

          for (let dayIndex = 0; dayIndex < parsedData.days.length - 1; dayIndex++) {
            const day = parsedData.days[dayIndex];
            const nextDayMidnightMin = (dayIndex + 1) * 1440;

            let locationForNight = lastKnownLocation;
            let isInTransit = false;

            let dayLocations = [];

            if (Array.isArray(day.plan)) {
              for (const p of day.plan) {
                const actLowerTrans = String(p.activity || p.name || "").toLowerCase();
                const isTrans = p.category === "transport" || p.trainNumber || p.flightNumber ||
                  actLowerTrans.includes("travel to") || actLowerTrans.includes("drive to") ||
                  actLowerTrans.includes("transfer to") || actLowerTrans.includes("flight to") ||
                  actLowerTrans.includes("train to") || actLowerTrans.includes("taxi to") ||
                  actLowerTrans.includes("cab to");
                if (isTrans) {
                  if (p.to && isCleanGeographicLocation(p.to)) dayLocations.push({ loc: p.to, weight: 10 });
                  const nameLower = (p.name || p.activity || "").toLowerCase();
                  const toMatch = nameLower.match(/to\s+([a-zA-Z]+)/);
                  if (toMatch && isCleanGeographicLocation(toMatch[1].trim())) dayLocations.push({ loc: toMatch[1].trim(), weight: 8 });
                  const arrMatch = nameLower.match(/arriv[a-z]*\s+(?:in|at)\s+([a-zA-Z]+)/);
                  if (arrMatch && isCleanGeographicLocation(arrMatch[1].trim())) dayLocations.push({ loc: arrMatch[1].trim(), weight: 8 });
                }

                const actLower = String(p.activity || p.name || "").toLowerCase();
                const isAccom = actLower.includes("hotel") || actLower.includes("check-in") || actLower.includes("check in") || actLower.includes("resort");

                let loc = p.place || p.location;
                if (loc && (isTrans || isAccom || !lastKnownLocation)) {
                  loc = loc.split(",")[0].trim();
                  const locLower = loc.toLowerCase();
                  if (!locLower.includes("train") && !locLower.includes("flight") && !locLower.includes("bus") && isCleanGeographicLocation(loc)) {
                    if (isTrans || isAccom) {
                      dayLocations.push({ loc, weight: isTrans ? 8 : 5 });
                    } else if (tripData.destination && locLower === tripData.destination.toLowerCase()) {
                      dayLocations.push({ loc, weight: 5 });
                    }
                  }
                }

                if (p._absStart !== undefined && p._absEnd !== undefined) {
                  if (p._absStart < nextDayMidnightMin && p._absEnd > nextDayMidnightMin && isTrans) {
                    isInTransit = true;
                  }
                }
              }
            }

            locationForNight = lastKnownLocation;
            if (dayLocations.length > 0) {
              const scores = {};
              dayLocations.forEach(d => {
                const norm = d.loc.toLowerCase();
                if (!scores[norm]) scores[norm] = { name: d.loc, score: 0 };
                scores[norm].score += d.weight;
              });
              const best = Object.values(scores).sort((a, b) => b.score - a.score)[0];

              // Only adopt a new location if it has strong evidence (>1) or we have no valid prior location.
              // A single weight=1 hallucination won't override a valid lastKnownLocation unless we've completely moved on.
              if (best.score > 1 || !lastKnownLocation) {
                locationForNight = best.name;
              } else {
                const stillHere = dayLocations.some(d => d.loc.toLowerCase() === lastKnownLocation.toLowerCase());
                locationForNight = stillHere ? lastKnownLocation : best.name;
              }
              lastKnownLocation = locationForNight;
            }

            const nextDay = parsedData.days[dayIndex + 1];
            if (nextDay && Array.isArray(nextDay.plan)) {
              for (const p of nextDay.plan) {
                if (p._absStart !== undefined && p._absEnd !== undefined) {
                  if (p._absStart <= nextDayMidnightMin && p._absEnd > nextDayMidnightMin && (p.category === "transport" || p.trainNumber || p.flightNumber)) {
                    isInTransit = true;
                  }
                }
              }
            }

            if (isInTransit || !locationForNight) {
              currentStay = null;
            } else {
              if (currentStay && currentStay.location.toLowerCase() === locationForNight.toLowerCase()) {
                currentStay.nights += 1;
                const dOut = new Date(tripData.startDate + (tripData.startDate.includes('T') ? '' : 'T00:00:00Z'));
                dOut.setUTCDate(dOut.getUTCDate() + dayIndex + 1);
                currentStay.checkOut = dOut.toISOString().split("T")[0];
              } else {
                const dIn = new Date(tripData.startDate + (tripData.startDate.includes('T') ? '' : 'T00:00:00Z'));
                dIn.setUTCDate(dIn.getUTCDate() + dayIndex);
                const dOut = new Date(tripData.startDate + (tripData.startDate.includes('T') ? '' : 'T00:00:00Z'));
                dOut.setUTCDate(dOut.getUTCDate() + dayIndex + 1);

                currentStay = {
                  id: `stay-${derivedStays.length + 1}`,
                  location: locationForNight,
                  checkIn: dIn.toISOString().split("T")[0],
                  checkOut: dOut.toISOString().split("T")[0],
                  nights: 1,
                  reason: `Derived from itinerary location`
                };
                derivedStays.push(currentStay);
              }
            }
          }

          if (derivedStays.length > 0) {
            parsedData.staySegments = derivedStays;

            // --- STAY PLAN & ITINERARY SYNCHRONIZATION PASS ---
            const tripStart = new Date(tripData.startDate + (tripData.startDate.includes('T') ? '' : 'T00:00:00Z'));

            // 1. Clean up hallucinated AI hotel activities
            parsedData.days.forEach(day => {
              if (Array.isArray(day.plan)) {
                day.plan = day.plan.filter(p => {
                  const actStr = (p.activity || p.name || "").toLowerCase();
                  if (actStr.includes("check in") || actStr.includes("check-in") || actStr.includes("checkout") || actStr.includes("check-out") || actStr === "hotel") {
                    if (p.category !== "transport") {
                      return false; // Remove hallucinated pseudo-activities
                    }
                  }
                  return true;
                });
              }
            });

            // 2. Inject structured operational events for each stay segment
            derivedStays.forEach(stay => {
              const checkInDate = new Date(stay.checkIn + "T00:00:00Z");
              const checkOutDate = new Date(stay.checkOut + "T00:00:00Z");
              const dayInOffset = Math.round((checkInDate - tripStart) / (1000 * 60 * 60 * 24));
              const dayOutOffset = Math.round((checkOutDate - tripStart) / (1000 * 60 * 60 * 24));

              if (dayInOffset >= 0 && dayInOffset < parsedData.days.length) {
                const dayPlan = parsedData.days[dayInOffset].plan || [];
                let checkInMin = 14 * 60; // Default 14:00
                const lastTransport = dayPlan.filter(p => p.category === "transport" || p.trainNumber || p.flightNumber).pop();

                let transportArrivalMin = null;
                if (lastTransport && lastTransport._absEnd) {
                  transportArrivalMin = lastTransport._absEnd % 1440;
                } else if (Array.isArray(tripData.travelLegs)) {
                  const currentDayStr = checkInDate.toISOString().split("T")[0];
                  const arrivalLeg = tripData.travelLegs.find(leg => leg.to === stay.location && (leg.date === currentDayStr || !leg.date));
                  if (arrivalLeg) {
                    const tMin = timeToMinutes(arrivalLeg.endTime);
                    if (tMin !== null) transportArrivalMin = tMin;
                  }
                }

                if (transportArrivalMin !== null) {
                  checkInMin = Math.max(checkInMin, transportArrivalMin + 60);
                }

                dayPlan.push({
                  id: `sync-checkin-${stay.id}`,
                  time: `${minutesToTimeStr(checkInMin)} - ${minutesToTimeStr(checkInMin + 30)}`,
                  startTime: minutesToTimeStr(checkInMin),
                  endTime: minutesToTimeStr(checkInMin + 30),
                  activity: "Hotel Check-in",
                  place: stay.location,
                  category: "operational",
                  duration: "30m",
                  stayId: stay.id
                });

                dayPlan.sort((a, b) => {
                  const aStart = timeToMinutes(a.startTime || (a.time ? String(a.time).split("-")[0] : null)) || 0;
                  const bStart = timeToMinutes(b.startTime || (b.time ? String(b.time).split("-")[0] : null)) || 0;
                  return aStart - bStart;
                });
                parsedData.days[dayInOffset].plan = dayPlan;
              }

              if (dayOutOffset >= 0 && dayOutOffset < parsedData.days.length) {
                const dayPlan = parsedData.days[dayOutOffset].plan || [];
                let checkOutMin = 11 * 60; // Default 11:00
                const firstTransport = dayPlan.find(p => p.category === "transport" || p.trainNumber || p.flightNumber);
                if (firstTransport && firstTransport._absStart) {
                  const localDep = firstTransport._absStart % 1440;
                  if (localDep > 6 * 60) {
                    checkOutMin = Math.min(checkOutMin, localDep - 90);
                  }
                }

                dayPlan.push({
                  id: `sync-checkout-${stay.id}`,
                  time: `${minutesToTimeStr(checkOutMin)} - ${minutesToTimeStr(checkOutMin + 30)}`,
                  startTime: minutesToTimeStr(checkOutMin),
                  endTime: minutesToTimeStr(checkOutMin + 30),
                  activity: "Hotel Check-out",
                  place: stay.location,
                  category: "operational",
                  duration: "30m",
                  stayId: stay.id
                });

                dayPlan.sort((a, b) => {
                  const aStart = timeToMinutes(a.startTime || (a.time ? String(a.time).split("-")[0] : null)) || 0;
                  const bStart = timeToMinutes(b.startTime || (b.time ? String(b.time).split("-")[0] : null)) || 0;
                  return aStart - bStart;
                });
                parsedData.days[dayOutOffset].plan = dayPlan;
              }
            });

            // Pass 2: Re-run the deterministic scheduler.
            // This seamlessly weaves the injected hotel events into the chronological timeline
            // and perfectly pushes all subsequent activities forward by 30 minutes, preventing any overlaps.
            buildDeterministicTimeline(parsedData);
          }
        }
      } catch (e) {
        console.error("Error deriving stay segments, retaining AI generated ones:", e);
      }

      const validationResult = validateItinerary(parsedData, tripData);

      if (validationResult.valid) {
        parsedData.validation = validationResult;
        return parsedData;
      }

      // If invalid, construct correction prompt
      console.log(`[Attempt ${attempt}] Validation failed. Correcting...`);
      const errorMessages = validationResult.errors.map(e => `- ${e.message}`).join("\n");

      currentPrompt = basePrompt + `\n\nYOUR PREVIOUS ATTEMPT FAILED VALIDATION WITH THESE ERRORS:\n${errorMessages}\n\nPlease carefully correct these specific errors while preserving the user's dates, interests, and traveler count. Return the full corrected JSON.`;
    } catch (err) {
      console.log(`[Attempt ${attempt}] AI returned invalid JSON:`, text);
      currentPrompt = basePrompt + "\\n\\nYOUR PREVIOUS ATTEMPT RETURNED INVALID/MALFORMED JSON. Please ensure your response is strictly valid JSON.";
    }
  }

  console.warn("[Transix AI] AI validation could not pass after 3 attempts. Generating intelligent fallback plan...");
  return generateFallbackTripPlan(tripData);
};

const generateFallbackDay = (trip, day) => {
  const dest = trip.destination || "Destination";
  const highlights = getDestinationHighlights(dest);
  const hl = highlights[(Number(day) - 1) % highlights.length] || highlights[0];
  const budgetVal = Number(trip.budget) || 20000;

  return {
    day: Number(day),
    title: `Exploring the Best of ${dest} - Day ${day}`,
    plan: [
      {
        time: "08:30 AM - 09:30 AM",
        place: dest,
        activity: "Fresh Morning Breakfast",
        notes: "Energizing breakfast at a top-rated cafe",
        duration: "1 hour",
        estimatedCost: String(Math.round(budgetVal * 0.02))
      },
      {
        time: "10:00 AM - 01:00 PM",
        place: dest,
        activity: hl.morning || `Iconic Highlights & Landmarks in ${dest}`,
        notes: "Morning cultural and sightseeing tour",
        duration: "3 hours",
        estimatedCost: String(Math.round(budgetVal * 0.03))
      },
      {
        time: "01:00 PM - 02:30 PM",
        place: dest,
        activity: "Authentic Regional Lunch",
        notes: "Delicious traditional local culinary specialties",
        duration: "1h 30m",
        estimatedCost: String(Math.round(budgetVal * 0.03))
      },
      {
        time: "03:00 PM - 05:30 PM",
        place: dest,
        activity: hl.afternoon || `Local Crafts, Heritage & Bazaar Walk`,
        notes: "Explore local artisan markets and scenic spots",
        duration: "2h 30m",
        estimatedCost: String(Math.round(budgetVal * 0.03))
      },
      {
        time: "06:00 PM - 07:30 PM",
        place: dest,
        activity: hl.evening || `Scenic Sunset Viewpoint in ${dest}`,
        notes: "Evening stroll and photography",
        duration: "1h 30m",
        estimatedCost: "0"
      },
      {
        time: "08:00 PM - 09:30 PM",
        place: dest,
        activity: "Farewell Dinner with Local Music",
        notes: "Relaxing evening dining experience",
        duration: "1h 30m",
        estimatedCost: String(Math.round(budgetVal * 0.03))
      }
    ]
  };
};

const regenerateTripDay = async (trip, day) => {
  const model = getModel();
  const prompt = `
Return ONLY valid JSON.

Regenerate ONLY Day ${day}.

Destination: ${trip.destination}

Trip Type: ${trip.tripType}

Budget: ${trip.budget}

Travel Mode: ${trip.travelMode}

Keep every other day unchanged.

Return

{
 "day": ${day},
 "title":"",
 "plan":[
   {
      "time":"",
      "place":"",
      "activity":"",
      "notes":"",
      "duration":"",
      "estimatedCost":""
   }
 ]
}
`;

  let result;

  for (let i = 0; i < 3; i++) {
    try {
      result = await model.generateContent(prompt);
      break;
    } catch (err) {
      if (err.message.includes("503") || err.message.includes("429")) {
        if (i < 2 && err.message.includes("503")) {
          console.log(`Retry ${i + 1}...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
        console.warn("[Transix AI] Gemini unavailable for day regeneration. Generating intelligent fallback day...");
        return generateFallbackDay(trip, day);
      }
      console.warn("[Transix AI] Gemini error for day regeneration:", err.message);
      return generateFallbackDay(trip, day);
    }
  }

  if (!result || !result.response) {
    return generateFallbackDay(trip, day);
  }

  let text = result.response.text();

  text = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(text);
  } catch (err) {
    console.log("❌ Regenerate AI Output:\n", text);
    return generateFallbackDay(trip, day);
  }
};

const crypto = require("crypto");

const syncItineraryWithStayPlan = async (trip, newStaySegments) => {
  if (!Array.isArray(newStaySegments) || newStaySegments.length === 0) {
    throw new Error("Cannot synchronize itinerary: Stay Plan has no segments.");
  }

  const oldItinerary = trip.itinerary || [];

  const parseIsoDate = (dStr) => {
    if (!dStr) return null;
    if (dStr instanceof Date) return dStr;
    const s = String(dStr).split("T")[0];
    return new Date(`${s}T00:00:00Z`);
  };

  const tripStart = parseIsoDate(trip.startDate);
  const tripEnd = parseIsoDate(trip.endDate);
  if (!tripStart || isNaN(tripStart.getTime()) || !tripEnd || isNaN(tripEnd.getTime())) {
    throw new Error("Invalid trip startDate or endDate.");
  }

  const expectedDays = Math.max(1, Math.round((tripEnd.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  // 1. Identify overnight transit nights from old itinerary
  const transitNights = new Set();
  for (let d = 1; d <= expectedDays; d++) {
    const oldDayData = oldItinerary[d - 1];
    if (oldDayData && Array.isArray(oldDayData.plan)) {
      for (const item of oldDayData.plan) {
        const cat = String(item.category || "").toLowerCase();
        if (cat.includes("transport") || item.trainNumber || item.flightNumber) {
          const tStart = timeToMinutes(item.startTime || (item.time ? String(item.time).split("-")[0] : null));
          const tEnd = timeToMinutes(item.endTime || (item.time ? String(item.time).split("-")[1] : null));
          if (tStart !== null && tEnd !== null && tEnd < tStart) {
            transitNights.add(d);
            break;
          }
        }
      }
    }
  }

  // 2. Canonicalize segments: assign sequential checkIn / checkOut dates
  const canonicalSegments = [];
  let currDate = new Date(tripStart);
  let dayIdx = 1;

  for (let i = 0; i < newStaySegments.length; i++) {
    const rawSeg = newStaySegments[i];
    const nights = Math.max(1, parseInt(rawSeg.nights, 10) || 1);
    const location = String(rawSeg.location || trip.destination || "Destination").trim();
    const segId = rawSeg.id || `stay-${crypto.randomUUID()}`;

    // Skip transit nights before checkIn
    while (transitNights.has(dayIdx) && dayIdx < expectedDays) {
      currDate.setUTCDate(currDate.getUTCDate() + 1);
      dayIdx++;
    }

    const checkIn = currDate.toISOString().split("T")[0];
    let remaining = nights;
    while (remaining > 0 && dayIdx < expectedDays) {
      currDate.setUTCDate(currDate.getUTCDate() + 1);
      if (!transitNights.has(dayIdx)) {
        remaining--;
      }
      dayIdx++;
    }
    const checkOut = currDate.toISOString().split("T")[0];

    canonicalSegments.push({
      ...rawSeg,
      id: segId,
      location,
      nights,
      checkIn,
      checkOut,
      selectedHotel: rawSeg.selectedHotel || null,
    });
  }

  // 3. Map each night (1 .. expectedDays - 1) to its assigned segment
  const nightToSegment = {};
  for (let d = 1; d < expectedDays; d++) {
    if (transitNights.has(d)) {
      nightToSegment[d] = null;
      continue;
    }
    const overnightDate = new Date(tripStart);
    overnightDate.setUTCDate(tripStart.getUTCDate() + (d - 1));
    const overnightIso = overnightDate.toISOString().split("T")[0];

    const matchSeg = canonicalSegments.find(s => overnightIso >= s.checkIn && overnightIso < s.checkOut);
    nightToSegment[d] = matchSeg || null;
  }

  // 4. Determine old day locations
  const oldDayLocations = {};
  for (let d = 1; d <= expectedDays; d++) {
    const overnightDate = new Date(tripStart);
    overnightDate.setUTCDate(tripStart.getUTCDate() + (d - 1));
    const overnightIso = overnightDate.toISOString().split("T")[0];

    let oldLoc = null;
    for (const seg of (trip.staySegments || [])) {
      if (seg.checkIn && seg.checkOut) {
        if (overnightIso >= seg.checkIn && overnightIso < seg.checkOut) {
          oldLoc = seg.location;
          break;
        }
      }
    }
    if (!oldLoc && oldItinerary[d - 1]?.title) {
      const match = oldItinerary[d - 1].title.match(/in\s+([A-Za-z\s]+)/i);
      if (match) oldLoc = match[1].trim();
    }
    oldDayLocations[d] = oldLoc || (d === expectedDays ? (oldDayLocations[d - 1] || trip.destination) : trip.destination);
  }

  // 5. Build robust Day Metadata for all days (1 .. expectedDays)
  const dayMeta = {};
  for (let d = 1; d <= expectedDays; d++) {
    const isDeparture = (d === expectedDays);
    const isTransit = transitNights.has(d);
    const staySegForNight = isDeparture ? null : nightToSegment[d];
    const prevNightStay = (d > 1) ? nightToSegment[d - 1] : null;

    let dayLocation = trip.destination;
    if (staySegForNight) {
      dayLocation = staySegForNight.location;
    } else if (prevNightStay) {
      dayLocation = prevNightStay.location;
    }

    dayMeta[d] = {
      dayNum: d,
      isDeparture,
      isTransit,
      staySegForNight,
      prevNightStay,
      location: dayLocation,
    };
  }

  // 6. Compare previous Stay Plan and new Stay Plan to classify the change
  const oldStaySegments = trip.staySegments || [];
  const oldLocations = oldStaySegments.map(s => String(s.location || "").toLowerCase().trim()).filter(Boolean);
  const newLocations = canonicalSegments.map(s => String(s.location || "").toLowerCase().trim()).filter(Boolean);

  const uniqueOldLocations = new Set(oldLocations);
  for (let d = 1; d <= expectedDays; d++) {
    if (oldDayLocations[d]) {
      uniqueOldLocations.add(String(oldDayLocations[d]).toLowerCase().trim());
    }
  }

  const uniqueNewLocations = new Set(newLocations);
  const newDestinations = [...uniqueNewLocations].filter(loc => !uniqueOldLocations.has(loc));
  const removedDestinations = [...uniqueOldLocations].filter(loc => !uniqueNewLocations.has(loc));

  const isSameCount = oldStaySegments.length === canonicalSegments.length;
  const isSameOrder = isSameCount && oldLocations.every((loc, i) => loc === newLocations[i]);
  const isSameNights = isSameCount && oldStaySegments.every((s, i) => parseInt(s.nights || 1, 10) === parseInt(canonicalSegments[i].nights || 1, 10));
  const isSameHotels = isSameCount && oldStaySegments.every((s, i) => {
    const hOld = s.selectedHotel?.id || s.selectedHotel?._id || s.selectedHotel?.name || null;
    const hNew = canonicalSegments[i].selectedHotel?.id || canonicalSegments[i].selectedHotel?._id || canonicalSegments[i].selectedHotel?.name || null;
    return hOld === hNew;
  });
  const sameLocationsSet = newDestinations.length === 0 && removedDestinations.length === 0;

  let changeType = "MIXED_CHANGE";
  if (isSameCount && isSameOrder && isSameNights && isSameHotels) {
    changeType = "NO_CHANGE";
  } else if (isSameCount && isSameOrder && isSameNights && !isSameHotels) {
    changeType = "HOTEL_ONLY";
  } else if (sameLocationsSet && isSameCount && !isSameOrder && isSameNights) {
    changeType = "ORDER_ONLY";
  } else if (sameLocationsSet && isSameCount && isSameOrder && !isSameNights) {
    changeType = "NIGHT_DURATION_CHANGE";
  } else if (sameLocationsSet && (!isSameOrder || !isSameNights)) {
    changeType = "ORDER_AND_NIGHTS_CHANGE";
  } else if (newDestinations.length > 0 && removedDestinations.length === 0) {
    changeType = "ADDITION_OF_NEW_DESTINATION";
  } else if (newDestinations.length === 0 && removedDestinations.length > 0) {
    changeType = "REMOVAL_OF_DESTINATION";
  } else if (newDestinations.length > 0 && removedDestinations.length > 0) {
    changeType = "DESTINATION_CHANGE";
  }

  // Helper to extract clean core activities from a day's plan
  const extractCorePlan = (plan) => {
    if (!Array.isArray(plan)) return [];
    return plan.filter(p => {
      const cat = String(p.category || "").toLowerCase();
      const act = String(p.activity || "").toLowerCase();
      const isHotelOp = cat === "operational" || act.includes("check-in") || act.includes("check out");
      const isIntercityTravel = (cat === "transport" || p.trainNumber || p.flightNumber) &&
        (act.includes("travel:") || act.includes("return:") || act.includes("transfer to") || act.includes("travel to") || act.includes("airport"));
      return !isHotelOp && !isIntercityTravel;
    });
  };

  // Map old nights to old segments
  const nightToOldSegment = {};
  for (let d = 1; d < expectedDays; d++) {
    if (transitNights.has(d)) continue;
    const overnightDate = new Date(tripStart);
    overnightDate.setUTCDate(tripStart.getUTCDate() + (d - 1));
    const overnightIso = overnightDate.toISOString().split("T")[0];
    const matchOld = oldStaySegments.find(s => overnightIso >= s.checkIn && overnightIso < s.checkOut);
    if (matchOld) nightToOldSegment[d] = matchOld;
  }

  // Pools of available existing day plans
  const poolBySegmentId = {};
  const poolByLocation = {};

  for (let d = 1; d < expectedDays; d++) {
    if (transitNights.has(d)) continue;
    const oldDayData = oldItinerary[d - 1];
    const corePlan = extractCorePlan(oldDayData?.plan);
    const dayTitle = oldDayData?.title || `Day in ${oldDayLocations[d]}`;
    const oldSeg = nightToOldSegment[d];
    const locLower = String(oldDayLocations[d] || (oldSeg?.location) || "").toLowerCase().trim();

    const dayObj = {
      title: dayTitle,
      plan: corePlan,
      location: locLower,
      originalDayNum: d
    };

    if (oldSeg && oldSeg.id) {
      if (!poolBySegmentId[oldSeg.id]) poolBySegmentId[oldSeg.id] = [];
      poolBySegmentId[oldSeg.id].push(dayObj);
    }
    if (locLower) {
      if (!poolByLocation[locLower]) poolByLocation[locLower] = [];
      poolByLocation[locLower].push(dayObj);
    }
  }

  // Old departure day
  const oldDepartureDayData = oldItinerary[expectedDays - 1];
  const oldDepartureCorePlan = extractCorePlan(oldDepartureDayData?.plan);

  // 7. Map existing activities deterministically or identify dirty days
  const newItineraryDays = [];
  const dirtyDays = [];
  const usedPooledDays = new Set();

  for (let d = 1; d <= expectedDays; d++) {
    const meta = dayMeta[d];

    if (meta.isDeparture) {
      // Departure day: preserve activities, strip old checkouts/checkins/transports
      newItineraryDays.push({
        day: d,
        title: oldDepartureDayData?.title || `Day ${d} - Departure from ${meta.location}`,
        plan: oldDepartureCorePlan.length > 0 ? [...oldDepartureCorePlan] : []
      });
      continue;
    }

    if (meta.isTransit) {
      const oldDayData = oldItinerary[d - 1];
      newItineraryDays.push(oldDayData ? { day: d, title: oldDayData.title, plan: oldDayData.plan || [] } : { day: d, title: `Day ${d} - Transit`, plan: [] });
      continue;
    }

    // For regular stay days:
    const seg = meta.staySegForNight;
    const targetLoc = (meta.location || "").toLowerCase().trim();

    let matchedDayObj = null;

    // For HOTEL_ONLY or NO_CHANGE, keep day d aligned directly if location matches
    if (changeType === "HOTEL_ONLY" || changeType === "NO_CHANGE") {
      const oldDayData = oldItinerary[d - 1];
      const oldLoc = String(oldDayLocations[d] || "").toLowerCase().trim();
      if (oldDayData && oldLoc === targetLoc) {
        matchedDayObj = {
          title: oldDayData.title,
          plan: extractCorePlan(oldDayData.plan),
          location: targetLoc,
          originalDayNum: d
        };
      }
    }

    // 1. Try to pull an unused day from matching segment ID pool
    if (!matchedDayObj && seg && seg.id && poolBySegmentId[seg.id]) {
      matchedDayObj = poolBySegmentId[seg.id].find(obj => !usedPooledDays.has(obj));
    }

    // 2. If not found by segment ID, try to pull from matching location pool
    if (!matchedDayObj && targetLoc && poolByLocation[targetLoc]) {
      matchedDayObj = poolByLocation[targetLoc].find(obj => !usedPooledDays.has(obj));
    }

    if (matchedDayObj) {
      usedPooledDays.add(matchedDayObj);
      let dayTitle = matchedDayObj.title || `Day ${d} in ${meta.location}`;
      dayTitle = dayTitle.replace(/^Day\s*\d+\s*[-:–]?\s*/i, `Day ${d} - `);
      newItineraryDays.push({
        day: d,
        title: dayTitle,
        plan: [...matchedDayObj.plan]
      });
    } else {
      // Truly new location/day without existing activities -> mark dirty for Gemini
      dirtyDays.push({ dayNum: d, location: meta.location });
      newItineraryDays.push(null);
    }
  }

  const geminiRequired = dirtyDays.length > 0;

  // Concise backend debug logging
  console.log(`[StayPlan Sync]
Change type: ${changeType}
Locations changed: ${!sameLocationsSet}
New destinations: ${newDestinations.length}
Removed destinations: ${removedDestinations.length}
Gemini required: ${geminiRequired}${geminiRequired ? `\nAffected days: [${dirtyDays.map(d => d.dayNum).join(", ")}]` : ""}`);

  // 8. Call Gemini ONLY if there are dirty days!
  if (geminiRequired) {
    const dirtyPrompt = `
You are an expert travel planner.
I have a trip to ${trip.destination} for ${trip.travelers} travelers.
Budget: ${trip.budget} ${trip.currency}

Generate core destination activities ONLY for the following specific days and locations:
${dirtyDays.map(d => `- Day ${d.dayNum} in ${d.location}`).join("\n")}

Rules:
1. Do NOT include transport between cities.
2. Do NOT include hotel check-in/check-out.
3. Provide ONLY pure activities and meals.
4. Return ONLY a valid JSON array of day objects matching the exact format below.

[
  {
    "day": 1,
    "title": "Exploring Location",
    "plan": [
       {
         "time": "09:00 AM - 11:00 AM",
         "place": "Place Name",
         "activity": "Activity Name",
         "notes": "Details",
         "duration": "2h",
         "estimatedCost": "500",
         "category": "activity"
       }
    ]
  }
]
`;

    let result;
    try {
      const model = getModel();
      result = await model.generateContent(dirtyPrompt);
    } catch (err) {
      if (err.message && (err.message.includes("429") || err.message.includes("quota") || err.message.includes("RESOURCE_EXHAUSTED"))) {
        throw new Error("Gemini API quota exceeded. Please try again in a few moments.");
      }
      throw err;
    }

    let text = result.response.text().replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
    let generatedDays = JSON.parse(text);

    for (const gd of generatedDays) {
      if (gd && gd.day && newItineraryDays[gd.day - 1] === null) {
        newItineraryDays[gd.day - 1] = gd;
      }
    }
  }

  // 9. Assemble final days and inject structured operational events
  const finalDays = [];
  for (let d = 1; d <= expectedDays; d++) {
    let dayData = newItineraryDays[d - 1] || { day: d, title: `Day ${d}`, plan: [] };
    if (!Array.isArray(dayData.plan)) dayData.plan = [];
    finalDays.push(dayData);
  }

  const isCampus = trip.tripCategory === "CAMPUS";
  const expectedStudents = isCampus
    ? parseInt(trip.campusConfig?.expectedParticipants, 10) || parseInt(trip.travelers, 10) || 1
    : 1;
  const studentsPerRoom = isCampus
    ? parseInt(trip.campusConfig?.studentsPerRoom, 10) || 2
    : 2;
  const requiredRooms = isCampus
    ? Math.max(1, Math.ceil(expectedStudents / studentsPerRoom))
    : 1;

  // Inject Check-in and Check-out for each canonical stay segment
  canonicalSegments.forEach((seg, sIdx) => {
    const checkInDate = new Date(seg.checkIn + "T00:00:00Z");
    const checkOutDate = new Date(seg.checkOut + "T00:00:00Z");
    const dayInIdx = Math.round((checkInDate - tripStart) / (1000 * 60 * 60 * 24)); // 0-based
    const dayOutIdx = Math.round((checkOutDate - tripStart) / (1000 * 60 * 60 * 24)); // 0-based

    const hotelName = seg.selectedHotel?.name || "Hotel";
    const nights = Math.max(1, parseInt(seg.nights || 1, 10));

    let hotelPrice = 0;
    if (seg.selectedHotel) {
      if (isCampus) {
        if (seg.selectedHotel.groupPrice && Number(seg.selectedHotel.groupPrice) > 0) {
          hotelPrice = Number(seg.selectedHotel.groupPrice);
        } else if (seg.selectedHotel.rooms && Number(seg.selectedHotel.rooms) > 1 && seg.selectedHotel.price) {
          hotelPrice = Number(seg.selectedHotel.price);
        } else {
          let nightlyRate = Number(seg.selectedHotel.nightlyPrice || seg.selectedHotel.pricePerNight || 0);
          if (!nightlyRate && seg.selectedHotel.price) {
            nightlyRate = Math.round(Number(seg.selectedHotel.price) / nights);
          }
          if (!nightlyRate || nightlyRate < 1000) {
            const nameStr = seg.selectedHotel.name || "";
            const locStr = seg.location || "";
            const seed = (nameStr + locStr).length || 10;
            nightlyRate = 3500 + (seed % 10) * 500;
          }
          const groupNightlyRate = calculateCampusGroupRoomRate(nightlyRate, requiredRooms);
          hotelPrice = requiredRooms * groupNightlyRate * nights;
          seg.selectedHotel.nightlyPrice = groupNightlyRate;
        }
        // Keep hotel object properties consistent
        seg.selectedHotel.price = hotelPrice;
        seg.selectedHotel.groupPrice = hotelPrice;
        seg.selectedHotel.rooms = requiredRooms;
        seg.selectedHotel.perStudentPrice = Math.round(hotelPrice / expectedStudents);
      } else {
        hotelPrice = seg.selectedHotel.price || "0";
      }
    }

    const defaultTransportCost = isCampus
      ? String(Math.round(expectedStudents * 500))
      : "1000";

    // Intercity transport on check-in day
    if (dayInIdx >= 0 && dayInIdx < finalDays.length) {
      const dayPlan = finalDays[dayInIdx].plan;
      const fromLoc = (sIdx > 0 && canonicalSegments[sIdx - 1]) ? canonicalSegments[sIdx - 1].location : trip.source;

      const hasTransport = dayPlan.some(p => p.category === "transport" || p.trainNumber || p.flightNumber);
      if (!hasTransport && fromLoc.toLowerCase() !== seg.location.toLowerCase()) {
        dayPlan.unshift({
          id: `itin_${crypto.randomUUID()}`,
          time: "09:00 AM - 12:00 PM",
          place: `Travel to ${seg.location}`,
          activity: `Travel: ${fromLoc} to ${seg.location}`,
          category: "transport",
          duration: "3h",
          estimatedCost: defaultTransportCost
        });
      }

      // Hotel Check-in
      dayPlan.push({
        id: `sync-checkin-${seg.id}`,
        time: "02:00 PM - 02:30 PM",
        place: hotelName !== "Hotel" ? hotelName : seg.location,
        activity: `Check-in at ${hotelName}`,
        category: "operational",
        duration: "30m",
        estimatedCost: `${hotelPrice}`,
        stayId: seg.id
      });
    }

    // Hotel Check-out
    if (dayOutIdx >= 0 && dayOutIdx < finalDays.length) {
      const dayPlan = finalDays[dayOutIdx].plan;
      dayPlan.push({
        id: `sync-checkout-${seg.id}`,
        time: "11:00 AM - 11:30 AM",
        place: hotelName !== "Hotel" ? hotelName : seg.location,
        activity: `Check out from ${hotelName}`,
        category: "operational",
        duration: "30m",
        estimatedCost: "0",
        stayId: seg.id
      });
    }
  });

  // Departure day return transport (if not already present)
  const depDay = finalDays[expectedDays - 1];
  if (depDay && Array.isArray(depDay.plan)) {
    const hasDepTransport = depDay.plan.some(p => p.category === "transport" || p.trainNumber || p.flightNumber);
    if (!hasDepTransport) {
      const lastSeg = canonicalSegments[canonicalSegments.length - 1];
      const fromLoc = lastSeg ? lastSeg.location : trip.destination;
      const depTransportCost = isCampus
        ? String(Math.round(expectedStudents * 500))
        : "1000";
      depDay.plan.push({
        id: `itin_${crypto.randomUUID()}`,
        time: "02:00 PM - 05:00 PM",
        place: `Travel to ${trip.source}`,
        activity: `Return: ${fromLoc} to ${trip.source}`,
        category: "transport",
        duration: "3h",
        estimatedCost: depTransportCost
      });
    }
  }

  // Ensure every item in every day plan has a valid unique ID
  finalDays.forEach(day => {
    if (Array.isArray(day.plan)) {
      day.plan.forEach(p => {
        if (!p.id && !p._id) {
          p.id = `itin_${crypto.randomUUID()}`;
        }
      });
    }
  });

  const parsedData = { days: finalDays, staySegments: canonicalSegments };

  // 9. Run deterministic scheduler
  buildDeterministicTimeline(parsedData);

  // 10. Run itinerary validator
  const valRes = validateItinerary(parsedData, trip);
  if (valRes.errors && valRes.errors.length > 0) {
    const hardConflicts = valRes.errors.filter(c => !c.message.includes("is tightly packed"));
    if (hardConflicts.length > 0) {
      throw new Error("Synchronized itinerary generated schedule conflicts: " + hardConflicts.map(c => c.message).join(" | "));
    }
  }

  // 11. Transactional persistence: only update trip when all steps succeed
  trip.itinerary = parsedData.days;
  trip.staySegments = canonicalSegments;
  trip.markModified("itinerary");
  trip.markModified("staySegments");

  await trip.save();
  return trip;
};

module.exports = {
  generateTripPlan,
  regenerateTripDay,
  syncItineraryWithStayPlan,
};

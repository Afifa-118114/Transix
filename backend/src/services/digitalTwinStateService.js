const { getWeatherForTrip } = require("./weatherService");
const { getSocialSignalsForTrip } = require("./socialSignalService");

const buildDigitalTwin = async (trip) => {
  if (!trip) throw new Error("Trip is required to build Twin State");

  const twinState = {
    trip: {
      id: trip._id,
      source: trip.source,
      destination: trip.destination,
      travelers: trip.travelers,
      duration: trip.duration,
      startDate: trip.startDate,
      endDate: trip.endDate,
      status: trip.status,
    },
    entities: [],
    relationships: [],
    environment: {
      weather: { available: false },
      publicSignals: { available: false }
    },
    generatedAt: new Date().toISOString(),
    freshness: {}
  };

  // 1. Normalize Entities
  // Transport Legs
    if (trip.travelLegs && trip.travelLegs.length > 0) {
      trip.travelLegs.forEach((leg, index) => {
        const legId = leg.id || `transport-${index}`;
        twinState.entities.push({
          id: legId,
          type: "TRANSPORT",
          title: leg.from && leg.to ? `${leg.from} to ${leg.to} via ${leg.mode || trip.travelMode || 'Transport'}` : `${trip.source} to ${trip.destination} via ${trip.travelMode || 'Transport'}`,
          day: leg.day || null,
          startTime: leg.departureTime || null,
          endTime: leg.arrivalTime || null,
          location: null,
          coordinates: null,
        });
      });
    } else {
      twinState.entities.push({
        id: `transport-0`,
        type: "TRANSPORT",
        title: `${trip.source} to ${trip.destination} via ${trip.travelMode || 'Transport'}`,
        day: null,
        startTime: null,
        endTime: null,
        location: null,
        coordinates: null,
      });
    }

  // Hotel/Stay Segments
  if (Array.isArray(trip.staySegments)) {
    trip.staySegments.forEach((stay, index) => {
      const stayId = stay.id || `hotel-${index}`;
      twinState.entities.push({
        id: stayId,
        type: "HOTEL",
        title: stay.hotelName || stay.description || "Accommodation",
        day: stay.day || null,
        startTime: stay.checkIn || null,
        endTime: stay.checkOut || null,
        location: stay.location || trip.destination,
        coordinates: stay.coordinates || null,
      });
    });
  }

  // Activities (from Itinerary)
  let prevActivityId = null;
  if (Array.isArray(trip.itinerary)) {
    trip.itinerary.forEach((dayPlan, dayIndex) => {
      if (Array.isArray(dayPlan.plan)) {
        dayPlan.plan.forEach((act, actIndex) => {
          const actId = act.id || `activity-${dayIndex}-${actIndex}`;
          
          const actTitle = act.title || act.activity || act.name || "Unnamed Activity";
          
          let type = "OTHER_ACTIVITY";
          const lowerCat = (act.category || "").toLowerCase();
          const lowerTitle = actTitle.toLowerCase();
          
          if (lowerCat.includes("outdoor") || lowerTitle.includes("walk") || lowerTitle.includes("hike") || lowerTitle.includes("trek") || lowerTitle.includes("park") || lowerTitle.includes("beach") || lowerTitle.includes("fort")) {
            type = "OUTDOOR_ACTIVITY";
          } else if (lowerCat.includes("indoor") || lowerTitle.includes("museum") || lowerTitle.includes("gallery")) {
            type = "INDOOR_ACTIVITY";
          } else if (lowerCat.includes("food") || lowerCat.includes("restaurant") || lowerTitle.includes("lunch") || lowerTitle.includes("dinner") || lowerTitle.includes("breakfast") || lowerTitle.includes("dining")) {
            type = "RESTAURANT";
          }
          
          twinState.entities.push({
            id: actId,
            type: type,
            title: actTitle,
            day: dayPlan.day,
            startTime: act.time || null,
            duration: act.duration || null,
            location: act.location || null,
            coordinates: act.coordinates || null,
          });

          if (prevActivityId) {
            twinState.relationships.push({
              from: prevActivityId,
              to: actId,
              type: "PRECEDES"
            });
          }
          prevActivityId = actId;
        });
      }
    });
  }

  // Destination Entity
  twinState.entities.push({
    id: `dest-${trip.destination}`,
    type: "DESTINATION",
    title: trip.destination,
    location: trip.destination,
    coordinates: null
  });

  // 2. Attach Weather
  try {
    const weatherRes = await getWeatherForTrip(trip);
    if (weatherRes && weatherRes.current) {
      twinState.environment.weather = {
        available: true,
        current: weatherRes.current,
        location: weatherRes.location,
        hourly: weatherRes.hourly,
      };
      twinState.freshness.weather = weatherRes.fetchedAt;
    }
  } catch (err) {
    console.error("[DigitalTwinState] Weather unavailable:", err.message);
  }

  // 3. Attach Public Signals
  try {
    const signalRes = await getSocialSignalsForTrip(trip);
    if (signalRes && signalRes.available) {
      twinState.environment.publicSignals = {
        available: true,
        count: signalRes.signals.count,
        topTopics: signalRes.signals.topTopics,
        signalStrength: signalRes.signals.signalStrength,
        recent: signalRes.signals.recent,
      };
      twinState.freshness.publicSignals = signalRes.fetchedAt;
    }
  } catch (err) {
    console.error("[DigitalTwinState] Public signals unavailable:", err.message);
  }

  return twinState;
};

module.exports = {
  buildDigitalTwin
};

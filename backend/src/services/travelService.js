const { getCoordinates } = require("./geocodeService");
const { getRoute } = require("./osrmService");
const { buildCab } = require("./cabService");

function formatDuration(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

async function fetchTravelOptions(source, destination) {
  const sourceCoords = await getCoordinates(source);
  const destCoords = await getCoordinates(destination);

  const route = await getRoute(
    sourceCoords.lat,
    sourceCoords.lng,
    destCoords.lat,
    destCoords.lng,
  );

  const distanceKm = route.distance / 1000;

  const cab = buildCab(route, source, destination);

  const trainHours = distanceKm / 75;
  const flightHours = distanceKm / 700 + 1;
  const busHours = distanceKm / 55;

  return {
    train: [
      {
        id: 1,
        type: "Train",
        provider: "Indian Railways",
        from: source,
        to: destination,
        duration: formatDuration(trainHours),
        estimatedFare: `₹${Math.round(distanceKm * 1.5)}`,
        bookingUrl: "https://www.irctc.co.in/nget/train-search",
      },
    ],

    flight: [
      {
        id: 1,
        type: "Flight",
        provider: "MakeMyTrip",
        from: source,
        to: destination,
        duration: formatDuration(flightHours),
        estimatedFare: `₹${Math.round(2500 + distanceKm * 3.5)}`,
        bookingUrl: "https://www.makemytrip.com/flights/",
      },
    ],

    bus: [
      {
        id: 1,
        type: "Bus",
        provider: "RedBus",
        from: source,
        to: destination,
        duration: formatDuration(busHours),
        estimatedFare: `₹${Math.round(distanceKm * 1.2)}`,
        bookingUrl: "https://www.redbus.in/",
      },
    ],

    cab,
  };
}

module.exports = { fetchTravelOptions };

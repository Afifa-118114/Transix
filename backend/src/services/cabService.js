function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function fare(distanceKm) {
  return Math.round(80 + distanceKm * 14);
}

function buildCab(route, from, to) {
  const km = route.distance / 1000;

  return [
    {
      id: 1,
      type: "Cab",
      provider: "Estimated",
      from,
      to,
      distance: `${km.toFixed(1)} km`,
      duration: formatDuration(route.duration),
      estimatedFare: `₹${fare(km)}`,
      bookingUrl: "https://m.uber.com",
    },
  ];
}

module.exports = { buildCab };

export function formatDate(date) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export function formatBudget(amount) {
  return `₹${Number(amount).toLocaleString("en-IN")} (Est.)`;
}

export function getDuration(trip) {
  if (trip.itinerary?.length) {
    return `${trip.itinerary.length} Days`;
  }

  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);

  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  return `${days} Days`;
}

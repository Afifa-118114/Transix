import trips from "../data/trips";

export function generateTrip(source, destination) {
  const key = `${source.toLowerCase()}-${destination.toLowerCase()}`;

  return trips[key] || null;
}

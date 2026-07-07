import PlaceCard from "./PlaceCard";

export default function PlaceGrid({ places }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {places.map((place) => (
        <PlaceCard key={place.id} place={place} />
      ))}
    </div>
  );
}

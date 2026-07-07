import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";

function MapPreview({ trip }) {
  const [points, setPoints] = useState([]);

  useEffect(() => {
    if (!trip) return;

    async function getCoordinates(place) {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          place,
        )}`,
      );

      const data = await res.json();

      if (!data.length) return null;

      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }

    async function load() {
      const source = await getCoordinates(trip.source);
      const destination = await getCoordinates(trip.destination);

      if (source && destination) {
        setPoints([source, destination]);
      }
    }

    load();
  }, [trip]);

  if (points.length < 2) {
    return (
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Route Overview</h2>

        <p className="mt-4 text-gray-500">Loading map...</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold translate-x-3">Route Overview</h2>
          <p className="text-sm text-gray-500 translate-x-3">
            {trip.source} → {trip.destination}
          </p>
        </div>
      </div>

      <MapContainer
        center={points[0]}
        zoom={6}
        scrollWheelZoom={true}
        className="h-[420px] rounded-2xl"
      >
        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={points[0]}>
          <Popup>{trip.source}</Popup>
        </Marker>

        <Marker position={points[1]}>
          <Popup>{trip.destination}</Popup>
        </Marker>

        <Polyline positions={points} />
      </MapContainer>
    </section>
  );
}

export default MapPreview;

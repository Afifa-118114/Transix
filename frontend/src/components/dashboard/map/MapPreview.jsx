import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";

export default function MapPreview({ trip }) {
  const [points, setPoints] = useState([]);

  useEffect(() => {
    if (!trip) return;

    async function getCoordinates(place) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            place,
          )}`,
        );
        const data = await res.json();
        if (!data.length) return null;
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      } catch {
        return null;
      }
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
      <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] p-5 shadow-xs transition-colors">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Route Map Overview</h2>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Loading route map...</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] p-5 shadow-xs transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Route Map Overview</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {trip.source} → {trip.destination}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
        <MapContainer
          center={points[0]}
          zoom={6}
          scrollWheelZoom={false}
          className="h-80 w-full"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Marker position={points[0]}>
            <Popup>{trip.source}</Popup>
          </Marker>

          <Marker position={points[1]}>
            <Popup>{trip.destination}</Popup>
          </Marker>

          <Polyline positions={points} color="#4f46e5" weight={4} />
        </MapContainer>
      </div>
    </section>
  );
}

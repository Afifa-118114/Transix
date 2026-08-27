import { FiArrowRight } from "react-icons/fi";
import { useEffect, useState } from "react";
import {
  formatDate,
  formatBudget,
  getDuration,
} from "../../../utils/formatTrip";
import TripStats from "./TripStats";
import { getPlaceImage } from "../../../services/imageService";

export default function HeroBanner({ trip }) {
  const [heroImage, setHeroImage] = useState("");

  useEffect(() => {
    async function loadImage() {
      const image = await getPlaceImage(trip.destination);
      setHeroImage(image);
    }

    if (trip?.destination) {
      loadImage();
    }
  }, [trip]);

  return (
    <section className="relative flex flex-col gap-4">
      {/* Hero Visual Card */}
      <div className="relative h-64 md:h-72 w-full overflow-hidden rounded-2xl bg-slate-900 shadow-xs">
        {heroImage ? (
          <img
            src={heroImage}
            alt={trip.destination}
            className="h-full w-full object-cover opacity-80 transition duration-500"
          />
        ) : (
          <div className="h-full w-full animate-pulse bg-slate-800" />
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-slate-900/20" />

        {/* Hero Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8 text-white">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-indigo-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-200 backdrop-blur-sm border border-indigo-400/20">
              AI Trip Intelligence
            </span>
          </div>

          <h1 className="mt-2 text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <span>{trip.source}</span>
            <FiArrowRight className="text-indigo-400 text-xl" />
            <span>{trip.destination}</span>
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-2 md:gap-4 text-xs font-medium text-slate-300">
            <span>{getDuration(trip)}</span>
            <span>•</span>
            <span>
              {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
            </span>
            <span>•</span>
            <span className="text-white font-bold">{formatBudget(trip.budget)}</span>
          </div>
        </div>
      </div>

      {/* Structured Stats Bar */}
      <TripStats trip={trip} />
    </section>
  );
}

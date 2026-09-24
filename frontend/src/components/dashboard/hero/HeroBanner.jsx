import { FiArrowRight, FiEdit3 } from "react-icons/fi";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  formatDate,
  formatBudget,
  getDuration,
} from "../../../utils/formatTrip";
import TripStats from "./TripStats";
import { getPlaceImage } from "../../../services/imageService";

export default function HeroBanner({ trip, onResetTrip }) {
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
      <div className="relative h-64 md:h-80 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 shadow-[0_8px_28px_rgba(37,99,235,0.15)]">
        {heroImage ? (
          <img
            src={heroImage}
            alt={trip.destination}
            className="h-full w-full object-cover opacity-90 transition duration-700 hover:scale-105"
          />
        ) : (
          <div className="h-full w-full animate-pulse bg-gradient-to-r from-blue-500 to-indigo-600" />
        )}

        {/* Radiant Gradient Overlay (Not Pitch Black) */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/30 to-indigo-950/20" />

        {/* Subtle Decorative Ambient Glow */}
        <div className="absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-sky-400/25 blur-3xl pointer-events-none" />
        <div className="absolute -top-10 -left-10 h-48 w-48 rounded-full bg-indigo-400/25 blur-3xl pointer-events-none" />

        {/* Hero Top Actions Bar */}
        <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/25 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-md border border-white/30 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
            Synthesized Masterplan
          </span>

          <div className="flex items-center gap-2">
            {onResetTrip && (
              <button
                onClick={onResetTrip}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/20 hover:bg-white/30 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-md border border-white/30 transition cursor-pointer shadow-xs"
              >
                <FiEdit3 className="text-xs" />
                <span>New Plan</span>
              </button>
            )}
            <Link
              to="/builder"
              className="inline-flex items-center rounded-full bg-white hover:bg-indigo-50 px-4 py-1.5 text-xs font-bold text-indigo-700 shadow-md transition"
            >
              Tour Builder →
            </Link>
          </div>
        </div>

        {/* Hero Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8 text-white z-10">
          <h1 className="text-3xl md:text-5xl font-serif font-light tracking-tight flex items-center gap-3 drop-shadow-sm">
            <span>{trip.source}</span>
            <FiArrowRight className="text-sky-300 text-2xl md:text-3xl font-light" />
            <span>{trip.destination}</span>
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2 md:gap-4 text-xs font-semibold text-slate-200">
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 backdrop-blur-xs text-white">
              {getDuration(trip)}
            </span>
            <span className="text-white/60">•</span>
            <span>
              {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
            </span>
            <span className="text-white/60">•</span>
            <span className="text-amber-300 font-extrabold">{formatBudget(trip.budget)}</span>
            {trip.travelers && (
              <>
                <span className="text-white/60">•</span>
                <span>{trip.travelers} Travelers</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Structured Stats Bar */}
      <TripStats trip={trip} />
    </section>
  );
}

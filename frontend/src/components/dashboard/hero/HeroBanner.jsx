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
  const [heroImage, setHeroImage] = useState(trip?.heroImage || "");

  useEffect(() => {
    // Prefer persisted Trip.heroImage: no AI or Pexels API calls when image exists
    if (trip?.heroImage) {
      setHeroImage(trip.heroImage);
      return;
    }

    // Fallback only for legacy trips without heroImage
    let isMounted = true;
    async function loadImage() {
      const image = await getPlaceImage(trip.destination);
      if (isMounted) {
        setHeroImage(image);
      }
    }

    if (trip?.destination) {
      loadImage();
    }

    return () => {
      isMounted = false;
    };
  }, [trip?.heroImage, trip?.destination]);

  return (
    <section className="relative flex flex-col gap-4">
      {/* Hero Visual Card */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden rounded-xl bg-gradient-to-br from-[#1A56DB] via-[#006CE4] to-[#0F3D91] shadow-[0_4px_20px_rgba(0,108,228,0.18)]">
        {heroImage ? (
          <img
            src={heroImage}
            alt={trip.destination}
            className="h-full w-full object-cover opacity-85 transition duration-700 hover:scale-105"
          />
        ) : (
          <div className="h-full w-full animate-pulse bg-gradient-to-r from-[#1A56DB] to-[#006CE4]" />
        )}

        {/* Trip.com Deep Blue Overlay (low noise, high text readability) */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A2540]/90 via-[#0A2540]/40 to-[#1A56DB]/30" />

        {/* Hero Top Actions Bar */}
        <div className="absolute top-4 left-4 right-4 sm:top-5 sm:left-5 sm:right-5 flex items-center justify-between z-10">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-md border border-white/25 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            Synthesized Masterplan
          </span>

          <div className="flex items-center gap-2">
            {onResetTrip && (
              <button
                onClick={onResetTrip}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md border border-white/25 transition cursor-pointer shadow-xs"
              >
                <FiEdit3 className="text-xs" />
                <span>New Plan</span>
              </button>
            )}
            <Link
              to="/builder"
              className="inline-flex items-center rounded-lg bg-[#006CE4] hover:bg-[#005bb5] px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition cursor-pointer border border-sky-300/30"
            >
              Tour Builder →
            </Link>
          </div>
        </div>

        {/* Hero Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-6 md:p-8 text-white z-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3 drop-shadow-sm">
            <span>{trip.source}</span>
            <FiArrowRight className="text-sky-300 text-xl sm:text-2xl font-light" />
            <span>{trip.destination}</span>
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-medium text-slate-200">
            <span className="rounded-md bg-white/20 px-2.5 py-0.5 backdrop-blur-xs text-white font-semibold">
              {getDuration(trip)}
            </span>
            <span className="text-white/60">•</span>
            <span>
              {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
            </span>
            <span className="text-white/60">•</span>
            <span className="text-[#FFB400] font-bold text-sm">{formatBudget(trip.budget)}</span>
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

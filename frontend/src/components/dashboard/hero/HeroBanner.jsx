import { FiArrowRight } from "react-icons/fi";
import { useEffect, useState } from "react";
import {
  formatDate,
  formatBudget,
  getDuration,
} from "../../../utils/formatTrip";

import TripStats from "./TripStats";
import { getPlaceImage } from "../../../services/imageService";

function HeroBanner({ trip }) {
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
    <section className=" overflow-x-hidden relative pb-16">
      <div className="relative h-[300px] overflow-hidden rounded-[16px]">
        {heroImage ? (
          <img
            src={heroImage}
            alt={trip.destination}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-28 w-full rounded-lg animate-pulse bg-indigo-100" />
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-[#1d1b4bcc] via-[#312e81aa] to-[#2563eb99]" />

        <div className="absolute inset-0 flex flex-col items-center justify-start pt-20 text-white">
          <p className="mb-4 uppercase tracking-[4px] text-white/80">
            AI GENERATED JOURNEY
          </p>

          <h1 className="text-4xl font-bold">
            {trip.source}
            <FiArrowRight className="mx-6 inline" />
            {trip.destination}
          </h1>

          <p className="mt-5 flex items-center gap-3 text-sm">
            <span>{getDuration(trip)}</span>
            <span className="mx-4">•</span>
            <span>
              {formatDate(trip.startDate)}
              <span className="mx-4">–</span>
              {formatDate(trip.endDate)}
            </span>
            <span className="mx-4">•</span>
            <span>{formatBudget(trip.budget)}</span>
          </p>
        </div>
      </div>

      <TripStats trip={trip} />
    </section>
  );
}

export default HeroBanner;

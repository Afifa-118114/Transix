import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { FiArrowLeft } from "react-icons/fi";

import TravelTabs from "../components/travel/TravelTabs";
import TravelHero from "../components/travel/TravelHero";
import JourneyTimeline from "../components/travel/JourneyTimeline";
import AvailableTransport from "../components/travel/AvailableTransport";
import TravelActionButtons from "../components/travel/TravelActionButtons";

export default function TravelDetails() {
  const navigate = useNavigate();
  const { state } = useLocation();

  if (!state || !state.transports) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fc]">
        <div className="rounded-3xl bg-white p-10 text-center shadow-xl">
          <h2 className="text-3xl font-bold text-gray-800">
            No Travel Data Found
          </h2>

          <p className="mt-3 text-gray-500">
            Please return to the dashboard and select a travel option.
          </p>

          <button
            onClick={() => navigate(-1)}
            className="mt-8 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { transports, mode, activeIndex = 0 } = state;

  const [selectedTransport, setSelectedTransport] = useState(activeIndex);

  const transport = transports[selectedTransport];

  return (
    <div className="min-h-screen bg-[#f7f8fc]">
      <div className="mx-auto max-w-7xl px-8 py-8">
        {/* Back */}

        <button
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 text-indigo-600 transition hover:text-indigo-800"
        >
          <FiArrowLeft />
          Back to Dashboard
        </button>

        {/* Heading */}

        <div className="mb-8">
          <h1 className="text-4xl font-bold">{mode} Options</h1>

          <p className="mt-2 text-gray-500">
            Compare all available {mode.toLowerCase()} options before booking.
          </p>
        </div>

        {/* Tabs */}

        <TravelTabs
          transports={transports}
          activeTransport={selectedTransport}
          setActiveTransport={setSelectedTransport}
        />

        {/* Hero */}

        <div className="mt-8">
          <TravelHero transport={transport} />
        </div>

        {/* Timeline */}

        <div className="mt-8">
          <JourneyTimeline transport={transport} />
        </div>

        {/* All Options */}

        <div className="mt-8">
          <AvailableTransport
            transports={transports}
            activeTransport={selectedTransport}
            setActiveTransport={setSelectedTransport}
          />
        </div>

        {/* Booking */}

        <div className="mt-10 mb-12">
          <TravelActionButtons transport={transport} />
        </div>
      </div>
    </div>
  );
}

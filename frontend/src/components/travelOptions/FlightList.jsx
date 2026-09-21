import { useState, useMemo } from "react";
import FlightCard from "./FlightCard";
import { FaPlane } from "react-icons/fa";

function FlightList({
  flights = [],
  selectedFlight,
  savedFlight,
  pendingFlight,
  onSelectFlight,
}) {
  const [selectedAirlineFilter, setSelectedAirlineFilter] = useState("ALL");

  // Extract unique airlines for filtering
  const availableAirlines = useMemo(() => {
    if (!flights || !flights.length) return [];
    const set = new Set(flights.map((f) => f.airline).filter(Boolean));
    return Array.from(set).sort();
  }, [flights]);

  // Filtered flights
  const displayedFlights = useMemo(() => {
    if (!flights || !flights.length) return [];
    if (selectedAirlineFilter === "ALL") return flights;
    return flights.filter((f) => f.airline === selectedAirlineFilter);
  }, [flights, selectedAirlineFilter]);

  if (!flights || !flights.length) {
    return (
      <div className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-8 text-center shadow-xs transition-colors">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 mb-3">
          <FaPlane size={20} />
        </div>
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
          No flight schedule records found for this route on the requested weekday.
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          Please check another travel date or explore train options.
        </p>
      </div>
    );
  }

  const isReference = flights.some((f) => f.isReference || f.mode === "REFERENCE");

  return (
    <div className="flex flex-col gap-2.5">
      {/* Header & Airline Filter Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          FLIGHT SCHEDULES ({flights.length})
        </span>
      </div>

      {/* Airline filter pills if multiple airlines exist */}
      {availableAirlines.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedAirlineFilter("ALL")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all shrink-0 ${
              selectedAirlineFilter === "ALL"
                ? "bg-sky-600 text-white shadow-2xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            All Airlines ({flights.length})
          </button>
          {availableAirlines.map((airline) => {
            const count = flights.filter((f) => f.airline === airline).length;
            return (
              <button
                key={airline}
                onClick={() => setSelectedAirlineFilter(airline)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider transition-all shrink-0 ${
                  selectedAirlineFilter === airline
                    ? "bg-sky-600 text-white shadow-2xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {airline} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Flight Cards list */}
      <div className="flex flex-col gap-1">
        {displayedFlights.map((flight) => {
          const isSelected =
            selectedFlight &&
            String(selectedFlight.flightNumber) === String(flight.flightNumber) &&
            selectedFlight.departureTime === flight.departureTime;

          const isSaved =
            savedFlight &&
            String(savedFlight.flightNumber) === String(flight.flightNumber) &&
            (savedFlight.departure === flight.departureTime || savedFlight.departureTime === flight.departureTime);

          const isPending =
            pendingFlight &&
            String(pendingFlight.flightNumber) === String(flight.flightNumber) &&
            pendingFlight.departureTime === flight.departureTime;

          return (
            <FlightCard
              key={`${flight.airline}_${flight.flightNumber}_${flight.departureTime}_${flight.validFrom}`}
              flight={flight}
              selected={isSelected}
              isSaved={isSaved}
              isPending={isPending}
              onClick={() => onSelectFlight(flight)}
            />
          );
        })}
      </div>
    </div>
  );
}

export default FlightList;

import React, { useMemo } from "react";
import { 
  FiTruck, 
  FiCheck, 
  FiArrowRight, 
  FiCalendar, 
  FiClock, 
  FiUsers, 
  FiCompass, 
  FiCheckCircle, 
  FiBox 
} from "react-icons/fi";
import { FaTrain, FaPlane } from "react-icons/fa";
import { findExistingTransportRecord } from "../../utils/schedulingEngine";
import { resolveLocalTransportArrangement } from "../../utils/busRequirementDetector";
import { formatDate } from "../../utils/formatTrip";

export default function TransportDetails({ trip }) {
  if (!trip) return null;

  const isCampus = trip.tripCategory === "CAMPUS" || Boolean(trip.campusConfig?.expectedParticipants);

  // 1. Intercity Transit for Campus Trips (Canonical Outbound & Return)
  const campusIntercityCards = useMemo(() => {
    if (!isCampus) return [];
    const out = findExistingTransportRecord(trip, "outbound");
    const ret = findExistingTransportRecord(trip, "return");
    const totalDays = Array.isArray(trip.itinerary) ? trip.itinerary.length : 10;

    const getCarrierDisplay = (record) => {
      if (!record) return "Scheduled Carrier";
      if (record.mode === "flight") {
        return record.flightNumber
          ? `${record.airline || "Flight"} #${record.flightNumber}`
          : (record.airline || "Scheduled Flight");
      }
      const num = record.trainNumber && record.trainNumber !== "DEFAULT" ? record.trainNumber : null;
      const name = record.trainName && record.trainName !== "Default Train" ? record.trainName : null;
      if (num && name) return `${name} #${num}`;
      if (num) return `Train #${num}`;
      if (name) return name;
      if (record.rawLeg?.trainNumber) return `Train #${record.rawLeg.trainNumber}`;
      if (record.rawLeg?.trainName) return record.rawLeg.trainName;
      const act = record.rawItem?.activity || "";
      const match = act.match(/Train\s+([A-Za-z0-9]+)/i);
      if (match) return match[0];
      return "Scheduled Train";
    };

    const getTimingDisplay = (record) => {
      if (!record) return "Timing Scheduled";
      const dep = record.departure || record.rawLeg?.startTime || record.rawItem?.startTime;
      const arr = record.arrival || record.rawLeg?.endTime || record.rawItem?.endTime;
      if (dep && arr) return `${dep} – ${arr}`;
      if (dep) return `Departs ${dep}`;
      if (record.rawItem?.time) return record.rawItem.time;
      return "Timing Scheduled";
    };

    const getDateDisplay = (record, fallbackDate) => {
      if (record?.rawLeg?.date) return formatDate(record.rawLeg.date);
      if (fallbackDate) return formatDate(fallbackDate);
      return "Day 1";
    };

    return [
      {
        direction: "OUTBOUND",
        mode: (out?.mode === "flight" || out?.rawLeg?.mode === "flight") ? "Flight" : "Train",
        from: out?.source || out?.rawLeg?.from || trip.source || "Origin",
        to: out?.destination || out?.rawLeg?.to || trip.destination || "Destination",
        date: getDateDisplay(out, trip.startDate),
        timing: getTimingDisplay(out),
        carrier: getCarrierDisplay(out),
        status: "Scheduled",
      },
      {
        direction: "RETURN",
        mode: (ret?.mode === "flight" || ret?.rawLeg?.mode === "flight") ? "Flight" : "Train",
        from: ret?.source || ret?.rawLeg?.from || trip.destination || "Destination",
        to: ret?.destination || ret?.rawLeg?.to || trip.source || "Origin",
        date: getDateDisplay(ret, trip.endDate || trip.startDate),
        timing: getTimingDisplay(ret),
        carrier: getCarrierDisplay(ret),
        status: "Scheduled",
      }
    ];
  }, [trip, isCampus]);

  // 2. Personal Trip Transit Legs
  const personalTravelLegs = useMemo(() => {
    if (isCampus || !Array.isArray(trip.travelLegs)) return [];
    return trip.travelLegs;
  }, [trip, isCampus]);

  // 3. Operational Group Fleet Plan for Campus Trips
  const campusFleetPlan = useMemo(() => {
    if (!isCampus) return null;
    return trip.campusTransportPlan || trip.campusConfig?.groupTransportPlan || {
      vehiclesRequired: Math.ceil((trip.campusConfig?.expectedParticipants || trip.travelers || 20) / 25),
      vehicleType: "Coach",
      comfort: "AC",
      capacityPerVehicle: 25,
      totalTravelers: trip.campusConfig?.expectedParticipants || trip.travelers || 20,
      studentsCount: trip.campusConfig?.expectedParticipants || trip.travelers || 20,
      teachersStaffCount: 0,
      luggageCount: trip.campusConfig?.expectedParticipants || trip.travelers || 20,
      notes: "",
      status: trip.status === "Finalized" ? "CONFIRMED" : "PENDING",
    };
  }, [trip, isCampus]);

  // 4. Personal Trip Local Transport Arrangement
  const personalTransportArrangement = useMemo(() => {
    if (isCampus) return null;
    return resolveLocalTransportArrangement(trip);
  }, [trip, isCampus]);

  // 5. Resolved Operational Route
  const resolvedRoute = useMemo(() => {
    const r = trip.campusTransportPlan?.route || trip.campusConfig?.groupTransportPlan?.route || trip.route;
    if (r && (r.originCity || r.originState || r.destinationCity || r.destinationState)) {
      const origin = [r.originCity || trip.source, r.originState].filter(Boolean).join(", ");
      const dest = [r.destinationCity || trip.destination, r.destinationState].filter(Boolean).join(", ");
      return { origin, dest };
    }
    if (trip.source && trip.destination) {
      return { origin: trip.source, dest: trip.destination };
    }
    return null;
  }, [trip]);

  // If personal trip and no transport legs and no transport arrangement exists, hide the section cleanly
  if (!isCampus && personalTravelLegs.length === 0 && !personalTransportArrangement?.isTransixCoordinated) {
    return null;
  }

  const getStatusBadge = (status) => {
    const s = (status || "").toUpperCase();
    if (s.includes("CONFIRM") || s === "SCHEDULED") {
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800";
    }
    if (s.includes("PROCESS") || s.includes("PROGRESS")) {
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800";
    }
    return "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800";
  };

  return (
    <section className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] p-6 shadow-xs space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
            <FiTruck size={18} />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">
              Transport Details
            </h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {isCampus ? "Campus Intercity & Fleet Arrangement" : "Transit & Travel Movements"}
            </p>
          </div>
        </div>
        <span className="rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50">
          Read-Only Overview
        </span>
      </div>

      {/* 1. INTERCITY TRANSIT */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Intercity Transit
          </div>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
            {isCampus ? "Campus Outbound & Return" : "Scheduled Legs"}
          </span>
        </div>

        {isCampus ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campusIntercityCards.map((card, idx) => (
              <div 
                key={idx}
                className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-[#1a233a] p-4 flex flex-col justify-between gap-3 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-800 transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-black rounded uppercase tracking-wider border border-indigo-200 dark:border-indigo-800">
                      {card.direction}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                      {card.mode === "Flight" ? <FaPlane className="text-indigo-500" /> : <FaTrain className="text-indigo-500" />}
                      <span>{card.mode}</span>
                    </span>
                  </div>

                  <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2 capitalize">
                    <span className="truncate">{card.from}</span>
                    <FiArrowRight className="text-indigo-500 shrink-0" />
                    <span className="truncate">{card.to}</span>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-2.5 font-medium space-y-1 bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <FiCalendar className="text-indigo-500 shrink-0 text-[11px]" />
                      <span>Date: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{card.date}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FiClock className="text-indigo-500 shrink-0 text-[11px]" />
                      <span>Timing: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{card.timing}</strong></span>
                    </div>
                    <div>
                      Carrier: <strong className="text-slate-800 dark:text-slate-200 font-semibold font-mono text-[11px]">{card.carrier}</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-medium">Canonical Leg</span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getStatusBadge(card.status)}`}>
                    ✓ {card.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Personal Trip: Transit Legs */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {personalTravelLegs.map((leg, i) => (
              <div 
                key={i} 
                className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-[#1a233a] p-4 flex flex-col justify-between gap-3 shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-black rounded uppercase tracking-wider border border-indigo-200 dark:border-indigo-800">
                      {leg.mode || "Transit"}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      Leg #{i + 1}
                    </span>
                  </div>

                  <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2 capitalize">
                    <span>{leg.from}</span>
                    <FiArrowRight className="text-indigo-500 shrink-0" />
                    <span>{leg.to}</span>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-2 font-medium space-y-0.5">
                    {leg.date && <div>Date: <span className="text-slate-800 dark:text-slate-200 font-semibold">{leg.date}</span></div>}
                    {(leg.startTime || leg.endTime) && (
                      <div>Time: <span className="text-slate-800 dark:text-slate-200 font-semibold">{leg.startTime} – {leg.endTime}</span></div>
                    )}
                    {leg.trainNumber && <div>Train/Flight: <span className="text-slate-800 dark:text-slate-200 font-mono font-semibold">{leg.trainNumber}</span></div>}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px] font-medium">Canonical Itinerary Leg</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-xs">
                    <FiCheck size={12} /> Scheduled
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. GROUP ROAD TRANSPORT (Campus Group Fleet) */}
      {isCampus && campusFleetPlan && (
        <div className="space-y-3 pt-2">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <span>Campus Group Fleet & Road Movement</span>
          </div>

          <div className="rounded-xl border border-indigo-200/90 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/30 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100 dark:border-indigo-900/40">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-black rounded uppercase tracking-wider">
                    Group Transport
                  </span>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Single Group Fleet Arrangement
                  </span>
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  {campusFleetPlan.vehiclesRequired}x {campusFleetPlan.comfort} {campusFleetPlan.vehicleType}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Total Travelers
                  </span>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {campusFleetPlan.totalTravelers} ({campusFleetPlan.studentsCount || 0} Students · {campusFleetPlan.teachersStaffCount || 0} Staff)
                  </div>
                </div>

                <span className={`px-2.5 py-1 text-[10px] uppercase font-black tracking-wider rounded-lg border ${getStatusBadge(campusFleetPlan.status || "CONFIRMED")}`}>
                  {(campusFleetPlan.status || "CONFIRMED").replace("_", " ")}
                </span>
              </div>
            </div>

            {/* Fleet Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white/90 dark:bg-slate-900/80 p-3 rounded-xl border border-indigo-100 dark:border-indigo-950">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Vehicle Type</span>
                <span className="font-extrabold text-slate-900 dark:text-white">{campusFleetPlan.vehicleType}</span>
              </div>
              <div className="bg-white/90 dark:bg-slate-900/80 p-3 rounded-xl border border-indigo-100 dark:border-indigo-950">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Vehicle Capacity</span>
                <span className="font-extrabold text-slate-900 dark:text-white">{campusFleetPlan.capacityPerVehicle} seats / vehicle</span>
              </div>
              <div className="bg-white/90 dark:bg-slate-900/80 p-3 rounded-xl border border-indigo-100 dark:border-indigo-950">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Vehicles Required</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{campusFleetPlan.vehiclesRequired}</span>
              </div>
              <div className="bg-white/90 dark:bg-slate-900/80 p-3 rounded-xl border border-indigo-100 dark:border-indigo-950">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Luggage</span>
                <span className="font-extrabold text-slate-900 dark:text-white">{campusFleetPlan.luggageCount || campusFleetPlan.totalTravelers} bags</span>
              </div>
            </div>

            {campusFleetPlan.notes && (
              <div className="text-xs text-indigo-800 dark:text-indigo-200/90 italic bg-indigo-100/50 dark:bg-indigo-950/60 p-2.5 rounded-xl border border-indigo-200/60 dark:border-indigo-800/40">
                Notes: "{campusFleetPlan.notes}"
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. RESOLVED OPERATIONAL ROUTE */}
      {resolvedRoute && (
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Resolved Operational Route
          </div>
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-[#1a233a] p-3.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <FiCompass className="text-indigo-600 dark:text-indigo-400 shrink-0" size={16} />
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold capitalize">
                <span>{resolvedRoute.origin}</span>
                <FiArrowRight size={13} className="text-indigo-500 shrink-0" />
                <span>{resolvedRoute.dest}</span>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              Resolved Route
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

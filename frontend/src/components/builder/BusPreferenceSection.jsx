import { useState, useMemo, useEffect } from "react";
import {
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiEdit3,
  FiInfo,
  FiMapPin,
  FiClock,
  FiUsers,
  FiArrowRight,
} from "react-icons/fi";
import { FaBus, FaUsers, FaCar } from "react-icons/fa";

const PERSONAL_CAR_OPTIONS = [
  { id: "Sedan", label: "Sedan", desc: "1–4 travelers (e.g. Dzire / Etios)", capacity: 4 },
  { id: "SUV", label: "SUV", desc: "4–6 travelers (e.g. Innova / Ertiga)", capacity: 6 },
  { id: "Luxury Sedan", label: "Luxury Sedan", desc: "Premium comfort (e.g. Camry / Mercedes)", capacity: 4 },
];

const PERSONAL_MINIBUS_OPTIONS = [
  { id: "Tempo Traveller (12-seater)", label: "Tempo Traveller (12-seater)", desc: "Up to 12 travelers", capacity: 12 },
  { id: "Tempo Traveller (16-seater)", label: "Tempo Traveller (16-seater)", desc: "Up to 16 travelers", capacity: 16 },
  { id: "Mini Coach (20-seater)", label: "Mini Coach (20-seater)", desc: "17–20 travelers", capacity: 20 },
];

const CAMPUS_VEHICLE_OPTIONS = [
  { id: "Luxury Coach", label: "Luxury Coach", desc: "Premium touring coach" },
  { id: "AC Coach", label: "AC Coach", desc: "Standard air-conditioned bus" },
  { id: "Standard Coach", label: "Standard Coach", desc: "Non-AC high capacity coach" },
  { id: "Traveller", label: "Tempo Traveller", desc: "Mini coach (12-20 seats)" },
];

const COMFORT_OPTIONS = ["AC", "Luxury", "Standard"];

export default function BusPreferenceSection({
  requirements = [],
  trip,
  onSavePreferences,
  isSaved = false,
}) {
  const isCampus =
    trip?.tripCategory === "CAMPUS" ||
    Boolean(trip?.campusConfig?.expectedParticipants && trip?.campusConfig.expectedParticipants > 8);

  // =========================================================================
  // CAMPUS GROUP TRANSPORT PLAN STATE (Used exclusively for Campus Trips)
  // =========================================================================
  const savedCampusPlan = trip?.campusTransportPlan || (isCampus ? trip?.campusConfig?.groupTransportPlan : null);

  const initialStudents = Number(
    savedCampusPlan?.studentsCount ||
    trip?.campusConfig?.expectedParticipants ||
    trip?.travelers ||
    200
  );

  const initialTeachers = Number(
    savedCampusPlan?.teachersStaffCount !== undefined
      ? savedCampusPlan.teachersStaffCount
      : 10
  );

  const [studentsCount, setStudentsCount] = useState(initialStudents);
  const [teachersStaffCount, setTeachersStaffCount] = useState(initialTeachers);
  const [vehicleType, setVehicleType] = useState(savedCampusPlan?.vehicleType || "Luxury Coach");
  const [comfort, setComfort] = useState(savedCampusPlan?.comfort || "AC");
  const [capacityPerVehicle, setCapacityPerVehicle] = useState(savedCampusPlan?.capacityPerVehicle || 25);
  const [luggageCount, setLuggageCount] = useState(
    savedCampusPlan?.luggageCount !== undefined
      ? savedCampusPlan.luggageCount
      : initialStudents + initialTeachers
  );
  const [notes, setNotes] = useState(savedCampusPlan?.notes || "");

  // Calculated live values for Campus fleet
  const totalTravelers = useMemo(() => {
    return Math.max(1, (Number(studentsCount) || 0) + (Number(teachersStaffCount) || 0));
  }, [studentsCount, teachersStaffCount]);

  const vehiclesRequired = useMemo(() => {
    const cap = Math.max(1, Number(capacityPerVehicle) || 25);
    return Math.ceil(totalTravelers / cap);
  }, [totalTravelers, capacityPerVehicle]);

  // Keep luggage count aligned when travelers count changes if not customized
  const handleStudentsChange = (val) => {
    const num = Math.max(0, Number(val) || 0);
    setStudentsCount(num);
    const newTotal = num + (Number(teachersStaffCount) || 0);
    setLuggageCount(newTotal);
  };

  const handleTeachersChange = (val) => {
    const num = Math.max(0, Number(val) || 0);
    setTeachersStaffCount(num);
    const newTotal = (Number(studentsCount) || 0) + num;
    setLuggageCount(newTotal);
  };

  const [isEditingCampus, setIsEditingCampus] = useState(
    !isSaved && !savedCampusPlan
  );

  const handleSaveCampusPlan = () => {
    const campusPlan = {
      tripId: trip?._id ? String(trip._id) : undefined,
      studentsCount: Number(studentsCount),
      teachersStaffCount: Number(teachersStaffCount),
      totalTravelers,
      vehicleType,
      comfort,
      capacityPerVehicle: Number(capacityPerVehicle),
      vehiclesRequired,
      luggageCount: Number(luggageCount),
      notes: notes.trim(),
      status: "PENDING",
    };

    // Propagate single group plan to all requirements
    const updatedReqs = requirements.map((req) => ({
      ...req,
      travelers: totalTravelers,
      groupTransportPlan: campusPlan,
      preferences: {
        vehicleType,
        comfort,
        capacityPerVehicle: Number(capacityPerVehicle),
        vehiclesRequired,
        studentsCount: Number(studentsCount),
        teachersStaffCount: Number(teachersStaffCount),
        seatCount: totalTravelers,
        luggageCount: Number(luggageCount),
        notes: notes.trim(),
      },
    }));

    onSavePreferences(updatedReqs, campusPlan);
    setIsEditingCampus(false);
  };

  // =========================================================================
  // PERSONAL TRIP STATE (Used exclusively for Personal Trips)
  // =========================================================================
  const defaultTravelers = Number(trip?.travelers || 2);
  const initialPersonalVehicle = useMemo(() => {
    if (defaultTravelers > 6) return "SUV";
    if (defaultTravelers > 4) return "SUV";
    return "Sedan";
  }, [defaultTravelers]);

  // arrangementChoice: "PRIVATE_CAR" | "PRIVATE_MINIBUS" | "TRAVELER_MANAGED"
  const [arrangementChoice, setArrangementChoice] = useState(() => {
    const raw = trip?.localTransportPreference?.arrangementType || trip?.localTransportPreference?.arrangement;
    if (raw === "TRAVELER_MANAGED" || raw === "TRAVELER_ARRANGED") return "TRAVELER_MANAGED";
    if (
      raw === "PRIVATE_MINIBUS" ||
      (trip?.localTransportPreference?.vehicleType &&
        /traveller|mini bus|coach/i.test(trip.localTransportPreference.vehicleType))
    ) {
      return "PRIVATE_MINIBUS";
    }
    return "PRIVATE_CAR";
  });

  const [personalPreferences, setPersonalPreferences] = useState(() => {
    const saved = trip?.localTransportPreference || requirements[0]?.preferences;
    const isBus = arrangementChoice === "PRIVATE_MINIBUS";
    return {
      vehicleType: saved?.vehicleType || (isBus ? "Tempo Traveller (12-seater)" : initialPersonalVehicle),
      comfort: saved?.comfort || "AC",
      seatCount: Number(saved?.seatCount || defaultTravelers),
      luggageCount: Number(saved?.luggageCount !== undefined ? saved.luggageCount : defaultTravelers),
      notes: saved?.notes || "",
    };
  });

  const [isEditingPersonal, setIsEditingPersonal] = useState(
    !isSaved && !trip?.localTransportPreference
  );

  const handleSelectArrangementChoice = (choice) => {
    setArrangementChoice(choice);
    if (choice === "PRIVATE_MINIBUS") {
      if (!/traveller|mini coach/i.test(personalPreferences.vehicleType)) {
        setPersonalPreferences((p) => ({ ...p, vehicleType: "Tempo Traveller (12-seater)" }));
      }
    } else if (choice === "PRIVATE_CAR") {
      if (/traveller|mini coach/i.test(personalPreferences.vehicleType)) {
        setPersonalPreferences((p) => ({ ...p, vehicleType: "Sedan" }));
      }
    }
  };

  const handleSavePersonal = (targetChoice) => {
    const chosenArrangement = targetChoice || arrangementChoice;
    const isSelf = chosenArrangement === "TRAVELER_MANAGED";

    const localPref = isSelf
      ? {
          arrangementType: "TRAVELER_MANAGED",
          arrangement: "TRAVELER_ARRANGED",
        }
      : {
          arrangementType: chosenArrangement,
          arrangement: "TRANSIX_COORDINATED",
          ...personalPreferences,
        };

    // The chosen vehicle arrangement applies to the entire trip (movements describe where/when vehicle is required)
    const updatedReqs = (requirements || []).map((req) => ({
      ...req,
      mode: "PRIVATE_VEHICLE",
      requirementType: req.requirementType || "LOCAL_TRANSPORT",
      arrangement: isSelf ? "TRAVELER_MANAGED" : chosenArrangement,
      pickupTime: req.pickupTime || req.requiredDepartureTime,
      preferences: isSelf
        ? {}
        : {
            arrangementType: chosenArrangement,
            ...personalPreferences,
          },
    }));

    onSavePreferences(updatedReqs, null, localPref);
    setIsEditingPersonal(false);
  };

  if (!requirements || requirements.length === 0) {
    return null;
  }

  // =========================================================================
  // VIEW RENDERER 1: CAMPUS GROUP TRIP TRANSPORT FLOW
  // =========================================================================
  if (isCampus) {
    const hasSavedCampus = !isEditingCampus && (isSaved || Boolean(savedCampusPlan));

    // SAVED READ-ONLY VIEW FOR CAMPUS TRIPS
    if (hasSavedCampus) {
      return (
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/40 dark:bg-indigo-950/20 p-5 space-y-4">
          {/* Header & Edit Action */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white text-sm shadow-xs">
                <FaBus />
              </span>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <span>BUS TRANSPORT</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                    Group Transport Plan
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Single fleet configuration for the entire study tour
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditingCampus(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-white dark:bg-[#131b2e] text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition shadow-2xs"
            >
              <FiEdit3 size={13} />
              <span>Edit Preferences</span>
            </button>
          </div>

          {/* Single Global Success Confirmation */}
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/40 p-3.5 flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs shrink-0">
              <FiCheck />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                ✓ Group Transport Preferences Saved
              </div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                Applies to all road movements throughout the trip. Operator will procure the required vehicle fleet.
              </div>
            </div>
          </div>

          {/* Group Fleet Summary Card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-4 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  FLEET REQUIREMENT
                </span>
                <div className="text-base font-black text-indigo-900 dark:text-indigo-200 mt-0.5">
                  {vehiclesRequired}x {comfort} {vehicleType} ({capacityPerVehicle} seats/coach)
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Total Travelers
                </span>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {totalTravelers} ({studentsCount} Students + {teachersStaffCount} Staff)
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div>
                <span className="text-slate-400 mr-1.5">Luggage:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{luggageCount} bags</span>
              </div>
              <div>
                <span className="text-slate-400 mr-1.5">Comfort:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{comfort}</span>
              </div>
              {notes && (
                <div className="w-full text-slate-500 dark:text-slate-400 italic pt-1 border-t border-slate-100 dark:border-slate-800">
                  "{notes}"
                </div>
              )}
            </div>
          </div>

          {/* Read-Only Trip Transport Movements List (NO separate forms or individual preferences tags) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                TRIP TRANSPORT MOVEMENTS ({requirements.length} bus movements identified)
              </span>
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                Covered by fleet ✓
              </span>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {requirements.map((req, idx) => (
                <div
                  key={req.id || idx}
                  className="rounded-lg border border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-[#131b2e]/80 p-2.5 text-xs flex items-center justify-between gap-2 shadow-3xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                      Day {req.day}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white truncate">
                      {req.from}
                    </span>
                    <FiArrowRight className="text-indigo-500 shrink-0" size={11} />
                    <span className="font-bold text-slate-900 dark:text-white truncate">
                      {req.to}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0 font-medium">
                    {req.requiredDepartureTime} → {req.requiredArrivalTime}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // ACTIVE INPUT FORM VIEW FOR CAMPUS TRIPS (Single One-Time Form)
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-4 sm:p-5 space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs">
              <FaBus />
            </span>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
              BUS TRANSPORT
            </h3>
            <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-[10px] font-extrabold text-indigo-700 dark:text-indigo-300">
              Group Transport Plan
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">
            Configure the bus fleet required for the entire campus group tour.
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
            <FiInfo size={11} className="shrink-0 text-slate-400" />
            <span>This single group transport plan applies to all {requirements.length} road movements in the itinerary.</span>
          </p>
        </div>

        {/* Inputs Form */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-4 shadow-2xs space-y-4">
          {/* Row 1: Student Count, Teacher Count & Total Travelers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Student Count
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={studentsCount}
                onChange={(e) => handleStudentsChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Teacher / Staff Count
              </label>
              <input
                type="number"
                min="0"
                max="200"
                value={teachersStaffCount}
                onChange={(e) => handleTeachersChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="rounded-xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800/60 p-2.5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                Total Travelers
              </span>
              <div className="text-base font-black text-indigo-900 dark:text-white">
                {totalTravelers}
              </div>
            </div>
          </div>

          {/* Row 2: Vehicle Preference & Comfort */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Vehicle Preference
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {CAMPUS_VEHICLE_OPTIONS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} ({v.desc})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Comfort
              </label>
              <select
                value={comfort}
                onChange={(e) => setComfort(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {COMFORT_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Capacity per Vehicle & Vehicles Required */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Capacity per Vehicle
              </label>
              <input
                type="number"
                min="5"
                max="100"
                value={capacityPerVehicle}
                onChange={(e) => setCapacityPerVehicle(Math.max(1, Number(e.target.value) || 1))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Standard coach capacity (25–50 seats)</span>
            </div>

            <div className="rounded-xl bg-purple-50/80 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-800/60 p-2.5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                Vehicles Required
              </span>
              <div className="text-xl font-black text-purple-900 dark:text-purple-200">
                {vehiclesRequired}
              </div>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">
                ceil({totalTravelers} / {capacityPerVehicle}) = {vehiclesRequired}
              </span>
            </div>
          </div>

          {/* Row 4: Luggage */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Luggage Count (bags)
            </label>
            <input
              type="number"
              min="0"
              max="2000"
              value={luggageCount}
              onChange={(e) => setLuggageCount(Math.max(0, Number(e.target.value) || 0))}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Row 5: Additional Requirements */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Additional Requirements (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Need bus microphone for faculty, undercarriage luggage space"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Read-Only Trip Transport Movements Preview */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              TRIP TRANSPORT MOVEMENTS ({requirements.length} bus movements identified)
            </span>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {requirements.map((req, idx) => (
              <div
                key={req.id || idx}
                className="rounded-lg border border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-[#131b2e]/80 p-2.5 text-xs flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                    Day {req.day}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white truncate">
                    {req.from}
                  </span>
                  <FiArrowRight className="text-indigo-500 shrink-0" size={11} />
                  <span className="font-bold text-slate-900 dark:text-white truncate">
                    {req.to}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0 font-medium">
                  {req.requiredDepartureTime} → {req.requiredArrivalTime}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSaveCampusPlan}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-3 text-xs font-black text-white shadow-xs transition active:scale-98 cursor-pointer"
          >
            <FiCheck className="text-sm" />
            <span>Save Group Transport Preferences</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW RENDERER 2: PERSONAL TRIP LOCAL TRANSPORT FLOW
  // =========================================================================
  const isPersonalSaved = !isEditingPersonal && (isSaved || Boolean(trip?.localTransportPreference));

  if (isPersonalSaved) {
    const rawArr =
      trip?.localTransportPreference?.arrangementType ||
      trip?.localTransportPreference?.arrangement ||
      arrangementChoice;
    const isSelfManaged = rawArr === "TRAVELER_MANAGED" || rawArr === "TRAVELER_ARRANGED";
    const isMiniBus = rawArr === "PRIVATE_MINIBUS";

    return (
      <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/40 dark:bg-indigo-950/20 p-5 space-y-4">
        {/* Header & Edit Action */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white text-sm shadow-xs">
              {isMiniBus ? <FaBus /> : isSelfManaged ? <FaUsers /> : <FaCar />}
            </span>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <span>LOCAL TRANSPORT</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  {isSelfManaged ? "Traveler Managed" : isMiniBus ? "Private Mini Bus" : "Private Car"}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isSelfManaged ? "Self-arranged for all movements" : "Single vehicle arrangement for the entire trip"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditingPersonal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-white dark:bg-[#131b2e] text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition shadow-2xs cursor-pointer"
          >
            <FiEdit3 size={13} />
            <span>Edit Preferences</span>
          </button>
        </div>

        {/* Global Arrangement Card */}
        {!isSelfManaged ? (
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/40 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/60 dark:border-emerald-800/60 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs shrink-0">
                  <FiCheck />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    {isMiniBus ? "PRIVATE MINI BUS ARRANGEMENT" : "PRIVATE CAR ARRANGEMENT"}
                  </div>
                  <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                    {personalPreferences.vehicleType} • {personalPreferences.comfort}
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Scope
                </span>
                <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  Entire Trip ({personalPreferences.seatCount} travelers)
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <div>
                <span className="text-slate-400 mr-1.5 font-medium">Capacity:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{personalPreferences.seatCount} seats</span>
              </div>
              <div>
                <span className="text-slate-400 mr-1.5 font-medium">Luggage:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{personalPreferences.luggageCount} bags</span>
              </div>
              <div>
                <span className="text-slate-400 mr-1.5 font-medium">Comfort:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{personalPreferences.comfort}</span>
              </div>
              {personalPreferences.notes && (
                <div className="w-full text-[11px] italic text-slate-500 dark:text-slate-400 pt-1 border-t border-emerald-200/40 dark:border-emerald-800/40">
                  Notes: "{personalPreferences.notes}"
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-4 flex items-start gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-600 text-white text-xs shrink-0 mt-0.5">
              <FiCheck />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                Transport arranged by traveler (Self-Managed)
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                You will arrange local rides independently using Ola, Uber, auto, taxi, rental car, or public transport. No Transix operator vehicle booking is required. All scheduled movements and activity timings are strictly preserved.
              </p>
            </div>
          </div>
        )}

        {/* Scheduled Transport Movements List (All movements under ONE vehicle arrangement) */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              SCHEDULED MOVEMENTS ({requirements.length})
            </span>
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
              {!isSelfManaged ? `Covered by ${personalPreferences.vehicleType} ✓` : "Traveler managed ✓"}
            </span>
          </div>

          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {requirements.map((req, idx) => (
              <div
                key={req.id || idx}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                      Day {req.day}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white truncate">
                      {req.from}
                    </span>
                    <FiArrowRight className="text-indigo-500 shrink-0" size={11} />
                    <span className="font-bold text-slate-900 dark:text-white truncate">
                      {req.to}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    {req.date && <span>{req.date}</span>}
                    {req.date && <span>•</span>}
                    <span>{req.requiredDepartureTime} → {req.requiredArrivalTime}</span>
                  </div>

                  <div className="mt-1 text-[11px] font-semibold">
                    {!isSelfManaged ? (
                      <span className="text-indigo-600 dark:text-indigo-400">
                        Transport: Private Vehicle · {personalPreferences.vehicleType} · {personalPreferences.comfort}
                      </span>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">
                        Transport: Traveler managed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Active Personal Preference Selection View
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs">
            <FaCar />
          </span>
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
            LOCAL TRANSPORT
          </h3>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">
          How would you like to manage local transport for your trip?
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          Choose once for the entire trip. All scheduled movements between activities and hotels are covered under this arrangement.
        </p>
      </div>

      {/* 3 Main Choices: 1. Private Car, 2. Private Mini Bus, 3. Traveler Managed */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Select Transport Arrangement
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Option 1: Private Car */}
          <button
            type="button"
            onClick={() => handleSelectArrangementChoice("PRIVATE_CAR")}
            className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
              arrangementChoice === "PRIVATE_CAR"
                ? "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/50 text-slate-900 dark:text-white ring-1 ring-indigo-500/30"
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold flex items-center gap-1.5">
                <FaCar className="text-indigo-600 dark:text-indigo-400" />
                <span>1. Private Car</span>
              </span>
              <span
                className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                  arrangementChoice === "PRIVATE_CAR"
                    ? "border-indigo-600 bg-indigo-600 text-white text-[10px]"
                    : "border-slate-300 dark:border-slate-600"
                }`}
              >
                {arrangementChoice === "PRIVATE_CAR" && <FiCheck />}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Private Sedan or SUV dedicated to your party for all movements throughout the trip.
            </p>
          </button>

          {/* Option 2: Private Mini Bus */}
          <button
            type="button"
            onClick={() => handleSelectArrangementChoice("PRIVATE_MINIBUS")}
            className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
              arrangementChoice === "PRIVATE_MINIBUS"
                ? "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/50 text-slate-900 dark:text-white ring-1 ring-indigo-500/30"
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold flex items-center gap-1.5">
                <FaBus className="text-indigo-600 dark:text-indigo-400" />
                <span>2. Private Mini Bus</span>
              </span>
              <span
                className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                  arrangementChoice === "PRIVATE_MINIBUS"
                    ? "border-indigo-600 bg-indigo-600 text-white text-[10px]"
                    : "border-slate-300 dark:border-slate-600"
                }`}
              >
                {arrangementChoice === "PRIVATE_MINIBUS" && <FiCheck />}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Tempo Traveller or Mini Coach for larger family or friend groups traveling together.
            </p>
          </button>

          {/* Option 3: I'll manage local transport myself */}
          <button
            type="button"
            onClick={() => handleSelectArrangementChoice("TRAVELER_MANAGED")}
            className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
              arrangementChoice === "TRAVELER_MANAGED"
                ? "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/50 text-slate-900 dark:text-white ring-1 ring-indigo-500/30"
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold flex items-center gap-1.5">
                <FaUsers className="text-slate-600 dark:text-slate-400" />
                <span>3. I'll manage myself</span>
              </span>
              <span
                className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                  arrangementChoice === "TRAVELER_MANAGED"
                    ? "border-indigo-600 bg-indigo-600 text-white text-[10px]"
                    : "border-slate-300 dark:border-slate-600"
                }`}
              >
                {arrangementChoice === "TRAVELER_MANAGED" && <FiCheck />}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Use Ola, Uber, auto, taxi, rental, or public transport. No Transix vehicle booking.
            </p>
          </button>
        </div>
      </div>

      {/* Dynamic Content based on Choice */}
      {arrangementChoice !== "TRAVELER_MANAGED" ? (
        /* ================= SINGLE VEHICLE PREFERENCE FORM ================= */
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-4 space-y-4 shadow-2xs">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {arrangementChoice === "PRIVATE_MINIBUS" ? "Mini Bus" : "Car"} Preferences (Applies to Entire Trip)
          </div>

          {/* Vehicle Type Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Vehicle Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(arrangementChoice === "PRIVATE_MINIBUS" ? PERSONAL_MINIBUS_OPTIONS : PERSONAL_CAR_OPTIONS).map(
                (v) => {
                  const isSelected = personalPreferences.vehicleType === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setPersonalPreferences((p) => ({ ...p, vehicleType: v.id }))}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition cursor-pointer ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/30"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <span className="text-xs font-extrabold">{v.label}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{v.desc}</span>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Comfort Preference */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Comfort Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {COMFORT_OPTIONS.map((c) => {
                const isSelected = personalPreferences.comfort === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setPersonalPreferences((p) => ({ ...p, comfort: c }))}
                    className={`py-2 rounded-xl border text-center text-xs font-extrabold transition cursor-pointer ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/30"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Travelers & Luggage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Travelers / Seats Required
              </label>
              <input
                type="number"
                min="1"
                max={arrangementChoice === "PRIVATE_MINIBUS" ? 30 : 8}
                value={personalPreferences.seatCount}
                onChange={(e) => {
                  const val = Math.max(1, Number(e.target.value) || 1);
                  setPersonalPreferences((p) => ({ ...p, seatCount: val }));
                }}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Luggage Count (bags)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={personalPreferences.luggageCount}
                onChange={(e) => {
                  const val = Math.max(0, Number(e.target.value) || 0);
                  setPersonalPreferences((p) => ({ ...p, luggageCount: val }));
                }}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Additional Requirements (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Child safety seat, large boot space, english-speaking driver"
              value={personalPreferences.notes}
              onChange={(e) => setPersonalPreferences((p) => ({ ...p, notes: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => handleSavePersonal(arrangementChoice)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-3 text-xs font-black text-white shadow-xs transition active:scale-98 cursor-pointer"
            >
              <FiCheck className="text-sm" />
              <span>
                Save {arrangementChoice === "PRIVATE_MINIBUS" ? "Mini Bus" : "Car"} Arrangement
              </span>
            </button>
          </div>
        </div>
      ) : (
        /* ================= TRAVELER ARRANGES TRANSPORT CARD ================= */
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-4 space-y-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
              <FiInfo size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                You're managing local transport yourself
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Transix will not create an operator vehicle booking. You can use Ola, Uber, auto rickshaw, taxi, rental car, or public transport as convenient.
              </p>
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
                ✓ All scheduled activities, arrival times, and itinerary movements remain intact.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => handleSavePersonal("TRAVELER_MANAGED")}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-3 text-xs font-black text-white shadow-xs transition active:scale-98 cursor-pointer"
            >
              <FiCheck className="text-sm" />
              <span>Confirm Self-Managed Transport</span>
            </button>
          </div>
        </div>
      )}

      {/* Read-Only Trip Transport Movements Preview */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            SCHEDULED MOVEMENTS ({requirements.length} road movements identified)
          </span>
        </div>

        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
          {requirements.map((req, idx) => (
            <div
              key={req.id || idx}
              className="rounded-lg border border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-[#131b2e]/80 p-2.5 text-xs flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                  Day {req.day}
                </span>
                <span className="font-bold text-slate-900 dark:text-white truncate">
                  {req.from}
                </span>
                <FiArrowRight className="text-indigo-500 shrink-0" size={11} />
                <span className="font-bold text-slate-900 dark:text-white truncate">
                  {req.to}
                </span>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0 font-medium">
                {req.requiredDepartureTime} → {req.requiredArrivalTime}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

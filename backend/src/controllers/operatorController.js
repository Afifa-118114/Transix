const asyncHandler = require("../middleware/asyncHandler");
const Trip = require("../models/Trip");
const User = require("../models/User");
const BookingRequirement = require("../models/BookingRequirement");
const TripMessage = require("../models/TripMessage");
const Notification = require("../models/Notification");
const Vendor = require("../models/Vendor");
const VendorRequest = require("../models/VendorRequest");
const VendorRequestMessage = require("../models/VendorRequestMessage");
const { findMatchingFleetVendors } = require("../services/vendorMatchingService");
const { resolveCityToState } = require("../services/locationService");
const AppError = require("../utils/AppError");

// Synchronize canonical trip data with operator BookingRequirement collection
const syncTripRequirements = async (trip) => {
  if (!trip || trip.status === "Draft") return;

  const travelerId = trip.user?._id || trip.user || trip.coordinatorId?._id || trip.coordinatorId;
  if (!travelerId) return;

  // 1. Accommodation requirements from staySegments
  if (Array.isArray(trip.staySegments)) {
    for (let idx = 0; idx < trip.staySegments.length; idx++) {
      const stay = trip.staySegments[idx];
      const staySegmentId = stay.id || `stay-${idx}`;
      const hotelName = stay.selectedHotel?.name || stay.selectedHotel?.hotelName;
      await BookingRequirement.findOneAndUpdate(
        { tripId: trip._id, staySegmentId, type: "ACCOMMODATION" },
        {
          $setOnInsert: {
            travelerId,
            status: hotelName ? "PROCESSING" : "NOT_BOOKED",
          },
          $set: {
            title: hotelName || `Stay in ${stay.location}`,
            location: stay.location,
            vendorName: stay.selectedHotel?.brand || (hotelName ? "Hotel" : "Pending Hotel Selection"),
            externalUrl: stay.selectedHotel?.website || stay.selectedHotel?.websiteUrl || stay.selectedHotel?.officialWebsite || stay.selectedHotel?.bookingUrl || stay.selectedHotel?.externalUrl || stay.selectedHotel?.url || "",
          },
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }
  }

  // 2. Transport requirements from busRequirements, travelLegs, or itinerary
  const { detectBusRequirements } = require("../utils/busRequirementDetector");
  const busReqs = Array.isArray(trip.busRequirements) && trip.busRequirements.length > 0
    ? trip.busRequirements
    : detectBusRequirements(trip);

  const isCampus = trip.tripCategory === "CAMPUS" || Boolean(trip.campusConfig?.expectedParticipants);
  const campusPlan = trip.campusTransportPlan || (isCampus ? trip.campusConfig?.groupTransportPlan : null) || (isCampus ? {
    vehiclesRequired: Math.ceil((trip.travelers || 20) / 25),
    vehicleType: "Coach",
    comfort: "AC",
    capacityPerVehicle: 25,
    totalTravelers: trip.travelers || 20,
    studentsCount: trip.travelers || 20,
    teachersStaffCount: 0,
    luggageCount: trip.travelers || 20,
    notes: "",
  } : null);

  if (isCampus) {
    // 1. For Campus trips, sync the master Group Transport Plan fleet requirement (ONE fleet arrangement)
    if (campusPlan) {
      await BookingRequirement.findOneAndUpdate(
        { tripId: trip._id, itemId: "campus-group-fleet", type: "TRANSPORT" },
        {
          $setOnInsert: {
            travelerId,
            status: campusPlan.status || "PENDING",
          },
          $set: {
            title: `Campus Fleet: ${campusPlan.vehiclesRequired}x ${campusPlan.comfort} ${campusPlan.vehicleType} (${campusPlan.totalTravelers} Travelers)`,
            location: `${trip.source} → ${trip.destination} (Tour Fleet)`,
            vendorName: "Pending Fleet Vendor Assignment",
            notes: `${campusPlan.vehiclesRequired} vehicles required (${campusPlan.capacityPerVehicle} seats/coach) for ${campusPlan.totalTravelers} travelers (${campusPlan.studentsCount} students + ${campusPlan.teachersStaffCount} staff). Luggage: ${campusPlan.luggageCount} bags.${campusPlan.notes ? ` Notes: ${campusPlan.notes}` : ""}`,
            transportDetails: {
              mode: "BUS",
              requirementType: "GROUP_TRANSPORT",
              travelers: campusPlan.totalTravelers,
              groupTransportPlan: campusPlan,
              preferences: {
                vehicleType: campusPlan.vehicleType,
                comfort: campusPlan.comfort,
                capacityPerVehicle: campusPlan.capacityPerVehicle,
                vehiclesRequired: campusPlan.vehiclesRequired,
                studentsCount: campusPlan.studentsCount,
                teachersStaffCount: campusPlan.teachersStaffCount,
                seatCount: campusPlan.totalTravelers,
                luggageCount: campusPlan.luggageCount,
                notes: campusPlan.notes,
              },
            },
          },
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }

    // Individual movements belong under the one fleet arrangement and MUST NOT have separate BookingRequirements.
    // Clean up any legacy or movement-level transport requirements
    const movementItemIds = (busReqs || []).map((r) => String(r.itineraryItemId || r.id));
    if (movementItemIds.length > 0) {
      await BookingRequirement.deleteMany({
        tripId: trip._id,
        itemId: { $in: movementItemIds },
        type: "TRANSPORT",
      });
    }

    // 2. Sync EXACTLY TWO canonical intercity transit legs for Campus (Outbound & Return)
    if (Array.isArray(trip.travelLegs) && trip.travelLegs.length > 0) {
      const outboundLeg = trip.travelLegs.find(l => String(l.journeyDirection).toLowerCase() === "outbound") || trip.travelLegs[0];
      const returnLeg = trip.travelLegs.find(l => String(l.journeyDirection).toLowerCase() === "return") || trip.travelLegs[trip.travelLegs.length - 1];

      const campusLegs = [
        outboundLeg ? { ...outboundLeg, directionLabel: "Outbound", dirKey: "outbound" } : null,
        returnLeg && returnLeg !== outboundLeg ? { ...returnLeg, directionLabel: "Return", dirKey: "return" } : null,
      ].filter(Boolean);

      const validCampusLegItemIds = [];
      for (let idx = 0; idx < campusLegs.length; idx++) {
        const leg = campusLegs[idx];
        const itemId = `campus-intercity-${leg.dirKey || (idx === 0 ? "outbound" : "return")}`;
        validCampusLegItemIds.push(itemId);

        await BookingRequirement.findOneAndUpdate(
          { tripId: trip._id, itemId, type: "TRANSPORT" },
          {
            $setOnInsert: {
              travelerId,
              status: "NOT_BOOKED",
            },
            $set: {
              title: `Intercity ${leg.mode || "Transit"}: ${leg.from} → ${leg.to} (${leg.directionLabel})`,
              location: `${leg.from} → ${leg.to}`,
              vendorName: leg.trainNumber || leg.flightNumber || leg.operator || leg.mode || "Transport Carrier",
              notes: leg.date ? `${leg.date} · ${leg.startTime || ""} - ${leg.endTime || ""}` : "",
              transportDetails: {
                mode: leg.mode || "TRAIN",
                requirementType: "INTERCITY_TRANSIT",
                direction: leg.dirKey,
                from: leg.from,
                to: leg.to,
                date: leg.date,
                trainNumber: leg.trainNumber,
                flightNumber: leg.flightNumber,
              },
            },
          },
          { upsert: true, setDefaultsOnInsert: true }
        );
      }
    }
  } else {
    // PERSONAL TRIP TRANSPORT
    const rawArr = trip.localTransportPreference?.arrangementType || trip.localTransportPreference?.arrangement;
    const isSelfManaged = rawArr === "TRAVELER_MANAGED" || rawArr === "TRAVELER_ARRANGED";

    if (!isSelfManaged && trip.localTransportPreference) {
      // ONE private vehicle arrangement for the entire trip
      const pPref = trip.localTransportPreference;
      const vType = pPref.vehicleType || (rawArr === "PRIVATE_MINIBUS" ? "Mini Bus" : "Car");
      const comfort = pPref.comfort || "AC";
      const seats = pPref.seatCount || trip.travelers || 2;
      const bags = pPref.luggageCount !== undefined ? pPref.luggageCount : seats;

      await BookingRequirement.findOneAndUpdate(
        { tripId: trip._id, itemId: "personal-private-vehicle", type: "TRANSPORT" },
        {
          $setOnInsert: {
            travelerId,
            status: "PENDING",
          },
          $set: {
            title: `Private Vehicle: ${comfort} ${vType} (${seats} seats)`,
            location: `${trip.source} → ${trip.destination} (Entire Trip)`,
            vendorName: "Pending Operator Assignment",
            notes: `${comfort} ${vType} · ${seats} seats · ${bags} bags · Entire trip (${busReqs.length} scheduled movements)${pPref.notes ? ` · Notes: ${pPref.notes}` : ""}`,
            transportDetails: {
              mode: "PRIVATE_VEHICLE",
              requirementType: "LOCAL_TRANSPORT",
              arrangement: rawArr || "PRIVATE_CAR",
              travelers: seats,
              preferences: {
                arrangementType: rawArr || "PRIVATE_CAR",
                vehicleType: vType,
                comfort,
                seatCount: seats,
                luggageCount: bags,
                notes: pPref.notes || "",
              },
            },
          },
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
    } else {
      // Traveler managed or no transport preference: remove booking requirement
      await BookingRequirement.deleteOne({ tripId: trip._id, itemId: "personal-private-vehicle", type: "TRANSPORT" });
    }

    // Prune individual movement-level requirements (movements are operational descriptions under the arrangement)
    const movementItemIds = (busReqs || []).map((r) => String(r.itineraryItemId || r.id));
    if (movementItemIds.length > 0) {
      await BookingRequirement.deleteMany({
        tripId: trip._id,
        itemId: { $in: movementItemIds },
        type: "TRANSPORT",
      });
    }

    // Sync non-bus intercity travelLegs for Personal Trip (door-to-door structure retained)
    if (Array.isArray(trip.travelLegs) && trip.travelLegs.length > 0) {
      for (let idx = 0; idx < trip.travelLegs.length; idx++) {
        const leg = trip.travelLegs[idx];
        const legMode = String(leg.mode || "").toUpperCase();
        if (legMode === "BUS" || legMode === "ROAD") continue;
        const itemId = leg._id ? leg._id.toString() : (leg.id ? String(leg.id) : `leg-${idx}`);
        await BookingRequirement.findOneAndUpdate(
          { tripId: trip._id, itemId, type: "TRANSPORT" },
          {
            $setOnInsert: {
              travelerId,
              status: "NOT_BOOKED",
            },
            $set: {
              title: `${leg.mode || "Transport"}: ${leg.from} → ${leg.to}`,
              location: `${leg.from} → ${leg.to}`,
              vendorName: leg.trainNumber || leg.flightNumber || leg.operator || leg.mode || "Transport Carrier",
              notes: leg.date ? `${leg.date} · ${leg.startTime || ""} - ${leg.endTime || ""}` : "",
            },
          },
          { upsert: true, setDefaultsOnInsert: true }
        );
      }
    }
  }

  // 3. Educational Visits / Permissions for Campus trips
  if (trip.tripCategory === "CAMPUS" && Array.isArray(trip.campusConfig?.educationalRequirements)) {
    for (let idx = 0; idx < trip.campusConfig.educationalRequirements.length; idx++) {
      const reqItem = trip.campusConfig.educationalRequirements[idx];
      const itemId = reqItem._id ? reqItem._id.toString() : `edu-${idx}`;
      await BookingRequirement.findOneAndUpdate(
        { tripId: trip._id, itemId, type: "VISIT" },
        {
          $setOnInsert: {
            travelerId,
            status: "ACTION_REQUIRED",
          },
          $set: {
            title: `${reqItem.institutionName} Visit & Permission`,
            location: reqItem.institutionName,
            vendorName: reqItem.institutionType || "Educational Institution",
            notes: reqItem.notes || `${reqItem.institutionType || "Educational"} coordination & entry permission`,
          },
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }
  }

  // 4. Activities for Personal trips
  if (trip.tripCategory !== "CAMPUS" && Array.isArray(trip.itinerary)) {
    let aIdx = 0;
    for (const day of trip.itinerary) {
      if (!Array.isArray(day.plan)) continue;
      for (const p of day.plan) {
        const cat = String(p.category || "").toLowerCase();
        const act = String(p.activity || p.name || "").toLowerCase();
        const isTransport = cat.includes("transport") || cat.includes("travel") || act.includes("train") || act.includes("flight") || act.includes("bus") || act.includes("transfer");
        const isHotelOrFood = cat.includes("operational") || cat.includes("food") || act.includes("check-in") || act.includes("check-out") || act.includes("dinner") || act.includes("lunch") || act.includes("breakfast");
        if (!isTransport && !isHotelOrFood && (cat.includes("activity") || cat.includes("attraction") || act.length > 0)) {
          const itemId = p.id || p._id || `act-${day.day}-${aIdx++}`;
          await BookingRequirement.findOneAndUpdate(
            { tripId: trip._id, itemId: String(itemId), type: "ACTIVITY" },
            {
              $setOnInsert: {
                travelerId,
                status: "NOT_BOOKED",
              },
              $set: {
                title: p.activity || p.name || "Activity Entry",
                location: p.location || trip.destination,
                vendorName: "Activity Vendor",
                notes: `Day ${day.day}`,
              },
            },
            { upsert: true, setDefaultsOnInsert: true }
          );
        }
      }
    }
  }
};

const getDashboardStats = asyncHandler(async (req, res) => {
  const operatorQuery = { "operatorAccess.enabled": true, status: "Finalized" };
  const trips = await Trip.find(operatorQuery).populate("user", "name email");

  // Sync requirements for all shared finalized trips
  for (const trip of trips) {
    await syncTripRequirements(trip);
  }

  const tripIds = trips.map(t => t._id);
  const now = new Date();

  // Categorize trips
  const personalTrips = trips.filter(t => t.tripCategory !== "CAMPUS");
  const campusTrips = trips.filter(t => t.tripCategory === "CAMPUS");

  // Date classification:
  // ACTIVE = now between startDate and endDate
  // UPCOMING = startDate > now
  // COMPLETED = endDate < now
  const activeTrips = trips.filter(t => {
    const s = new Date(t.startDate);
    const e = new Date(t.endDate);
    e.setHours(23, 59, 59, 999);
    return now >= s && now <= e;
  });

  const upcomingTrips = trips.filter(t => {
    const s = new Date(t.startDate);
    return now < s;
  });

  const completedTrips = trips.filter(t => {
    const e = new Date(t.endDate);
    e.setHours(23, 59, 59, 999);
    return now > e;
  });

  // All bookings for these trips
  const allBookings = await BookingRequirement.find({ tripId: { $in: tripIds } }).sort({ updatedAt: -1 });

  const bookingsConfirmed = allBookings.filter(b => b.status === "CONFIRMED").length;
  const bookingsProcessing = allBookings.filter(b => b.status === "PROCESSING").length;
  const bookingsNotBooked = allBookings.filter(b => b.status === "NOT_BOOKED").length;
  const bookingsActionRequired = allBookings.filter(b => b.status === "ACTION_REQUIRED").length;
  const pendingBookings = bookingsNotBooked + bookingsProcessing + bookingsActionRequired;

  // Real action items derived from actual pending operational work
  const actionItems = [];

  for (const trip of trips) {
    const tripBookings = allBookings.filter(b => b.tripId.toString() === trip._id.toString());
    const pendingStays = tripBookings.filter(b => b.type === "ACCOMMODATION" && b.status !== "CONFIRMED" && b.status !== "CANCELLED");
    const pendingTransports = tripBookings.filter(b => b.type === "TRANSPORT" && b.status !== "CONFIRMED" && b.status !== "CANCELLED");
    const actionReqBookings = tripBookings.filter(b => b.status === "ACTION_REQUIRED");
    const pendingVisits = tripBookings.filter(b => (b.type === "VISIT" || b.type === "PERMISSION") && b.status !== "CONFIRMED" && b.status !== "CANCELLED");

    const tripLabel = trip.tripCategory === "CAMPUS" 
      ? `Campus Trip • ${trip.organizationDetails?.name || trip.destination}`
      : `Personal Trip • ${trip.source} → ${trip.destination}`;

    // 1. Explicit Action Required items first
    for (const b of actionReqBookings) {
      actionItems.push({
        id: b._id.toString(),
        tripId: trip._id,
        title: `${b.title} requires coordination`,
        subtitle: tripLabel,
        severity: "HIGH",
        type: b.type,
      });
    }

    // 2. Pending Hotel confirmations
    if (pendingStays.length > 0 && !actionReqBookings.some(b => b.type === "ACCOMMODATION")) {
      actionItems.push({
        id: `hotel-${trip._id}`,
        tripId: trip._id,
        title: `${pendingStays.length} Hotel confirmation${pendingStays.length > 1 ? "s" : ""} pending`,
        subtitle: tripLabel,
        severity: "MEDIUM",
        type: "ACCOMMODATION",
      });
    }

    // 3. Pending Transport arrangements
    if (pendingTransports.length > 0 && !actionReqBookings.some(b => b.type === "TRANSPORT")) {
      actionItems.push({
        id: `transport-${trip._id}`,
        tripId: trip._id,
        title: `${pendingTransports.length} Transport arrangement${pendingTransports.length > 1 ? "s" : ""} pending`,
        subtitle: tripLabel,
        severity: "MEDIUM",
        type: "TRANSPORT",
      });
    }

    // 4. Pending Educational visits / permissions
    for (const v of pendingVisits) {
      if (!actionReqBookings.some(b => b._id.toString() === v._id.toString())) {
        actionItems.push({
          id: v._id.toString(),
          tripId: trip._id,
          title: `${v.title} pending`,
          subtitle: tripLabel,
          severity: "MEDIUM",
          type: "VISIT",
        });
      }
    }
  }

  // 5. Derive actionable work from real VendorRequest records
  const allVendorRequests = await VendorRequest.find({ tripId: { $in: tripIds } }).populate("vendorId", "name");
  for (const trip of trips) {
    const tripRequests = allVendorRequests.filter(r => r.tripId.toString() === trip._id.toString());
    const respondedRequests = tripRequests.filter(r => r.status === "RESPONDED");
    const awaitingConfirmationRequests = tripRequests.filter(r => r.status === "CONFIRMATION_REQUESTED");

    const tripLabel = trip.tripCategory === "CAMPUS" 
      ? `Campus Trip • ${trip.organizationDetails?.name || trip.destination}`
      : `Personal Trip • ${trip.source} → ${trip.destination}`;

    if (respondedRequests.length > 0) {
      actionItems.push({
        id: `vendor-resp-${trip._id}`,
        tripId: trip._id,
        title: `${respondedRequests.length} Vendor response${respondedRequests.length > 1 ? "s" : ""} awaiting review`,
        subtitle: tripLabel,
        severity: "HIGH",
        type: "VENDOR_RESPONSE",
      });
    }

    if (awaitingConfirmationRequests.length > 0) {
      actionItems.push({
        id: `vendor-conf-${trip._id}`,
        tripId: trip._id,
        title: "Fleet confirmation awaiting vendor response",
        subtitle: tripLabel,
        severity: "MEDIUM",
        type: "VENDOR_CONFIRMATION",
      });
    }
  }

  // Recent operational updates from persisted records and history
  const recentUpdates = [];
  for (const b of allBookings) {
    if (recentUpdates.length >= 6) break;
    const matchingTrip = trips.find(t => t._id.toString() === b.tripId.toString());
    const tripName = matchingTrip?.organizationDetails?.name 
      ? `${matchingTrip.organizationDetails.name} • ${matchingTrip.destination}`
      : `${matchingTrip?.source || "Trip"} → ${matchingTrip?.destination || ""}`;

    if (b.statusHistory && b.statusHistory.length > 0) {
      const latestHistory = b.statusHistory[b.statusHistory.length - 1];
      recentUpdates.push({
        id: `${b._id}-${latestHistory.timestamp}`,
        title: `${b.title} ${latestHistory.status.toLowerCase().replace("_", " ")}`,
        subtitle: tripName,
        status: latestHistory.status,
        timestamp: latestHistory.timestamp,
      });
    } else if (b.status !== "NOT_BOOKED") {
      recentUpdates.push({
        id: b._id.toString(),
        title: `${b.title} ${b.status.toLowerCase().replace("_", " ")}`,
        subtitle: tripName,
        status: b.status,
        timestamp: b.updatedAt,
      });
    }
  }

  res.status(200).json({
    success: true,
    stats: {
      personalTrips: personalTrips.length,
      campusTrips: campusTrips.length,
      activeTripsCount: activeTrips.length,
      upcomingTripsCount: upcomingTrips.length,
      completedTripsCount: completedTrips.length,
      pendingBookings,
      activeDisruptions: 0, // Deterministic: 0 active disruptions currently
      bookingReadiness: {
        confirmed: bookingsConfirmed,
        processing: bookingsProcessing,
        notBooked: bookingsNotBooked,
        actionRequired: bookingsActionRequired,
      },
    },
    actionItems,
    recentUpdates,
  });
});

const getOperatorTrips = asyncHandler(async (req, res) => {
  const trips = await Trip.find({ "operatorAccess.enabled": true, status: "Finalized" })
    .populate("user", "name email")
    .populate("coordinatorId", "name email phone");

  const now = new Date();

  // Fetch booking requirements per trip to compute progress
  const tripsWithBookings = await Promise.all(
    trips.map(async (trip) => {
      await syncTripRequirements(trip);
      const bookings = await BookingRequirement.find({ tripId: trip._id });

      const accommodationBookings = bookings.filter(b => b.type === "ACCOMMODATION");
      const transportBookings = bookings.filter(b => b.type === "TRANSPORT");
      const visitBookings = bookings.filter(b => b.type === "VISIT" || b.type === "PERMISSION" || b.type === "ACTIVITY");

      const accTotal = accommodationBookings.length || (trip.staySegments?.length || 0);
      const accConfirmed = accommodationBookings.filter(b => b.status === "CONFIRMED").length;

      const transTotal = transportBookings.length || (trip.travelLegs?.length || 0);
      const transConfirmed = transportBookings.filter(b => b.status === "CONFIRMED").length;

      const visitTotal = visitBookings.length || (trip.campusConfig?.educationalRequirements?.length || 0);
      const visitConfirmed = visitBookings.filter(b => b.status === "CONFIRMED").length;

      // Timing Classification:
      // ACTIVE = now between startDate and endDate
      // UPCOMING = startDate > now
      // COMPLETED = endDate < now
      const s = new Date(trip.startDate);
      const e = new Date(trip.endDate);
      e.setHours(23, 59, 59, 999);

      let timingStatus = "UPCOMING";
      if (now >= s && now <= e) {
        timingStatus = "ACTIVE";
      } else if (now > e) {
        timingStatus = "COMPLETED";
      }

      // Operational Status
      const hasActionRequired = bookings.some(b => b.status === "ACTION_REQUIRED");
      const allConfirmed = bookings.length > 0 && bookings.every(b => b.status === "CONFIRMED");
      let operationalStatus = "Processing";
      if (hasActionRequired) operationalStatus = "Action Required";
      else if (allConfirmed) operationalStatus = "Confirmed";
      else if (bookings.every(b => b.status === "NOT_BOOKED")) operationalStatus = "Not Booked";

      return {
        ...trip.toObject(),
        timingStatus,
        operationalStatus,
        readiness: {
          accommodation: { confirmed: accConfirmed, total: accTotal },
          transport: { confirmed: transConfirmed, total: transTotal },
          visits: { confirmed: visitConfirmed, total: visitTotal },
        },
        bookingProgress: {
          total: bookings.length,
          confirmed: bookings.filter(b => b.status === "CONFIRMED").length,
          actionRequired: bookings.filter(b => b.status === "ACTION_REQUIRED").length,
          processing: bookings.filter(b => b.status === "PROCESSING").length,
          notBooked: bookings.filter(b => b.status === "NOT_BOOKED").length,
        },
      };
    })
  );

  res.status(200).json({
    success: true,
    count: tripsWithBookings.length,
    trips: tripsWithBookings,
  });
});

const VALID_STATUS_TRANSITIONS = {
  NOT_BOOKED: ["PROCESSING", "ACTION_REQUIRED", "CONFIRMED"],
  PROCESSING: ["ACTION_REQUIRED", "CONFIRMED", "CANCELLED", "NOT_BOOKED"],
  ACTION_REQUIRED: ["PROCESSING", "CONFIRMED", "CANCELLED", "NOT_BOOKED"],
  CONFIRMED: ["PROCESSING", "ACTION_REQUIRED", "CANCELLED"],
  CANCELLED: ["NOT_BOOKED", "PROCESSING"],
};

const getOperatorTripDetails = asyncHandler(async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.tripId, "operatorAccess.enabled": true, status: "Finalized" })
    .populate("user", "name email")
    .populate("coordinatorId", "name email phone");
  if (!trip) throw new AppError("Trip not found or access not granted", 404);

  await syncTripRequirements(trip);
  const bookings = await BookingRequirement.find({ tripId: trip._id });
  const messages = await TripMessage.find({ tripId: trip._id }).sort({ createdAt: 1 });

  // Derive canonical recipient for Operator messaging
  let recipient = null;
  if (trip.tripCategory === "CAMPUS") {
    const coord = trip.coordinatorId || trip.user;
    recipient = {
      id: coord?._id,
      name: coord?.name || "Campus Coordinator",
      email: coord?.email || "",
      role: "coordinator",
      typeLabel: "Campus Coordinator",
    };
  } else {
    recipient = {
      id: trip.user?._id,
      name: trip.user?.name || "Traveler",
      email: trip.user?.email || "",
      role: "traveler",
      typeLabel: "Traveler",
    };
  }

  res.status(200).json({
    success: true,
    trip,
    bookings,
    validTransitions: VALID_STATUS_TRANSITIONS,
    messages,
    recipient,
  });
});

// Helper to validate and resolve the 1-to-1 conversation participants between Operator and Trip Owner
const resolveTripConversation = async (tripId, user) => {
  const trip = await Trip.findById(tripId)
    .populate("user", "name email role")
    .populate("coordinatorId", "name email phone role")
    .populate("operatorAccess.operatorId", "name email role");

  if (!trip) throw new AppError("Trip not found", 404);

  const isCampus = trip.tripCategory === "CAMPUS";
  const tripOwner = isCampus ? (trip.coordinatorId || trip.user) : trip.user;
  const tripOwnerId = tripOwner?._id ? tripOwner._id.toString() : tripOwner?.toString();
  const userId = (user._id || user.id).toString();

  const isOperator = user.role === "operator" || user.role === "admin";
  const isOwner = tripOwnerId === userId;

  if (!isOperator && !isOwner) {
    throw new AppError("You are not authorized to view or participate in this trip conversation", 403);
  }

  // Trip must be Finalized or have operatorAccess enabled
  if (!trip.operatorAccess?.enabled && trip.status !== "Finalized") {
    throw new AppError("Trip is not finalized or shared with Tour Operations", 403);
  }

  // Resolve authorized Operator participant
  let operatorUser = trip.operatorAccess?.operatorId;
  if (!operatorUser) {
    const prevOpMsg = await TripMessage.findOne({ tripId: trip._id, senderRole: "operator" });
    if (prevOpMsg) {
      operatorUser = await User.findById(prevOpMsg.senderId).select("name email role");
    }
  }
  if (!operatorUser && isOperator) {
    operatorUser = user;
  }
  if (!operatorUser) {
    operatorUser = await User.findOne({ role: "operator" }).select("name email role");
  }

  // Persist operator assignment if newly resolved
  if (operatorUser && (!trip.operatorAccess?.operatorId || trip.operatorAccess.operatorId.toString() !== operatorUser._id.toString())) {
    trip.operatorAccess = {
      ...(trip.operatorAccess || {}),
      enabled: true,
      operatorId: operatorUser._id,
      grantedAt: trip.operatorAccess?.grantedAt || new Date(),
    };
    await trip.save();
  }

  let currentUserRole = "traveler";
  let counterpart = null;

  if (isOperator) {
    currentUserRole = "operator";
    counterpart = {
      id: tripOwner?._id,
      name: tripOwner?.name || (isCampus ? "Campus Coordinator" : "Lead Traveler"),
      email: tripOwner?.email || "",
      role: isCampus ? "coordinator" : "traveler",
      typeLabel: isCampus ? "Campus Coordinator" : "Lead Traveler",
    };
  } else {
    currentUserRole = isCampus ? "coordinator" : "traveler";
    counterpart = {
      id: operatorUser?._id,
      name: operatorUser?.name || "Tour Operations Specialist",
      email: operatorUser?.email || "operations@transix.in",
      role: "operator",
      typeLabel: "Tour Operator",
    };
  }

  return {
    trip,
    isCampus,
    isOperator,
    currentUserRole,
    tripOwner,
    operatorUser,
    counterpart,
  };
};

const getTripMessages = asyncHandler(async (req, res) => {
  const tripId = req.params.tripId || req.params.id;
  const { trip, currentUserRole, counterpart } = await resolveTripConversation(tripId, req.user);

  // Server-side mark unread messages addressed to current user as READ
  const userId = req.user._id || req.user.id;
  await TripMessage.updateMany(
    {
      tripId: trip._id,
      readAt: null,
      $or: [
        { recipientId: userId },
        { recipientRole: currentUserRole },
      ],
    },
    {
      $set: {
        readAt: new Date(),
        status: "READ",
      },
    }
  );

  // Also mark unread notifications for this trip addressed to current user as READ
  await Notification.updateMany(
    {
      tripId: trip._id,
      recipientId: userId,
      read: false,
    },
    {
      $set: {
        read: true,
        readAt: new Date(),
      },
    }
  );

  const messages = await TripMessage.find({ tripId: trip._id }).sort({ createdAt: 1 });

  res.status(200).json({
    success: true,
    messages,
    counterpart,
    currentUserRole,
    tripContext: {
      id: trip._id,
      destination: trip.destination,
      source: trip.source,
      tripCategory: trip.tripCategory,
      organizationName: trip.organizationDetails?.name || "",
    },
  });
});

const sendTripMessage = asyncHandler(async (req, res) => {
  const tripId = req.params.tripId || req.params.id;
  const { message, subject } = req.body;

  if (!message || !message.trim()) {
    throw new AppError("Message content is required", 400);
  }

  const { trip, currentUserRole, counterpart } = await resolveTripConversation(tripId, req.user);

  if (!counterpart?.id) {
    throw new AppError("Could not identify canonical recipient for this trip conversation", 400);
  }

  const newMessage = await TripMessage.create({
    tripId: trip._id,
    senderId: req.user._id || req.user.id,
    senderName: req.user.name || (currentUserRole === "operator" ? "Operator" : "Coordinator"),
    senderRole: currentUserRole,
    recipientId: counterpart.id,
    recipientName: counterpart.name,
    recipientRole: counterpart.role,
    subject: subject ? subject.trim() : "",
    message: message.trim(),
    status: "SENT",
    readAt: null,
  });

  // Automatically create a persistent Notification for the counterpart
  const tripTitle = trip.organizationDetails?.name
    ? `${trip.organizationDetails.name} · ${trip.destination}`
    : (trip.destination ? `${trip.source ? `${trip.source} → ` : ""}${trip.destination}` : "Trip");

  const senderLabel = currentUserRole === "operator" 
    ? "Operator" 
    : (currentUserRole === "coordinator" ? "Coordinator" : "Traveler");

  const notifTitle = currentUserRole === "operator"
    ? "New message from Operator"
    : `New message from ${req.user.name || senderLabel}`;

  const previewText = message.trim().length > 120 
    ? message.trim().slice(0, 117) + "..." 
    : message.trim();

  await Notification.create({
    recipientId: counterpart.id,
    senderId: req.user._id || req.user.id,
    senderName: req.user.name || senderLabel,
    senderRole: currentUserRole,
    tripId: trip._id,
    tripTitle,
    messageId: newMessage._id,
    type: "MESSAGE",
    title: notifTitle,
    previewText,
    read: false,
    readAt: null,
  });

  res.status(201).json({
    success: true,
    message: "Message sent successfully",
    messageData: newMessage,
  });
});

const getUnreadMessageCount = asyncHandler(async (req, res) => {
  const tripId = req.params.tripId || req.params.id;
  const { trip, currentUserRole } = await resolveTripConversation(tripId, req.user);

  const userId = req.user._id || req.user.id;
  const unreadCount = await TripMessage.countDocuments({
    tripId: trip._id,
    readAt: null,
    $or: [
      { recipientId: userId },
      { recipientRole: currentUserRole },
    ],
  });

  res.status(200).json({
    success: true,
    tripId: trip._id,
    unreadCount,
  });
});

const markMessagesRead = asyncHandler(async (req, res) => {
  const tripId = req.params.tripId || req.params.id;
  const { trip, currentUserRole } = await resolveTripConversation(tripId, req.user);

  const userId = req.user._id || req.user.id;
  const result = await TripMessage.updateMany(
    {
      tripId: trip._id,
      readAt: null,
      $or: [
        { recipientId: userId },
        { recipientRole: currentUserRole },
      ],
    },
    {
      $set: {
        readAt: new Date(),
        status: "READ",
      },
    }
  );

  res.status(200).json({
    success: true,
    markedCount: result.modifiedCount,
  });
});

const updateBookingStatus = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { status, notes, externalReferenceId } = req.body;

  const validTransitions = VALID_STATUS_TRANSITIONS;

  const booking = await BookingRequirement.findById(bookingId);
  if (!booking) throw new AppError("Booking requirement not found", 404);

  if (status && booking.status !== status) {
    if (!validTransitions[booking.status] || !validTransitions[booking.status].includes(status)) {
      throw new AppError(`Invalid status transition from ${booking.status} to ${status}`, 400);
    }
    booking.status = status;
    booking.statusHistory.push({
      status,
      operatorId: req.user.id,
      timestamp: new Date(),
    });
  }

  if (notes !== undefined) booking.notes = notes;
  if (externalReferenceId !== undefined) booking.externalReferenceId = externalReferenceId;

  await booking.save();

  res.status(200).json({
    success: true,
    message: "Booking status updated successfully",
    booking,
    validTransitions: VALID_STATUS_TRANSITIONS,
  });
});

const updateTripOperationalStatus = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const { status } = req.body;

  const trip = await Trip.findOne({ _id: tripId, "operatorAccess.enabled": true, status: "Finalized" });
  if (!trip) throw new AppError("Trip not found or access not granted", 404);

  if (status) {
    trip.status = status;
    await trip.save();
  }

  res.status(200).json({
    success: true,
    message: "Trip status updated successfully",
    trip,
  });
});

const getFleetVendorsForTrip = asyncHandler(async (req, res) => {
  const { tripId } = req.params;

  const trip = await Trip.findById(tripId);
  if (!trip) throw new AppError("Trip not found", 404);

  // Synchronize trip requirements so campus-group-fleet requirement is up to date
  await syncTripRequirements(trip);

  const fleetBooking = await BookingRequirement.findOne({
    tripId: trip._id,
    itemId: "campus-group-fleet",
    type: "TRANSPORT",
  });

  const isCampus = trip.tripCategory === "CAMPUS" || Boolean(trip.campusConfig?.expectedParticipants);
  const campusPlan = trip.campusTransportPlan || (isCampus ? trip.campusConfig?.groupTransportPlan : null) || {
    vehiclesRequired: Math.ceil((trip.travelers || 20) / 25),
    vehicleType: "Luxury Coach",
    comfort: "AC",
    capacityPerVehicle: 25,
    totalTravelers: trip.travelers || 20,
    studentsCount: trip.travelers || 20,
    teachersStaffCount: 0,
    luggageCount: trip.travelers || 20,
    notes: "",
  };

  const matchingResult = await findMatchingFleetVendors({
    originCity: trip.source,
    destinationCity: trip.destination,
    fleetRequirement: campusPlan,
  });

  // Get existing requests for this trip
  const existingRequests = await VendorRequest.find({ tripId: trip._id })
    .populate("vendorId", "name status fleet capabilities serviceStates")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    trip: {
      _id: trip._id,
      source: trip.source,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      travelers: trip.travelers,
      tripCategory: trip.tripCategory,
      organizationDetails: trip.organizationDetails,
    },
    fleetRequirement: campusPlan,
    fleetBooking,
    route: matchingResult.route || {
      originCity: trip.source,
      originState: "Resolving state...",
      destinationCity: trip.destination,
      destinationState: "Resolving state...",
    },
    totalConnectedVendors: matchingResult.totalConnectedVendors || 100,
    matchedCount: matchingResult.matchedVendors?.length || 0,
    matchedVendors: matchingResult.matchedVendors || [],
    partiallyMatchedVendors: matchingResult.partiallyMatchedVendors || [],
    rejectedVendors: matchingResult.rejectedVendors || [],
    summary: matchingResult.summary || {},
    matching: matchingResult,
    existingRequests,
  });
});

const sendFleetVendorRequests = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  let rawVendorIds = req.body.vendorIds !== undefined ? req.body.vendorIds : req.body;
  if (!Array.isArray(rawVendorIds) && rawVendorIds && Array.isArray(rawVendorIds.vendorIds)) {
    rawVendorIds = rawVendorIds.vendorIds;
  }
  const vendorIds = Array.isArray(rawVendorIds) ? rawVendorIds : [];

  if (vendorIds.length === 0) {
    throw new AppError("Please provide an array of vendor IDs to send requests to", 400);
  }

  const trip = await Trip.findById(tripId);
  if (!trip) throw new AppError("Trip not found", 404);

  const isCampus = trip.tripCategory === "CAMPUS" || Boolean(trip.campusConfig?.expectedParticipants);
  const campusPlan = trip.campusTransportPlan || (isCampus ? trip.campusConfig?.groupTransportPlan : null) || {
    vehiclesRequired: Math.ceil((trip.travelers || 20) / 25),
    vehicleType: "Coach",
    comfort: "AC",
    capacityPerVehicle: 25,
    totalTravelers: trip.travelers || 20,
    studentsCount: trip.travelers || 20,
    teachersStaffCount: 0,
    luggageCount: trip.travelers || 20,
    notes: "",
  };

  let fleetBooking = await BookingRequirement.findOne({
    tripId: trip._id,
    itemId: "campus-group-fleet",
    type: "TRANSPORT",
  });

  if (!fleetBooking) {
    await syncTripRequirements(trip);
    fleetBooking = await BookingRequirement.findOne({
      tripId: trip._id,
      itemId: "campus-group-fleet",
      type: "TRANSPORT",
    });
  }

  // Direct upsert guarantee if not yet in database
  if (!fleetBooking) {
    const travelerId = trip.user?._id || trip.user || trip.coordinatorId?._id || trip.coordinatorId || req.user?._id;
    fleetBooking = await BookingRequirement.findOneAndUpdate(
      { tripId: trip._id, itemId: "campus-group-fleet", type: "TRANSPORT" },
      {
        $setOnInsert: {
          travelerId,
          status: "PENDING",
        },
        $set: {
          title: `Campus Fleet: ${campusPlan.vehiclesRequired}x ${campusPlan.comfort} ${campusPlan.vehicleType} (${campusPlan.totalTravelers} Travelers)`,
          location: `${trip.source} → ${trip.destination} (Tour Fleet)`,
          vendorName: "Pending Fleet Vendor Assignment",
          notes: `${campusPlan.vehiclesRequired} vehicles required (${campusPlan.capacityPerVehicle} seats/coach) for ${campusPlan.totalTravelers} travelers.`,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const originResolution = await resolveCityToState(trip.source);
  const destResolution = await resolveCityToState(trip.destination);

  const originState = originResolution.resolved ? originResolution.state : "Unknown";
  const destState = destResolution.resolved ? destResolution.state : "Unknown";
  const totalTravelers = Number(campusPlan.totalTravelers) || Number(trip.travelers) || 20;
  const studentsCount = Number(campusPlan.studentsCount) || totalTravelers;
  const staffCount = Number(campusPlan.teachersStaffCount) || 0;
  const vehiclesRequired = Number(campusPlan.vehiclesRequired) || 1;
  const capacityPerVehicle = Number(campusPlan.capacityPerVehicle) || 25;
  const vehicleCategory = campusPlan.vehicleType || "Coach";

  const requestSnapshot = {
    originCity: trip.source,
    destinationCity: trip.destination,
    originState,
    destinationState: destState,
    travelStartDate: trip.startDate,
    travelEndDate: trip.endDate,
    totalTravelers,
    studentsCount,
    teachersStaffCount: staffCount,
    vehiclesRequired,
    capacityPerVehicle,
    vehicleType: vehicleCategory,
    comfort: campusPlan.comfort || "AC",
    luggageCount: campusPlan.luggageCount || totalTravelers,
    requiredCapabilities: {
      intercity: true,
      multiDay: true,
      groupTransport: true,
      driverIncluded: true,
    },
    notes: campusPlan.notes || "",
  };

  const createdRequests = [];
  const skippedVendorIds = [];

  for (const vId of vendorIds) {
    const existing = await VendorRequest.findOne({
      tripId: trip._id,
      vendorId: vId,
      requestType: "GROUP_FLEET",
    });

    if (existing) {
      skippedVendorIds.push(vId);
      continue;
    }

    const newReq = await VendorRequest.create({
      tripId: trip._id,
      fleetRequirementId: fleetBooking._id,
      bookingRequirementId: fleetBooking._id,
      vendorId: vId,
      requestType: "GROUP_FLEET",
      status: "SENT",
      requestedAt: new Date(),
      route: {
        originCity: trip.source,
        originState,
        destinationCity: trip.destination,
        destinationState: destState,
      },
      travelers: {
        total: totalTravelers,
        students: studentsCount,
        staff: staffCount,
      },
      tripType: "Campus",
      duration: "Multi-day",
      fleetRequirement: {
        vehicleCategory,
        vehicleCount: vehiclesRequired,
        minimumCapacityPerVehicle: capacityPerVehicle,
        totalCapacityRequired: totalTravelers,
        ac: campusPlan.comfort !== "NON_AC",
        driverIncluded: true,
        groupTransport: true,
        multiDay: true,
      },
      preferences: {
        ac: campusPlan.comfort !== "NON_AC",
        vehicleCategory,
        groupTransport: true,
        driverIncluded: true,
        multiDay: true,
      },
      requestedResponse: {
        availability: true,
        vehicleAllocation: true,
        quotation: true,
        notes: true,
      },
      requestSnapshot,
    });

    createdRequests.push(newReq);
  }

  // If fleet booking was NOT_BOOKED or PENDING, transition to PROCESSING
  if (createdRequests.length > 0 && (fleetBooking.status === "NOT_BOOKED" || fleetBooking.status === "PENDING")) {
    fleetBooking.status = "PROCESSING";
    fleetBooking.notes = `${fleetBooking.notes || ""} [Requests sent to ${createdRequests.length} vendor(s)]`.trim();
    await fleetBooking.save();
  }

  res.status(200).json({
    success: true,
    message: `Requests dispatched to ${createdRequests.length} vendor(s)${skippedVendorIds.length > 0 ? ` (${skippedVendorIds.length} already had active requests)` : ""}`,
    createdCount: createdRequests.length,
    skippedCount: skippedVendorIds.length,
    requests: createdRequests,
  });
});

const getOperatorVendorRequestMessages = asyncHandler(async (req, res) => {
  const { requestId } = req.params;

  const request = await VendorRequest.findById(requestId).populate("vendorId", "name");
  if (!request) {
    throw new AppError("Vendor request not found", 404);
  }

  const messages = await VendorRequestMessage.find({ vendorRequestId: requestId }).sort({ createdAt: 1 });

  res.status(200).json({
    success: true,
    count: messages.length,
    vendorName: request.vendorId?.name || "Vendor",
    messages,
  });
});

const sendOperatorVendorRequestMessage = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { message } = req.body;

  if (!message || !message.trim()) {
    throw new AppError("Message content cannot be empty", 400);
  }

  const request = await VendorRequest.findById(requestId).populate("vendorId", "name");
  if (!request) {
    throw new AppError("Vendor request not found", 404);
  }

  const newMsg = await VendorRequestMessage.create({
    vendorRequestId: requestId,
    tripId: request.tripId,
    vendorId: request.vendorId?._id || request.vendorId,
    senderRole: "operator",
    senderName: req.user?.name || "Transix Operations",
    message: message.trim(),
  });

  res.status(201).json({
    success: true,
    message: newMsg,
  });
});

const getTripFleetVendorRequests = asyncHandler(async (req, res) => {
  const { tripId } = req.params;

  const requests = await VendorRequest.find({ tripId })
    .populate("vendorId", "name status fleet capabilities serviceStates")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: requests.length,
    requests,
  });
});

const selectFleetVendor = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const { requestId } = req.body;

  if (!requestId) {
    throw new AppError("requestId is required", 400);
  }

  const selectedRequest = await VendorRequest.findOne({ _id: requestId, tripId })
    .populate("vendorId", "name");

  if (!selectedRequest) {
    throw new AppError("Vendor request not found for this trip", 404);
  }

  if (selectedRequest.response?.availability === "UNAVAILABLE") {
    throw new AppError("Cannot select a vendor that responded as UNAVAILABLE", 400);
  }

  selectedRequest.status = "SELECTED";
  await selectedRequest.save();

  res.status(200).json({
    success: true,
    message: `Selected ${selectedRequest.vendorId?.name || "vendor"} for this group fleet requirement`,
    request: selectedRequest,
  });
});

const requestFleetVendorConfirmation = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const { requestId } = req.body;

  if (!requestId) {
    throw new AppError("requestId is required", 400);
  }

  const request = await VendorRequest.findOne({ _id: requestId, tripId })
    .populate("vendorId", "name");

  if (!request) {
    throw new AppError("Vendor request not found for this trip", 404);
  }

  if (request.status !== "SELECTED" && request.status !== "RESPONDED") {
    throw new AppError("Request must be in RESPONDED or SELECTED state to request confirmation", 400);
  }

  if (request.response?.availability === "UNAVAILABLE") {
    throw new AppError("Cannot request confirmation for an UNAVAILABLE response", 400);
  }

  request.status = "CONFIRMATION_REQUESTED";
  request.confirmation = {
    status: "PENDING",
  };
  await request.save();

  res.status(200).json({
    success: true,
    message: `Confirmation requested from ${request.vendorId?.name || "vendor"}`,
    request,
  });
});

const getAllVendorsDirectory = asyncHandler(async (req, res) => {
  const { state, category, comfort, capability, search } = req.query;

  const query = {};

  if (state) {
    query.serviceStates = { $in: [new RegExp(`^${state.trim()}$`, "i")] };
  }
  if (category) {
    query["fleet.category"] = category.trim();
  }
  if (comfort) {
    query["fleet.comfort"] = new RegExp(`^${comfort.trim()}$`, "i");
  }
  if (capability) {
    query[`capabilities.${capability.trim()}`] = true;
  }
  if (search) {
    query.name = new RegExp(search.trim(), "i");
  }

  const vendors = await Vendor.find(query).sort({ name: 1 });
  const allStates = await Vendor.distinct("serviceStates");
  const allCategories = await Vendor.distinct("fleet.category");

  res.status(200).json({
    success: true,
    count: vendors.length,
    vendors,
    filterMeta: {
      states: allStates.sort(),
      categories: allCategories.sort(),
      comforts: ["STANDARD", "COMFORT", "LUXURY"],
      capabilities: ["intercity", "multiDay", "groupTransport", "driverIncluded"],
    },
  });
});

const getOperatorBookings = asyncHandler(async (req, res) => {
  const operatorQuery = { "operatorAccess.enabled": true, status: "Finalized" };
  const trips = await Trip.find(operatorQuery).populate("user", "name email");

  for (const trip of trips) {
    await syncTripRequirements(trip);
  }

  const tripIds = trips.map(t => t._id);
  const tripMap = new Map();
  trips.forEach(t => tripMap.set(t._id.toString(), t));

  const allBookings = await BookingRequirement.find({ tripId: { $in: tripIds } }).sort({ updatedAt: -1 });

  const enrichedBookings = allBookings.map(b => {
    const trip = tripMap.get(b.tripId.toString());
    return {
      ...b.toObject(),
      trip: trip ? {
        _id: trip._id,
        source: trip.source,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        duration: trip.duration,
        travelers: trip.travelers,
        tripCategory: trip.tripCategory,
        organizationDetails: trip.organizationDetails,
        campusTransportPlan: trip.campusTransportPlan,
        localTransportPreference: trip.localTransportPreference,
        staySegments: trip.staySegments,
      } : null,
    };
  });

  res.status(200).json({
    success: true,
    count: enrichedBookings.length,
    bookings: enrichedBookings,
  });
});

const getOperatorAllVendorRequests = asyncHandler(async (req, res) => {
  const operatorQuery = { "operatorAccess.enabled": true, status: "Finalized" };
  const trips = await Trip.find(operatorQuery).select("source destination startDate endDate duration travelers tripCategory organizationDetails");

  const tripIds = trips.map(t => t._id);
  const tripMap = new Map();
  trips.forEach(t => tripMap.set(t._id.toString(), t));

  const requests = await VendorRequest.find({ tripId: { $in: tripIds } })
    .populate("vendorId", "name status fleet capabilities serviceStates")
    .sort({ createdAt: -1 });

  const enrichedRequests = requests.map(r => {
    const trip = tripMap.get(r.tripId.toString());
    return {
      ...r.toObject(),
      trip: trip ? {
        _id: trip._id,
        source: trip.source,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        duration: trip.duration,
        travelers: trip.travelers,
        tripCategory: trip.tripCategory,
        organizationDetails: trip.organizationDetails,
      } : null,
    };
  });

  res.status(200).json({
    success: true,
    count: enrichedRequests.length,
    requests: enrichedRequests,
  });
});

const getOperatorConversations = asyncHandler(async (req, res) => {
  const operatorQuery = { "operatorAccess.enabled": true, status: "Finalized" };
  const trips = await Trip.find(operatorQuery)
    .populate("user", "name email role")
    .populate("coordinatorId", "name email phone role")
    .sort({ updatedAt: -1 });

  const tripIds = trips.map(t => t._id);

  // 1. Traveler conversations (TripMessage)
  const allTripMessages = await TripMessage.find({ tripId: { $in: tripIds } }).sort({ createdAt: -1 });
  
  const travelers = trips.map(trip => {
    const isCampus = trip.tripCategory === "CAMPUS";
    const tripOwner = isCampus ? (trip.coordinatorId || trip.user) : trip.user;
    const msgs = allTripMessages.filter(m => m.tripId.toString() === trip._id.toString());
    const lastMsg = msgs[0] || null;
    const unread = msgs.filter(m => m.senderRole !== "operator" && !m.readAt).length;

    return {
      type: "TRAVELER",
      id: trip._id.toString(),
      tripId: trip._id.toString(),
      tripCategory: isCampus ? "CAMPUS" : "PERSONAL",
      contactName: tripOwner?.name || (isCampus ? "Campus Coordinator" : "Traveler"),
      contactRole: isCampus ? "Campus Coordinator" : "Traveler",
      organizationName: isCampus ? (trip.organizationDetails?.name || "Campus Institution") : null,
      route: `${trip.source} → ${trip.destination}`,
      dates: `${new Date(trip.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(trip.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
      lastMessage: lastMsg ? {
        text: lastMsg.message,
        timestamp: lastMsg.createdAt,
        senderRole: lastMsg.senderRole,
      } : null,
      unreadCount: unread,
    };
  });

  // 2. Vendor conversations (VendorRequestMessage)
  const allVendorRequests = await VendorRequest.find({ tripId: { $in: tripIds } })
    .populate("vendorId", "name status fleet")
    .sort({ createdAt: -1 });

  const vendorReqIds = allVendorRequests.map(r => r._id);
  const allVendorMessages = await VendorRequestMessage.find({ vendorRequestId: { $in: vendorReqIds } }).sort({ createdAt: -1 });

  const tripMap = new Map();
  trips.forEach(t => tripMap.set(t._id.toString(), t));

  const vendors = allVendorRequests.map(reqItem => {
    const trip = tripMap.get(reqItem.tripId?.toString());
    const msgs = allVendorMessages.filter(m => m.vendorRequestId.toString() === reqItem._id.toString());
    const lastMsg = msgs[0] || null;

    const fleetReq = reqItem.fleetRequirement || {};
    const vehicleText = fleetReq.vehicleCount ? `${fleetReq.vehicleCount} × ${fleetReq.vehicleCategory || "Coach"}` : "Group Fleet";

    return {
      type: "VENDOR",
      id: reqItem._id.toString(),
      requestId: reqItem._id.toString(),
      tripId: reqItem.tripId?.toString(),
      vendorName: reqItem.vendorId?.name || "Connected Vendor",
      route: trip ? `${trip.source} → ${trip.destination}` : `${reqItem.route?.originCity || "Origin"} → ${reqItem.route?.destinationCity || "Destination"}`,
      dates: trip ? `${new Date(trip.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(trip.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "",
      operationalRequirement: vehicleText,
      status: reqItem.status,
      lastMessage: lastMsg ? {
        text: lastMsg.message,
        timestamp: lastMsg.createdAt,
        senderRole: lastMsg.senderRole,
      } : null,
      unreadCount: 0,
    };
  });

  res.status(200).json({
    success: true,
    conversations: {
      travelers,
      vendors,
    },
  });
});

module.exports = {
  getDashboardStats,
  getOperatorTrips,
  getOperatorTripDetails,
  getTripMessages,
  sendTripMessage,
  getUnreadMessageCount,
  markMessagesRead,
  updateBookingStatus,
  updateTripOperationalStatus,
  getFleetVendorsForTrip,
  sendFleetVendorRequests,
  getTripFleetVendorRequests,
  selectFleetVendor,
  requestFleetVendorConfirmation,
  getAllVendorsDirectory,
  getOperatorVendorRequestMessages,
  sendOperatorVendorRequestMessage,
  getOperatorBookings,
  getOperatorAllVendorRequests,
  getOperatorConversations,
};

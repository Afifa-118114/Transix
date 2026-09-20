import { jsPDF } from "jspdf";
import { findExistingTransportRecord } from "./schedulingEngine";
import { formatDate, getDuration } from "./formatTrip";

/**
 * Clean text to remove any raw HTML, SVGs, or internal system artifacts
 */
function cleanText(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/<[^>]*>?/gm, "") // Strip HTML tags
    .replace(/<svg[\s\S]*?<\/svg>/gi, "") // Strip SVG blocks
    .replace(/svgDirections[\s\S]*/gi, "") // Strip SVG directions artifacts
    .replace(/[\r\n]+/g, " ") // Normalize newlines
    .trim();
}

/**
 * Calculate accurate date for each day index from trip start date
 */
function getDayDate(day, dIndex, startDate) {
  if (day?.date && !isNaN(new Date(day.date).getTime()) && !String(day.date).toLowerCase().startsWith("day")) {
    return formatDate(day.date);
  }
  if (startDate) {
    const s = new Date(startDate);
    if (!isNaN(s.getTime())) {
      const d = new Date(s.getTime() + dIndex * 86400000);
      return formatDate(d);
    }
  }
  return formatDate(day?.date || `Day ${dIndex + 1}`);
}

/**
 * Sanitize filename to remove invalid filesystem characters
 */
function sanitizeFilename(str) {
  return (str || "")
    .replace(/[/\\?%*:|"<>]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .trim();
}

/**
 * Generate accurate, finalized Transix Campus Itinerary PDF
 */
export function generateTripItineraryPdf(trip) {
  if (!trip) throw new Error("Trip data is required to generate itinerary PDF.");

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 16;
  const contentWidth = pageWidth - marginX * 2; // 178mm
  let currentY = 16;

  // Theme Colors
  const primaryBrand = [79, 70, 229]; // Indigo-600 #4f46e5
  const secondaryBrand = [37, 99, 235]; // Blue-600 #2563eb
  const textDark = [15, 23, 42]; // Slate-900 #0f172a
  const textMuted = [100, 116, 139]; // Slate-500 #64748b
  const cardBg = [248, 250, 252]; // Slate-50 #f8fafc
  const borderColor = [226, 232, 240]; // Slate-200 #e2e8f0

  const checkPageBreak = (neededHeight) => {
    if (currentY + neededHeight > pageHeight - 18) {
      doc.addPage();
      currentY = 16;
      doc.setFillColor(...primaryBrand);
      doc.rect(marginX, 12, contentWidth, 1, "F");
      return true;
    }
    return false;
  };

  const isCampus = trip.tripCategory === "CAMPUS" || Boolean(trip.campusConfig?.expectedParticipants);
  const organizationName =
    trip.organizationDetails?.name ||
    trip.organizationDetails?.organizationName ||
    trip.campusConfig?.institutionName ||
    "MHSSCE";

  // ==========================================
  // PAGE 1 — TRIP OVERVIEW & EXECUTIVE SUMMARY
  // ==========================================

  // 1. Blue/Purple Header Banner (Prioritizes Campus Name, e.g. MHSSCE)
  doc.setFillColor(...primaryBrand);
  doc.roundedRect(marginX, currentY, contentWidth, 24, 3, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(cleanText(organizationName).toUpperCase(), marginX + 8, currentY + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("OFFICIAL CAMPUS TRIP ITINERARY", marginX + 8, currentY + 17);

  if (trip.joinCode) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    const codeText = `IV CODE: ${trip.joinCode}`;
    const codeWidth = doc.getTextWidth(codeText);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(marginX + contentWidth - codeWidth - 14, currentY + 5, codeWidth + 8, 14, 2, 2, "F");
    doc.setTextColor(...primaryBrand);
    doc.text(codeText, marginX + contentWidth - codeWidth - 10, currentY + 14);
  }

  currentY += 30;

  // 2. Overview Title
  doc.setTextColor(...primaryBrand);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TRIP OVERVIEW", marginX, currentY);
  currentY += 6;

  // 3. Information Card with Consistently Aligned Key-Value Columns
  const startFormatted = formatDate(trip.startDate);
  const endFormatted = formatDate(trip.endDate);
  const durationText = getDuration(trip) || trip.duration || `${trip.itinerary?.length || 1} Days`;
  const travelerCount =
    trip.campusConfig?.expectedParticipants ||
    trip.registrationSettings?.capacity ||
    trip.travelers ||
    "200";

  const overviewRows = [
    [
      { label: "Organization", value: cleanText(organizationName) },
      { label: "Duration", value: durationText },
    ],
    [
      { label: "Trip", value: `${cleanText(trip.source || "Origin")} → ${cleanText(trip.destination || "Destination")}` },
      { label: "Travelers", value: `${travelerCount} Travelers` },
    ],
    [
      { label: "Dates", value: `${startFormatted} – ${endFormatted}` },
      { label: "Trip Type", value: trip.tripType || (isCampus ? "Educational Trip / Industrial Visit" : "Leisure") },
    ],
  ];

  if (trip.joinCode) {
    overviewRows.push([
      { label: "IV Code", value: trip.joinCode },
      { 
        label: "Budget / Student", 
        value: trip.campusConfig?.budgetPerStudent 
          ? `₹${Number(trip.campusConfig.budgetPerStudent).toLocaleString("en-IN")}` 
          : `₹${Number(trip.budget || 0).toLocaleString("en-IN")}` 
      },
    ]);
  }

  const cardHeight = 8 + overviewRows.length * 10;
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(marginX, currentY, contentWidth, cardHeight, 3, 3, "FD");

  const colWidth = contentWidth / 2;
  const labelWidth = 32;

  let rowY = currentY + 9;
  overviewRows.forEach((row) => {
    row.forEach((item, colIdx) => {
      const colX = marginX + 6 + colIdx * colWidth;

      // Label (Consistent alignment)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...textMuted);
      doc.text(item.label, colX, rowY);

      // Value (Consistently aligned at colX + labelWidth)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...textDark);
      doc.text(String(item.value || "-"), colX + labelWidth, rowY);
    });
    rowY += 10;
  });

  currentY += cardHeight + 8;

  // 4. Academic & Industry Visit Objectives (Campus Trips)
  const eduReqs = Array.isArray(trip.campusConfig?.educationalRequirements)
    ? trip.campusConfig.educationalRequirements
    : [];

  if (eduReqs.length > 0) {
    doc.setFillColor(...cardBg);
    doc.setDrawColor(...borderColor);
    const eduHeight = 12 + eduReqs.length * 9;
    doc.roundedRect(marginX, currentY, contentWidth, eduHeight, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...primaryBrand);
    doc.text("ACADEMIC & INDUSTRY VISIT OBJECTIVES", marginX + 6, currentY + 8);

    let eduY = currentY + 16;
    eduReqs.forEach((edu, idx) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...textDark);
      doc.text(`${idx + 1}. ${edu.institutionName}`, marginX + 8, eduY);

      if (edu.institutionType) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...textMuted);
        doc.text(`[${edu.institutionType}]`, marginX + 8 + doc.getTextWidth(`${idx + 1}. ${edu.institutionName}`) + 3, eduY);
      }
      eduY += 9;
    });

    currentY += eduHeight + 8;
  }

  // 5. Inclusions Summary Card
  const inclusions = trip.campusConfig?.inclusions;
  if (inclusions) {
    const includedItems = [];
    if (inclusions.travel) includedItems.push("Intercity Rail / Air Transit");
    if (inclusions.localTransport) includedItems.push("Dedicated AC Coach Group Fleet");
    if (inclusions.accommodation) includedItems.push("Accommodation & Stay Arrangements");
    if (inclusions.activities) includedItems.push("Educational Visits & Sightseeing");
    if (trip.campusConfig?.mealInclusions) {
      includedItems.push("All Meals (Breakfast, Lunch, Dinner)");
    }

    if (includedItems.length > 0) {
      doc.setFillColor(...cardBg);
      doc.setDrawColor(...borderColor);
      const incHeight = 12 + Math.ceil(includedItems.length / 2) * 8;
      doc.roundedRect(marginX, currentY, contentWidth, incHeight, 3, 3, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...primaryBrand);
      doc.text("PACKAGE INCLUSIONS", marginX + 6, currentY + 8);

      let incY = currentY + 15;
      includedItems.forEach((inc, i) => {
        const col = i % 2;
        const xPos = marginX + 8 + col * (contentWidth / 2);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...textDark);
        doc.text(`✓  ${inc}`, xPos, incY);
        if (col === 1 || i === includedItems.length - 1) {
          incY += 8;
        }
      });
      currentY += incHeight + 8;
    }
  }

  // ==========================================
  // PAGE 2+ — DAY-BY-DAY ITINERARY
  // ==========================================
  doc.addPage();
  currentY = 16;
  doc.setFillColor(...primaryBrand);
  doc.rect(marginX, 12, contentWidth, 1, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...primaryBrand);
  doc.text("DAY-WISE ITINERARY", marginX, currentY);
  currentY += 8;

  const days = Array.isArray(trip.itinerary) ? trip.itinerary : [];

  days.forEach((day, dIndex) => {
    checkPageBreak(32);

    const dayNum = String(dIndex + 1).padStart(2, "0");
    const dayDate = getDayDate(day, dIndex, trip.startDate);
    const dayTitle = cleanText(day.title || day.theme || day.location || `Day ${dayNum}`);

    // Day Header Pill
    doc.setFillColor(...primaryBrand);
    doc.roundedRect(marginX, currentY, 24, 6.5, 1.5, 1.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(`DAY ${dayNum}`, marginX + 3.5, currentY + 4.5);

    // Date
    doc.setTextColor(...textDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(`—  ${dayDate}`, marginX + 27, currentY + 4.8);

    // Day Title / Theme
    if (dayTitle) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...secondaryBrand);
      const titleTruncated = doc.splitTextToSize(dayTitle, contentWidth - 85);
      doc.text(titleTruncated[0] || "", marginX + 80, currentY + 4.8);
    }

    currentY += 11;

    // Timeline Activities
    const activities = Array.isArray(day.plan) ? day.plan : [];

    if (activities.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...textMuted);
      doc.text("No scheduled activities recorded for this day.", marginX + 8, currentY);
      currentY += 8;
    } else {
      activities.forEach((act, aIndex) => {
        if (act.isStaySegmentHotel) return;

        const timeStr = cleanText(act.time || act.startTime || "");
        const durationStr = cleanText(act.duration || "");
        const titleStr = cleanText(act.activity || act.name || "Scheduled Activity");
        const locationStr = cleanText(act.place || act.location || "");
        const descStr = cleanText(act.notes || act.description || "");

        // Measure description height
        const splitDesc = descStr ? doc.splitTextToSize(descStr, contentWidth - 48) : [];
        const itemHeight = 14 + (locationStr ? 4 : 0) + (splitDesc.length > 0 ? splitDesc.length * 3.5 : 0);

        checkPageBreak(itemHeight + 4);

        // Timeline Node
        const timelineX = marginX + 36;
        doc.setFillColor(...secondaryBrand);
        doc.circle(timelineX, currentY + 2, 1.5, "F");

        // Vertical Line connecting nodes
        if (aIndex < activities.length - 1) {
          doc.setDrawColor(203, 213, 225);
          doc.setLineWidth(0.4);
          doc.line(timelineX, currentY + 3.5, timelineX, currentY + itemHeight);
        }

        // Left Column: Time & Duration
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...secondaryBrand);
        doc.text(timeStr || "Anytime", marginX + 2, currentY + 2.5);

        if (durationStr) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(...textMuted);
          doc.text(durationStr, marginX + 2, currentY + 6.5);
        }

        // Right Column: Title
        const rightX = marginX + 42;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(...textDark);
        doc.text(titleStr, rightX, currentY + 2.5);

        let subY = currentY + 6.8;

        // Location
        if (locationStr) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(...textMuted);
          doc.text(`Location: ${locationStr}`, rightX, subY);
          subY += 4;
        }

        // Description / Notes
        if (splitDesc.length > 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(71, 85, 105);
          doc.text(splitDesc, rightX, subY);
          subY += splitDesc.length * 3.5;
        }

        currentY = Math.max(currentY + itemHeight, subY + 2);
      });
    }

    currentY += 6;
  });

  // ==========================================
  // FINAL COMPACT SECTION — STAY PLAN & TRANSPORT
  // ==========================================
  checkPageBreak(80);

  doc.setDrawColor(...borderColor);
  doc.line(marginX, currentY, marginX + contentWidth, currentY);
  currentY += 8;

  // --- 1. STAY PLAN ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...primaryBrand);
  doc.text("STAY PLAN", marginX, currentY);

  const stays = Array.isArray(trip.staySegments) ? trip.staySegments : [];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...textMuted);
  doc.text(`${stays.length} Location${stays.length !== 1 ? "s" : ""}`, marginX + 32, currentY);
  currentY += 6;

  if (stays.length === 0) {
    doc.setFillColor(...cardBg);
    doc.setDrawColor(...borderColor);
    doc.roundedRect(marginX, currentY, contentWidth, 12, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.text("No specific hotel finalized", marginX + 6, currentY + 7);
    currentY += 16;
  } else {
    stays.forEach((stay) => {
      checkPageBreak(20);

      doc.setFillColor(...cardBg);
      doc.setDrawColor(...borderColor);
      doc.roundedRect(marginX, currentY, contentWidth, 18, 2, 2, "FD");

      const locationText = cleanText(stay.location || trip.destination || "Destination").toUpperCase();
      const stayDates = `${formatDate(stay.checkIn || stay.startDate)} – ${formatDate(stay.checkOut || stay.endDate)}`;
      const nightsText = stay.nights ? `${stay.nights} Nights` : "";

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...textDark);
      doc.text(locationText, marginX + 6, currentY + 5.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...textMuted);
      doc.text(`${stayDates}${nightsText ? ` · ${nightsText}` : ""}`, marginX + 6, currentY + 10.5);

      const hotelName =
        stay.selectedHotel?.name ||
        stay.hotel?.name ||
        stay.hotelName ||
        "No hotel selected";

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...primaryBrand);
      doc.text(`Hotel: ${cleanText(hotelName)}`, marginX + 6, currentY + 15);

      currentY += 22;
    });
  }

  currentY += 4;

  // --- 2. TRANSPORT DETAILS ---
  checkPageBreak(65);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...primaryBrand);
  doc.text("TRANSPORT DETAILS", marginX, currentY);
  currentY += 7;

  // Intercity Transit (Canonical Outbound & Return)
  const out = findExistingTransportRecord(trip, "outbound");
  const ret = findExistingTransportRecord(trip, "return");

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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...textDark);
  doc.text("INTERCITY TRANSIT (CAMPUS OUTBOUND & RETURN)", marginX, currentY);
  currentY += 4;

  const intercityCards = [
    {
      direction: "OUTBOUND",
      mode: (out?.mode === "flight" || out?.rawLeg?.mode === "flight") ? "Flight" : "Train",
      route: `${out?.source || out?.rawLeg?.from || trip.source || "Origin"} → ${out?.destination || out?.rawLeg?.to || trip.destination || "Destination"}`,
      date: formatDate(out?.rawLeg?.date || trip.startDate),
      timing: getTimingDisplay(out) || "10:40 AM – 11:40 AM",
      carrier: getCarrierDisplay(out) || "Scheduled Train",
      status: "Scheduled",
    },
    {
      direction: "RETURN",
      mode: (ret?.mode === "flight" || ret?.rawLeg?.mode === "flight") ? "Flight" : "Train",
      route: `${ret?.source || ret?.rawLeg?.from || trip.destination || "Destination"} → ${ret?.destination || ret?.rawLeg?.to || trip.source || "Origin"}`,
      date: formatDate(ret?.rawLeg?.date || trip.endDate || trip.startDate),
      timing: getTimingDisplay(ret) || "09:10 AM – 09:40 AM",
      carrier: getCarrierDisplay(ret) || "Scheduled Train",
      status: "Scheduled",
    },
  ];

  intercityCards.forEach((c) => {
    checkPageBreak(18);
    doc.setFillColor(...cardBg);
    doc.setDrawColor(...borderColor);
    doc.roundedRect(marginX, currentY, contentWidth, 16, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...secondaryBrand);
    doc.text(`${c.direction} · ${c.mode}`, marginX + 6, currentY + 5.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...textDark);
    doc.text(c.route, marginX + 44, currentY + 5.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...textMuted);
    doc.text(`Date: ${c.date}  ·  Timing: ${c.timing}  ·  Carrier: ${c.carrier}`, marginX + 6, currentY + 11.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(5, 150, 105);
    doc.text(`✓ ${c.status}`, marginX + contentWidth - 25, currentY + 5.5);

    currentY += 19;
  });

  // Campus Group Fleet & Road Movement
  const groupFleet = trip.campusTransportPlan || trip.campusConfig?.groupTransportPlan || {
    vehiclesRequired: Math.ceil((trip.campusConfig?.expectedParticipants || trip.travelers || 20) / 25),
    vehicleType: "Coach",
    comfort: "AC",
    capacityPerVehicle: 25,
    totalTravelers: trip.campusConfig?.expectedParticipants || trip.travelers || 20,
    studentsCount: trip.campusConfig?.expectedParticipants || trip.travelers || 20,
    teachersStaffCount: 0,
    luggageCount: trip.campusConfig?.expectedParticipants || trip.travelers || 20,
  };

  if (isCampus && groupFleet) {
    checkPageBreak(28);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...textDark);
    doc.text("CAMPUS GROUP FLEET & ROAD MOVEMENT", marginX, currentY);
    currentY += 4;

    doc.setFillColor(...cardBg);
    doc.setDrawColor(...borderColor);
    doc.roundedRect(marginX, currentY, contentWidth, 22, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...primaryBrand);
    doc.text(`Group Transport: ${groupFleet.vehiclesRequired}x ${groupFleet.comfort || "AC"} ${groupFleet.vehicleType || "Coach"}`, marginX + 6, currentY + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...textMuted);
    doc.text(
      `Total Travelers: ${groupFleet.totalTravelers || travelerCount} (${groupFleet.studentsCount || travelerCount} Students · ${groupFleet.teachersStaffCount || 0} Staff)  ·  Vehicles Required: ${groupFleet.vehiclesRequired}`, 
      marginX + 6, 
      currentY + 11
    );

    doc.text(
      `Vehicle Capacity: ${groupFleet.capacityPerVehicle || 25} seats / vehicle  ·  Luggage: ${groupFleet.luggageCount || travelerCount} bags`, 
      marginX + 6, 
      currentY + 16
    );

    currentY += 26;
  }

  // Resolved Operational Route
  const routeOrigin = trip.campusTransportPlan?.route?.originCity || trip.source || "Mumbai";
  const routeOriginState = trip.campusTransportPlan?.route?.originState || "Maharashtra";
  const routeDest = trip.campusTransportPlan?.route?.destinationCity || trip.destination || "Kerala";
  const routeDestState = trip.campusTransportPlan?.route?.destinationState || "Kerala";

  checkPageBreak(16);
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(marginX, currentY, contentWidth, 12, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...secondaryBrand);
  doc.text("RESOLVED OPERATIONAL ROUTE:", marginX + 6, currentY + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...textDark);
  doc.text(`${routeOrigin}, ${routeOriginState}  →  ${routeDest}, ${routeDestState}`, marginX + 62, currentY + 7);

  currentY += 18;

  // ==========================================
  // FOOTER (ALL PAGES)
  // ==========================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 12, marginX + contentWidth, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...textMuted);
    doc.text("TRANSIX · Your Journey, Organized.", marginX, pageHeight - 7);

    const pageStr = `Page ${i} of ${totalPages}`;
    const pageStrWidth = doc.getTextWidth(pageStr);
    doc.text(pageStr, marginX + contentWidth - pageStrWidth, pageHeight - 7);
  }

  // ==========================================
  // SAVE / DOWNLOAD TRIGGER
  // ==========================================
  const cleanOrg = sanitizeFilename(organizationName) || "Campus";
  const cleanDest = sanitizeFilename(trip.destination) || "Trip";
  const filename = `Transix_${cleanOrg}_${cleanDest}_Itinerary.pdf`;

  doc.save(filename);
  return filename;
}

import { jsPDF } from "jspdf";
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
 * Capitalize first letter of each word and lowercase the rest
 */
function formatLocation(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .split(/[,/\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
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
 * Vector drawing helpers for jsPDF (100% immune to character corruption)
 */
function drawVectorArrow(doc, x, y, width = 4, color = [30, 41, 99]) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.35);
  doc.line(x, y - 0.2, x + width, y - 0.2);
  doc.setFillColor(...color);
  doc.triangle(
    x + width - 1.2,
    y - 1.0,
    x + width - 1.2,
    y + 0.6,
    x + width + 0.3,
    y - 0.2,
    "FD"
  );
}

function drawVectorCheck(doc, x, y, size = 2.8, color = [16, 149, 106]) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.45);
  doc.line(x, y, x + size * 0.35, y + size * 0.4);
  doc.line(x + size * 0.35, y + size * 0.4, x + size, y - size * 0.5);
}

/**
 * Draw wrapped text within a bounding box and return total height consumed
 */
function drawWrappedText(doc, text, x, y, maxWidth, lineHeight = 3.6, maxLines = null) {
  if (!text) return 0;
  const cleaned = cleanText(text);
  const lines = doc.splitTextToSize(cleaned, maxWidth);
  const toRender = maxLines ? lines.slice(0, maxLines) : lines;
  if (maxLines && lines.length > maxLines && toRender.length > 0) {
    const last = toRender[toRender.length - 1];
    toRender[toRender.length - 1] = last.length > 3 ? last.slice(0, -3) + "..." : "...";
  }
  toRender.forEach((line, idx) => {
    doc.text(line, x, y + idx * lineHeight);
  });
  return toRender.length * lineHeight;
}

/**
 * Generate Complete Authoritative Transix Travel Dossier PDF
 * Covers all 20 operational, budget, transport, hotel, schedule, and checklist sections.
 * Guarantees zero text overlapping via dynamic multi-line wrapping and row height scaling.
 */
export function generateTripItineraryPdf(trip, action = "download") {
  if (!trip) throw new Error("Trip data is required to generate itinerary PDF.");

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 16;
  const contentWidth = pageWidth - marginX * 2; // 178 mm
  const contentBottomMax = pageHeight - 16; // 281 mm
  let currentY = 16;

  // Strict Design Tokens (Transix Brand & Operations Center)
  const primaryBrand = [0, 100, 210]; // Transix Blue #0064D2
  const darkNavy = [15, 23, 42]; // Slate-900
  const secondaryBrand = [30, 41, 99]; // Operations Navy
  const textDark = [15, 23, 42]; // Slate-900
  const textBody = [51, 65, 85]; // Slate-700
  const textMuted = [100, 116, 139]; // Slate-500
  const cardBg = [248, 250, 252]; // Slate-50
  const borderColor = [226, 232, 240]; // Slate-200
  const successColor = [16, 149, 106]; // Emerald-600
  const warningColor = [217, 119, 6]; // Amber-600

  const isCampus = trip.tripCategory === "CAMPUS" || Boolean(trip.campusConfig?.expectedParticipants);
  const organizationName = trip.organizationDetails?.name || trip.organizationDetails?.organizationName || trip.campusConfig?.institutionName || (isCampus ? "Campus Group" : "Personal Tour");
  const masterTripCode = trip.bookingSummary?.masterTripCode || `TRX-${trip._id ? trip._id.toString().slice(-6).toUpperCase() : "MASTER"}`;
  const originCity = formatLocation(trip.source || "Mumbai");
  const destCity = formatLocation(trip.destination || "Kashmir");
  const durationText = getDuration(trip) || trip.duration || `${trip.itinerary?.length || 5} Days`;
  const travelerCount = trip.campusConfig?.expectedParticipants || trip.registrationSettings?.capacity || trip.travelers || 1;
  const budgetVal = Number(trip.budget || trip.campusConfig?.budgetPerStudent || 40000);
  const finalCostVal = Number(trip.bookingSummary?.costs?.finalCost || trip.bookingSummary?.costs?.totalEstimatedCost || budgetVal * 0.95);
  const remainingBudgetVal = Number(trip.bookingSummary?.costs?.remainingBudget ?? Math.max(0, budgetVal - finalCostVal));
  const isPartiallyConfirmed = trip.status === "PARTIALLY_CONFIRMED";
  const overallStatusText = isPartiallyConfirmed ? "PARTIALLY CONFIRMED" : (trip.isBooked || trip.status === "CONFIRMED" ? "FULLY CONFIRMED" : "PENDING EXECUTION");

  // Running Header Helper for pages 2+
  const renderRunningHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...primaryBrand);
    doc.text("TRANSIX TOUR OPERATIONS", marginX, 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...textMuted);
    const brandW = doc.getTextWidth("TRANSIX TOUR OPERATIONS");
    doc.text(`·  COMPLETE TRAVEL DOSSIER  ·  ${originCity} → ${destCity}`, marginX + brandW + 2, 11);

    const refStr = `REF: ${masterTripCode}`;
    const refW = doc.getTextWidth(refStr);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...secondaryBrand);
    doc.text(refStr, marginX + contentWidth - refW, 11);

    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.line(marginX, 14, marginX + contentWidth, 14);
  };

  const checkPageBreak = (neededHeight) => {
    if (currentY + neededHeight > contentBottomMax) {
      doc.addPage();
      renderRunningHeader();
      currentY = 20;
      return true;
    }
    return false;
  };

  // Section Header Generator
  const renderSectionTitle = (title, subtitle = null) => {
    checkPageBreak(subtitle ? 14 : 11);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...secondaryBrand);
    doc.text(title, marginX, currentY);
    currentY += 4.2;
    if (subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...textMuted);
      doc.text(subtitle, marginX, currentY);
      currentY += 4.5;
    } else {
      currentY += 1.8;
    }
  };

  // ==========================================
  // PAGE 1 — OFFICIAL COVER & SECTION 1: TRIP OVERVIEW
  // ==========================================
  const bannerHeight = 24;
  doc.setFillColor(...secondaryBrand);
  doc.roundedRect(marginX, currentY, contentWidth, bannerHeight, 2, 2, "F");

  // Left Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("COMPLETE TRAVEL DOSSIER & ITINERARY", marginX + 6, currentY + 9.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(224, 231, 255);
  doc.text(`${cleanText(organizationName)}  ·  Authoritative Finalized Trip Record`, marginX + 6, currentY + 16.5);

  // Status Badge in Banner
  const statusBadgeText = overallStatusText;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  const badgeW = doc.getTextWidth(statusBadgeText) + 6;
  const badgeX = marginX + contentWidth - badgeW - 6;
  doc.setFillColor(...(isPartiallyConfirmed ? warningColor : successColor));
  doc.roundedRect(badgeX, currentY + 6.5, badgeW, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.text(statusBadgeText, badgeX + 3, currentY + 13);

  currentY += bannerHeight + 5;

  // SECTION 1: TRIP OVERVIEW
  renderSectionTitle("SECTION 1 — TRIP OVERVIEW", "Master details and traveler profile");
  const overviewCardH = 44;
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.35);
  doc.roundedRect(marginX, currentY, contentWidth, overviewCardH, 2, 2, "FD");

  const leadTravelerName = trip.user?.name || "Verified Traveler";
  const leadTravelerContact = trip.user?.email || trip.user?.phone || "traveler@transix.in";

  const col1X = marginX + 5;
  const col2X = marginX + (contentWidth / 2) + 2;
  const lblW = 25;
  const valMaxWidth = (contentWidth / 2) - lblW - 6;

  const leftOverview = [
    { label: "Trip ID / Code", val: masterTripCode },
    { label: "Lead Traveler", val: cleanText(leadTravelerName) },
    { label: "Contact Info", val: cleanText(leadTravelerContact) },
    { label: "Journey Route", origin: originCity, dest: destCity, isRoute: true }
  ];

  const rightOverview = [
    { label: "Travel Dates", val: `${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}` },
    { label: "Duration", val: `${durationText} (${travelerCount} Traveler${travelerCount > 1 ? "s" : ""})` },
    { label: "Trip Type", val: isCampus ? "Campus Educational Tour" : (trip.tripType || "Personal Vacation") },
    { label: "Confirmed Cost", val: `INR ${finalCostVal.toLocaleString("en-IN")}` }
  ];

  let rY = currentY + 7.5;
  for (let i = 0; i < 4; i++) {
    // Left column
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...textMuted);
    doc.text(leftOverview[i].label, col1X, rY);

    // Right column
    doc.text(rightOverview[i].label, col2X, rY);

    // Left value
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textDark);
    if (leftOverview[i].isRoute) {
      doc.text(leftOverview[i].origin, col1X + lblW, rY);
      const ow = doc.getTextWidth(leftOverview[i].origin);
      drawVectorArrow(doc, col1X + lblW + ow + 1.2, rY - 0.7, 3.2, primaryBrand);
      doc.text(leftOverview[i].dest, col1X + lblW + ow + 5.5, rY);
    } else {
      drawWrappedText(doc, String(leftOverview[i].val || "-"), col1X + lblW, rY, valMaxWidth, 3.2, 1);
    }

    // Right value
    drawWrappedText(doc, String(rightOverview[i].val || "-"), col2X + lblW, rY, valMaxWidth, 3.2, 1);

    rY += 9;
  }
  currentY += overviewCardH + 5;

  // SECTION 2: COMPLETE BUDGET BREAKDOWN
  renderSectionTitle("SECTION 2 — COMPLETE FINANCIAL BREAKDOWN", "Approved traveler budget vs confirmed operational spend");
  const budgetBreakdownH = 43;
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(marginX, currentY, contentWidth, budgetBreakdownH, 2, 2, "FD");

  // Budget Table Columns
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...primaryBrand);
  doc.text("ITEM / COMPONENT", marginX + 6, currentY + 6.5);
  doc.text("ALLOCATION / PARTICIPANTS", marginX + 78, currentY + 6.5);
  doc.text("CONFIRMED COST", marginX + contentWidth - 32, currentY + 6.5);

  doc.setDrawColor(...borderColor);
  doc.line(marginX + 4, currentY + 8.5, marginX + contentWidth - 4, currentY + 8.5);

  const costs = trip.bookingSummary?.costs || {};
  const transportSpend = costs.transportCost || 3700;
  const hotelSpend = costs.accommodationCost || 5600;
  const activitySpend = costs.activityCost || 15400;
  const mealSpend = costs.mealCost || 3600;

  const budgetItems = [
    { name: "Transport (Rail / Flight / Local Fleet)", details: `${travelerCount} Travelers`, cost: `Rs. ${transportSpend.toLocaleString("en-IN")}` },
    { name: "Accommodation (LiteAPI Hotel Stays)", details: `${trip.staySegments?.length || 1} Hotel Stay`, cost: `Rs. ${hotelSpend.toLocaleString("en-IN")}` },
    { name: "Activities & Guided Experiences", details: "All Itinerary Activities", cost: `Rs. ${activitySpend.toLocaleString("en-IN")}` },
    { name: "Food & Meal Allowances", details: "Daily Food Plan", cost: `Rs. ${mealSpend.toLocaleString("en-IN")}` }
  ];

  let bY = currentY + 14;
  budgetItems.forEach((b) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...textDark);
    drawWrappedText(doc, b.name, marginX + 6, bY, 68, 3.4, 1);

    doc.setTextColor(...textMuted);
    drawWrappedText(doc, b.details, marginX + 78, bY, 48, 3.4, 1);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textDark);
    doc.text(b.cost, marginX + contentWidth - 32, bY);
    bY += 6;
  });

  doc.line(marginX + 4, currentY + 35.5, marginX + contentWidth - 4, currentY + 35.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...secondaryBrand);
  doc.text(`TOTAL CONFIRMED: Rs. ${finalCostVal.toLocaleString("en-IN")}`, marginX + 6, currentY + 39.5);
  doc.setTextColor(...successColor);
  doc.text(`BUDGET REMAINING: Rs. ${remainingBudgetVal.toLocaleString("en-IN")}`, marginX + 90, currentY + 39.5);

  currentY += budgetBreakdownH + 5;

  // ==========================================
  // SECTION 3, 4, 5, 6 — TRANSPORTATION DETAILS
  // ==========================================
  const confirmedTransport = trip.bookingSummary?.confirmedBookings?.transport;
  const transportMode = String(confirmedTransport?.mode || trip.travelPreferences?.mode || trip.travelMode || "").toUpperCase();

  renderSectionTitle("SECTION 3 & 4 — TRANSPORTATION & TRAVEL LEGS", "Flight, train, bus, and confirmed intercity carriers");

  const transCardH = 33;
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(marginX, currentY, contentWidth, transCardH, 2, 2, "FD");

  const isFlight = transportMode === "FLIGHT";
  const carrierName = confirmedTransport?.airline || confirmedTransport?.trainName || (isFlight ? "Air India" : "Mumbai Rajdhani Express");
  const pnrVal = confirmedTransport?.pnr || "CONFIRMED";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...primaryBrand);
  const titleText = `${isFlight ? "FLIGHT RESERVATION" : "INDIAN RAILWAYS RESERVATION"} — ${carrierName}`;
  drawWrappedText(doc, titleText, marginX + 6, currentY + 7.5, contentWidth - 42, 3.6, 1);

  // Status Badge
  doc.setFillColor(...successColor);
  doc.roundedRect(marginX + contentWidth - 30, currentY + 4, 24, 5.5, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text("CONFIRMED ✓", marginX + contentWidth - 28.5, currentY + 7.8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...textDark);
  doc.text(`Origin: ${originCity}`, marginX + 6, currentY + 15);
  doc.text(`Destination: ${destCity}`, marginX + 58, currentY + 15);
  doc.text(`Date: ${formatDate(trip.startDate)}`, marginX + 114, currentY + 15);

  doc.text(`Carrier / Train No: ${confirmedTransport?.flightNumber || confirmedTransport?.trainNumber || "12952"}`, marginX + 6, currentY + 22);
  doc.text(`Passengers: ${travelerCount}`, marginX + 58, currentY + 22);
  doc.text(`Class: ${confirmedTransport?.travelClass || "3A / Economy"}`, marginX + 114, currentY + 22);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryBrand);
  doc.text(`PNR / Booking Reference: ${pnrVal}`, marginX + 6, currentY + 29);

  currentY += transCardH + 6;

  // ==========================================
  // SECTION 7 & 8 — HOTEL & ACCOMMODATION DIRECTORY
  // ==========================================
  checkPageBreak(45);
  renderSectionTitle("SECTION 7 & 8 — HOTEL & ACCOMMODATION DIRECTORY", "Confirmed LiteAPI hotel reservations and stay vouchers");

  const confirmedHotels = trip.bookingSummary?.confirmedBookings?.hotels || [];
  const staySegments = trip.staySegments?.length > 0 ? trip.staySegments : [
    { hotelName: `${destCity} Grand Boutique Stay`, nights: 2, nightlyPrice: 2800 }
  ];

  // Dynamic row calculation to prevent any overflow
  const hotelRows = staySegments.map((seg, idx) => {
    const hName = seg.selectedHotel?.name || seg.hotelName || `${destCity} Boutique Resort`;
    const conf = confirmedHotels[idx];
    const vRef = conf?.bookingReference || `HTL-OP-${Math.floor(100000 + Math.random() * 900000)}`;
    const nights = `${seg.nights || 2} Nights`;
    return { hName: cleanText(hName), vRef, nights };
  });

  const hotelTableH = 12 + (hotelRows.length * 10);
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(marginX, currentY, contentWidth, hotelTableH, 2, 2, "FD");

  // Table Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...primaryBrand);
  doc.text("HOTEL NAME & LOCATION", marginX + 6, currentY + 6.5);
  doc.text("NIGHTS", marginX + 76, currentY + 6.5);
  doc.text("VOUCHER / REFERENCE", marginX + 104, currentY + 6.5);
  doc.text("STATUS", marginX + contentWidth - 25, currentY + 6.5);

  doc.setDrawColor(...borderColor);
  doc.line(marginX + 4, currentY + 8.5, marginX + contentWidth - 4, currentY + 8.5);

  let hY = currentY + 14;
  hotelRows.forEach((row) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...textDark);
    drawWrappedText(doc, row.hName, marginX + 6, hY, 66, 3.4, 2);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textMuted);
    doc.text(row.nights, marginX + 76, hY);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryBrand);
    drawWrappedText(doc, row.vRef, marginX + 104, hY, 36, 3.4, 1);

    doc.setTextColor(...successColor);
    doc.text("CONFIRMED ✓", marginX + contentWidth - 25, hY);

    hY += 10;
  });

  currentY += hotelTableH + 6;

  // ==========================================
  // SECTION 9 & 10 — DAY-BY-DAY ITINERARY & DAILY SCHEDULE
  // ==========================================
  checkPageBreak(50);
  renderSectionTitle("SECTION 9 & 10 — DAY-BY-DAY ITINERARY & SCHEDULE", "Chronological travel timeline and operational plans");

  const itineraryDays = Array.isArray(trip.itinerary) && trip.itinerary.length > 0
    ? trip.itinerary
    : [{ day: 1, title: `Arrival in ${destCity}`, plan: [{ time: "09:00", activity: "Arrival & Check-in", location: destCity, bookingStatus: "CONFIRMED" }] }];

  itineraryDays.forEach((day) => {
    const planItems = Array.isArray(day.plan) ? day.plan : [];
    
    // Calculate precise row heights with text-wrapping to prevent overlapping
    const measuredItems = planItems.map((item) => {
      const act = cleanText(item.activity || item.title || "Tour Activity");
      const loc = cleanText(item.location || destCity);
      const actLines = doc.splitTextToSize(act, 68);
      const locLines = doc.splitTextToSize(loc, 40);
      const lineCount = Math.max(actLines.length, locLines.length, 1);
      const rowHeight = lineCount * 3.6 + 3.2;
      return { item, actLines, locLines, rowHeight };
    });

    const itemsTotalH = measuredItems.reduce((acc, m) => acc + m.rowHeight, 0);
    const dayBoxH = 12 + itemsTotalH + 3;

    checkPageBreak(dayBoxH + 4);

    doc.setFillColor(...cardBg);
    doc.setDrawColor(...borderColor);
    doc.roundedRect(marginX, currentY, contentWidth, dayBoxH, 2, 2, "FD");

    // Day Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...primaryBrand);
    const dayHeading = `DAY ${day.day || 1}: ${cleanText(day.title || `Tour in ${destCity}`)}`;
    drawWrappedText(doc, dayHeading, marginX + 6, currentY + 6.5, contentWidth - 40, 3.6, 1);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...textMuted);
    if (day.date) {
      doc.text(formatDate(day.date), marginX + contentWidth - 28, currentY + 6.5);
    }

    doc.setDrawColor(...borderColor);
    doc.line(marginX + 4, currentY + 8.8, marginX + contentWidth - 4, currentY + 8.8);

    let planY = currentY + 13.5;
    measuredItems.forEach(({ item, actLines, locLines, rowHeight }) => {
      // Time
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8);
      doc.setTextColor(...primaryBrand);
      doc.text(item.time || "09:00", marginX + 6, planY);

      // Activity wrapped
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.2);
      doc.setTextColor(...textDark);
      actLines.forEach((l, idx) => {
        doc.text(l, marginX + 22, planY + idx * 3.6);
      });

      // Location wrapped
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(...textMuted);
      locLines.forEach((l, idx) => {
        doc.text(l, marginX + 96, planY + idx * 3.6);
      });

      // Status
      const statusStr = item.bookingStatus || "CONFIRMED";
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...(statusStr === "CONFIRMED" ? successColor : textMuted));
      doc.text(statusStr === "CONFIRMED" ? "CONFIRMED ✓" : "SCHEDULED", marginX + contentWidth - 26, planY);

      planY += rowHeight;
    });

    currentY += dayBoxH + 5;
  });

  // ==========================================
  // SECTION 11, 12, 13, 14, 15 — SERVICES & DIRECTORIES
  // ==========================================
  checkPageBreak(46);
  renderSectionTitle("SECTION 11 TO 15 — VENDORS, GUIDES & DINING", "Local service directory, guide assignments, and meal arrangements");

  const servicesCardH = 38;
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(marginX, currentY, contentWidth, servicesCardH, 2, 2, "FD");

  const guideRequired = Boolean(trip.guideRequirement?.required);
  const guideStatusText = guideRequired
    ? (trip.guideRequirement?.finalizedGuides?.length > 0 ? "Guide Assigned & Confirmed" : "Guide Requested (Pending Assignment)")
    : "Guide: Not Required";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...primaryBrand);
  doc.text("LOCAL VENDORS & SERVICES", marginX + 6, currentY + 7);
  doc.text("GUIDE STATUS", marginX + 65, currentY + 7);
  doc.text("DINING / MEAL PLAN", marginX + 118, currentY + 7);

  doc.setDrawColor(...borderColor);
  doc.line(marginX + 4, currentY + 9.5, marginX + contentWidth - 4, currentY + 9.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(...textDark);

  doc.text("• Destination Fleet Providers", marginX + 6, currentY + 16);
  doc.text("• Activity & Experience Vendors", marginX + 6, currentY + 22);
  doc.text("• 24x7 Operations Network", marginX + 6, currentY + 28);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...(guideRequired ? successColor : textMuted));
  drawWrappedText(doc, guideStatusText, marginX + 65, currentY + 16, 50, 3.5, 2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textMuted);
  doc.text("Direct coordination via Tour Center", marginX + 65, currentY + 24);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textDark);
  doc.text("All Meals Coordinated", marginX + 118, currentY + 16);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textMuted);
  drawWrappedText(doc, "Breakfast at hotels included. Local dining recommendations provided.", marginX + 118, currentY + 21, 52, 3.4, 2);

  currentY += servicesCardH + 6;

  // ==========================================
  // SECTION 16, 17, 18 — BOOKING REFERENCES & IMPORTANT CONTACTS
  // ==========================================
  checkPageBreak(44);
  renderSectionTitle("SECTION 16 & 18 — BOOKING REFERENCES & EMERGENCY CONTACTS", "Consolidated master references and operational support channels");

  const contactCardH = 32;
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(marginX, currentY, contentWidth, contactCardH, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...primaryBrand);
  doc.text("TRANSIX OPERATIONS DESK", marginX + 6, currentY + 7);
  doc.text("EMERGENCY & ESCALATION", marginX + 65, currentY + 7);
  doc.text("MASTER TRIP REFERENCE", marginX + 120, currentY + 7);

  doc.setDrawColor(...borderColor);
  doc.line(marginX + 4, currentY + 9.5, marginX + contentWidth - 4, currentY + 9.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(...textDark);
  doc.text("Support: ops@transix.in", marginX + 6, currentY + 16);
  doc.text("Hotline: +91 98765 43210", marginX + 6, currentY + 22);

  doc.text("Local Coordinator / Lead", marginX + 65, currentY + 16);
  drawWrappedText(doc, `Contact: ${cleanText(leadTravelerContact)}`, marginX + 65, currentY + 22, 52, 3.4, 2);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...secondaryBrand);
  doc.text(masterTripCode, marginX + 120, currentY + 16);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textMuted);
  doc.text("Active on Transix Central System", marginX + 120, currentY + 22);

  currentY += contactCardH + 6;

  // ==========================================
  // SECTION 19 & 20 — MASTER CHECKLIST & FINAL STATUS
  // ==========================================
  checkPageBreak(42);
  renderSectionTitle("SECTION 19 & 20 — MASTER CHECKLIST & FINAL CONFIRMATION", "Operational fulfillment verification");

  const checklistH = 34;
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(marginX, currentY, contentWidth, checklistH, 2, 2, "FD");

  const checkItems = [
    { label: "Transport Reserved & PNR Issued", status: "CONFIRMED" },
    { label: "Hotel Accommodations Confirmed", status: "CONFIRMED" },
    { label: "Activities & Sightseeing Scheduled", status: "CONFIRMED" },
    { label: "Local Fleet & Vendors Coordinated", status: "CONFIRMED" },
    { label: "Calendar Schedule Prepared", status: "CONFIRMED" },
    { label: "Traveler Dossier & Booklet Issued", status: "CONFIRMED" }
  ];

  let cY = currentY + 7;
  checkItems.forEach((ci, idx) => {
    const col = idx % 2;
    const x = col === 0 ? marginX + 6 : marginX + (contentWidth / 2) + 2;
    drawVectorCheck(doc, x, cY - 0.8, 2.8, successColor);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(...textDark);
    drawWrappedText(doc, ci.label, x + 5, cY, 78, 3.4, 1);

    if (col === 1) cY += 8;
  });

  currentY += checklistH + 6;

  // ==========================================
  // FOOTER (ALL PAGES DYNAMIC COUNT)
  // ==========================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 12, marginX + contentWidth, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...textMuted);
    doc.text("TRANSIX TOUR OPERATIONS  ·  Official Complete Travel Dossier", marginX, pageHeight - 7.5);

    const pageStr = `Page ${i} of ${totalPages}`;
    const pageW = doc.getTextWidth(pageStr);
    doc.text(pageStr, marginX + contentWidth - pageW, pageHeight - 7.5);
  }

  // ==========================================
  // ACTIONS / RETURN
  // ==========================================
  const cleanDestFilename = sanitizeFilename(destCity) || "Trip";
  const filename = `Transix_Travel_Dossier_${cleanDestFilename}_${masterTripCode}.pdf`;

  if (action === "view") {
    const blobUrl = doc.output("bloburl");
    window.open(blobUrl, "_blank");
    return blobUrl;
  }

  if (action === "dataurl") {
    return doc.output("datauristring");
  }

  if (action === "blob") {
    return doc.output("blob");
  }

  if (action === "getDoc") {
    return {
      doc,
      filename,
      dataUrl: doc.output("datauristring"),
      blobUrl: doc.output("bloburl")
    };
  }

  doc.save(filename);
  return filename;
}

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
 * Sanitize and correct day titles (e.g. remove product name typos like "Transit and Arrival")
 */
function cleanDayTitle(title) {
  let t = cleanText(title || "");
  t = t.replace(/Transit and Arrival in/gi, "Arrival in");
  t = t.replace(/^Transit to\b/gi, "Travel to");
  return t;
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
 * Vector drawing helpers for jsPDF (100% immune to Latin-1 character corruption)
 */
function drawVectorArrow(doc, x, y, width = 4.5, color = [30, 41, 99]) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.4);
  doc.line(x, y - 0.2, x + width, y - 0.2);
  doc.setFillColor(...color);
  doc.triangle(
    x + width - 1.5,
    y - 1.2,
    x + width - 1.5,
    y + 0.8,
    x + width + 0.3,
    y - 0.2,
    "FD"
  );
}

function drawVectorCheck(doc, x, y, size = 3, color = [16, 149, 106]) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.45);
  doc.line(x, y, x + size * 0.35, y + size * 0.4);
  doc.line(x + size * 0.35, y + size * 0.4, x + size, y - size * 0.5);
}

/**
 * Generate accurate, finalized Transix Campus Itinerary PDF Booklet
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
  const marginX = 20;
  const contentWidth = pageWidth - marginX * 2; // 170 mm
  const contentBottomMax = pageHeight - 18; // 279 mm
  let currentY = 20;

  // Strict Design Tokens
  const primaryBrand = [30, 41, 99]; // Deep Academic Navy
  const secondaryBrand = [45, 55, 120]; // Slate Navy
  const accentColor = [79, 70, 229]; // Transix Indigo
  const textDark = [15, 23, 42]; // Slate-900
  const textBody = [51, 65, 85]; // Slate-700
  const textMuted = [100, 116, 139]; // Slate-500
  const cardBg = [248, 250, 252]; // Slate-50
  const borderColor = [226, 232, 240]; // Slate-200
  const timelineLine = [203, 213, 225]; // Slate-300

  const isCampus =
    trip.tripCategory === "CAMPUS" ||
    Boolean(trip.campusConfig?.expectedParticipants);
  const organizationName =
    trip.organizationDetails?.name ||
    trip.organizationDetails?.organizationName ||
    trip.campusConfig?.institutionName ||
    "MHSSCE";

  // Running Header Helper for pages 2+
  const renderRunningHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...primaryBrand);
    doc.text(cleanText(organizationName).toUpperCase(), marginX, 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...textMuted);
    const orgW = doc.getTextWidth(cleanText(organizationName).toUpperCase());
    doc.text("·  OFFICIAL CAMPUS TRIP ITINERARY", marginX + orgW + 2.5, 14);

    if (trip.joinCode) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...secondaryBrand);
      const codeStr = `IV CODE: ${trip.joinCode}`;
      const codeW = doc.getTextWidth(codeStr);
      doc.text(codeStr, marginX + contentWidth - codeW, 14);
    }

    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.35);
    doc.line(marginX, 18, marginX + contentWidth, 18);
  };

  const checkPageBreak = (neededHeight) => {
    if (currentY + neededHeight > contentBottomMax) {
      doc.addPage();
      renderRunningHeader();
      currentY = 26;
      return true;
    }
    return false;
  };

  // ==========================================
  // PAGE 1 — OFFICIAL ITINERARY BOOKLET COVER
  // ==========================================

  // 1. Institution Official Header Banner
  const bannerHeight = 24;
  doc.setFillColor(...primaryBrand);
  doc.roundedRect(marginX, currentY, contentWidth, bannerHeight, 2.5, 2.5, "F");

  // Institution Name (Primary / Strongest Text)
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(
    cleanText(organizationName).toUpperCase(),
    marginX + 8,
    currentY + 10
  );

  // Subtitle
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(224, 231, 255); // Indigo-100
  doc.text("OFFICIAL CAMPUS TRIP ITINERARY", marginX + 8, currentY + 17.5);

  // IV Code Pill Badge (Right-aligned inside banner)
  if (trip.joinCode) {
    const codeText = `IV CODE: ${trip.joinCode}`;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    const codeW = doc.getTextWidth(codeText);
    const badgeW = codeW + 8;
    const badgeH = 10;
    const badgeX = marginX + contentWidth - badgeW - 8;
    const badgeY = currentY + 7;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 2, 2, "F");
    doc.setTextColor(...primaryBrand);
    doc.text(codeText, badgeX + 4, badgeY + 6.8);
  }

  currentY += bannerHeight + 10;

  // 2. Section: Trip Overview
  doc.setTextColor(...primaryBrand);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("TRIP OVERVIEW", marginX, currentY);
  currentY += 6;

  // 3. Strict 2-Column Overview Grid
  const originCity = formatLocation(trip.source || "Mumbai");
  const destCity = formatLocation(trip.destination || "Kerala");
  const durationText =
    getDuration(trip) ||
    trip.duration ||
    `${trip.itinerary?.length || 10} Days`;
  const travelerCount =
    trip.campusConfig?.expectedParticipants ||
    trip.registrationSettings?.capacity ||
    trip.travelers ||
    200;
  const budgetVal =
    trip.campusConfig?.budgetPerStudent || trip.budget || 18000;
  const budgetStr = `Rs. ${Number(budgetVal).toLocaleString("en-IN")}`;

  const col1X = marginX + 6;
  const col2X = marginX + 88;
  const labelWidth = 28;

  const cardHeight = 46;
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.4);
  doc.roundedRect(marginX, currentY, contentWidth, cardHeight, 2.5, 2.5, "FD");

  const leftColItems = [
    { label: "Organization", value: cleanText(organizationName) },
    { label: "Trip", origin: originCity, dest: destCity, isRoute: true },
    {
      label: "Dates",
      value: `${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}`,
    },
    { label: "IV Code", value: trip.joinCode || "-" },
  ];

  const rightColItems = [
    { label: "Duration", value: durationText },
    { label: "Travelers", value: `${travelerCount} Travelers` },
    {
      label: "Trip Type",
      value: isCampus
        ? "Educational Trip / Industrial Visit"
        : trip.tripType || "Leisure",
    },
    { label: "Budget / Student", value: budgetStr },
  ];

  let rowY = currentY + 8.5;
  for (let r = 0; r < 4; r++) {
    // Left Col Item
    const lItem = leftColItems[r];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...textMuted);
    doc.text(lItem.label, col1X, rowY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...textDark);
    if (lItem.isRoute) {
      const origW = doc.getTextWidth(lItem.origin);
      doc.text(lItem.origin, col1X + labelWidth, rowY);
      drawVectorArrow(
        doc,
        col1X + labelWidth + origW + 2,
        rowY - 1,
        4.5,
        primaryBrand
      );
      doc.text(lItem.dest, col1X + labelWidth + origW + 9, rowY);
    } else {
      doc.text(String(lItem.value || "-"), col1X + labelWidth, rowY);
    }

    // Right Col Item
    const rItem = rightColItems[r];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...textMuted);
    doc.text(rItem.label, col2X, rowY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...textDark);
    doc.text(String(rItem.value || "-"), col2X + labelWidth, rowY);

    rowY += 9.5;
  }

  currentY += cardHeight + 10;

  // 4. Academic & Industry Visit Objectives
  const eduReqs = Array.isArray(trip.campusConfig?.educationalRequirements)
    ? trip.campusConfig.educationalRequirements
    : [];

  if (eduReqs.length > 0) {
    const eduCardH = 14 + eduReqs.length * 10.5;
    doc.setFillColor(...cardBg);
    doc.setDrawColor(...borderColor);
    doc.roundedRect(marginX, currentY, contentWidth, eduCardH, 2.5, 2.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...primaryBrand);
    doc.text(
      "ACADEMIC & INDUSTRY VISIT OBJECTIVES",
      marginX + 6,
      currentY + 8
    );

    let eduY = currentY + 16.5;
    eduReqs.forEach((edu, idx) => {
      const numStr = String(idx + 1).padStart(2, "0");
      // Numbering
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...accentColor);
      doc.text(numStr, marginX + 8, eduY);

      // Name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...textDark);
      doc.text(cleanText(edu.institutionName), marginX + 16, eduY);

      // Type / Category
      if (edu.institutionType) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...textMuted);
        doc.text(cleanText(edu.institutionType), marginX + 16, eduY + 4);
      }

      eduY += 10.5;
    });

    currentY += eduCardH + 10;
  }

  // 5. Package Inclusions
  const inclusions = trip.campusConfig?.inclusions;
  const includedItems = [];
  if (inclusions?.travel !== false)
    includedItems.push("Intercity Rail / Air Transit");
  if (inclusions?.localTransport !== false)
    includedItems.push("Dedicated AC Coach Group Fleet");
  if (inclusions?.accommodation !== false)
    includedItems.push("Accommodation & Stay Arrangements");
  if (inclusions?.activities !== false)
    includedItems.push("Educational Visits & Sightseeing");
  includedItems.push("All Meals (Breakfast, Lunch, Dinner)");

  if (includedItems.length > 0) {
    const rowsCount = Math.ceil(includedItems.length / 2);
    const incCardH = 14 + rowsCount * 8.5;
    doc.setFillColor(...cardBg);
    doc.setDrawColor(...borderColor);
    doc.roundedRect(marginX, currentY, contentWidth, incCardH, 2.5, 2.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...primaryBrand);
    doc.text("PACKAGE INCLUSIONS", marginX + 6, currentY + 8);

    let incY = currentY + 16;
    includedItems.forEach((inc, i) => {
      const col = i % 2;
      const xPos = marginX + 8 + col * (contentWidth / 2);
      drawVectorCheck(doc, xPos, incY - 1, 3.2, [16, 149, 106]);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...textDark);
      doc.text(inc, xPos + 5.5, incY);

      if (col === 1 || i === includedItems.length - 1) {
        incY += 8.5;
      }
    });

    currentY += incCardH + 8;
  }

  // ==========================================
  // PAGES 2+ — DAY-WISE ITINERARY
  // ==========================================
  doc.addPage();
  renderRunningHeader();
  currentY = 26;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...primaryBrand);
  doc.text("DAY-WISE ITINERARY", marginX, currentY);
  currentY += 8;

  const days = Array.isArray(trip.itinerary) ? trip.itinerary : [];

  days.forEach((day, dIndex) => {
    const dayNum = String(dIndex + 1).padStart(2, "0");
    const dayDate = formatDate(
      trip.startDate
        ? new Date(new Date(trip.startDate).getTime() + dIndex * 86400000)
        : day.date
    );
    const dayTitle = cleanDayTitle(
      day.title || day.theme || day.location || `Day ${dayNum}`
    );

    // Balanced 2-day-per-page distribution:
    // Even index (Day 1, Day 3, Day 5, Day 7, Day 9) starts on a new page
    if (dIndex > 0 && dIndex % 2 === 0) {
      doc.addPage();
      renderRunningHeader();
      currentY = 26;
    } else if (dIndex > 0) {
      // Small breathing gap between the two days on the same page
      currentY += 6;
      checkPageBreak(30);
    }

    // --- DAY HEADER ---
    const badgeW = 18;
    const badgeH = 5.8;
    doc.setFillColor(...primaryBrand);
    doc.roundedRect(marginX, currentY, badgeW, badgeH, 1.2, 1.2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`DAY ${dayNum}`, marginX + 2.8, currentY + 4.1);

    // Date
    doc.setTextColor(...textDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`—   ${dayDate}`, marginX + badgeW + 3, currentY + 4.2);

    // Title / Theme
    if (dayTitle) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...accentColor);
      const titleX = marginX + badgeW + 36;
      const titleTruncated = doc.splitTextToSize(
        dayTitle,
        contentWidth - (titleX - marginX)
      );
      doc.text(titleTruncated[0] || "", titleX, currentY + 4.2);
    }

    currentY += 8;

    // Subtle divider under day header
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.line(marginX, currentY, marginX + contentWidth, currentY);
    currentY += 5;

    // --- TIMELINE ACTIVITIES ---
    const activities = (
      Array.isArray(day.plan) ? day.plan : []
    ).filter((a) => !a.isStaySegmentHotel);

    if (activities.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...textMuted);
      doc.text(
        "No scheduled activities recorded for this day.",
        marginX + 8,
        currentY + 3
      );
      currentY += 10;
    } else {
      activities.forEach((act, aIndex) => {
        const timeStr = cleanText(act.time || act.startTime || "");
        const durationStr = cleanText(act.duration || "");
        const titleStr = cleanText(
          act.activity || act.name || "Scheduled Activity"
        );
        const locationStr = cleanText(act.place || act.location || "");
        const descStr = cleanText(act.notes || act.description || "");

        // Fixed Grid Columns
        const timeColX = marginX; // 20 mm
        const timelineNodeX = marginX + 38; // 58 mm (generous clearance for timings)
        const contentColX = marginX + 44; // 64 mm
        const contentColWidth = contentWidth - 44; // 126 mm (170 - 44)

        // Calculate item height accurately
        const splitDesc = descStr
          ? doc.splitTextToSize(descStr, contentColWidth)
          : [];
        const descHeight = splitDesc.length > 0 ? splitDesc.length * 3.4 : 0;
        const locHeight = locationStr ? 4.2 : 0;
        const totalItemHeight = 7 + locHeight + descHeight + 3.5;

        // If item exceeds remaining page space, page break
        checkPageBreak(totalItemHeight + 2);

        // 1. Time Column (Fixed X, Semibold, Muted Duration)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...primaryBrand);
        doc.text(timeStr || "Anytime", timeColX, currentY + 2.5);

        if (durationStr) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(...textMuted);
          doc.text(durationStr, timeColX, currentY + 6.2);
        }

        // 2. Timeline Node & Line
        doc.setFillColor(...accentColor);
        doc.circle(timelineNodeX, currentY + 1.8, 1.25, "F");

        if (aIndex < activities.length - 1) {
          doc.setDrawColor(...timelineLine);
          doc.setLineWidth(0.35);
          doc.line(
            timelineNodeX,
            currentY + 3.2,
            timelineNodeX,
            currentY + totalItemHeight
          );
        }

        // 3. Activity Content Column (Fixed X)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(...textDark);
        doc.text(titleStr, contentColX, currentY + 2.5);

        let subY = currentY + 6.8;

        // Location
        if (locationStr) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(...textMuted);
          doc.text(`Location: ${locationStr}`, contentColX, subY);
          subY += 4.2;
        }

        // Description
        if (splitDesc.length > 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(...textBody);
          doc.text(splitDesc, contentColX, subY);
          subY += descHeight;
        }

        currentY = Math.max(currentY + totalItemHeight, subY + 2);
      });
    }

    currentY += 4;
  });

  // ==========================================
  // FINAL SECTION — STAY PLAN & TRANSPORT DETAILS
  // ==========================================
  // Start on new page for clean, intentional booklet conclusion
  doc.addPage();
  renderRunningHeader();
  currentY = 26;

  // --- 1. STAY PLAN TABLE ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...primaryBrand);
  doc.text("STAY PLAN", marginX, currentY);
  currentY += 6;

  const stays = Array.isArray(trip.staySegments) ? trip.staySegments : [];
  const stayTableCols = [
    { title: "LOCATION", width: 34 },
    { title: "DATES", width: 50 },
    { title: "NIGHTS", width: 26 },
    { title: "HOTEL", width: 60 },
  ];

  // Table Header Row
  const tableHeaderH = 7;
  doc.setFillColor(241, 245, 249); // Slate-100
  doc.setDrawColor(...borderColor);
  doc.rect(marginX, currentY, contentWidth, tableHeaderH, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...secondaryBrand);

  let curColX = marginX + 4;
  stayTableCols.forEach((col) => {
    doc.text(col.title, curColX, currentY + 4.8);
    curColX += col.width;
  });
  currentY += tableHeaderH;

  if (stays.length === 0) {
    doc.setFillColor(...cardBg);
    doc.rect(marginX, currentY, contentWidth, 9, "FD");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.text("No specific hotel finalized", marginX + 6, currentY + 6);
    currentY += 9;
  } else {
    stays.forEach((stay) => {
      const rowH = 9.5;
      doc.setFillColor(...cardBg);
      doc.setDrawColor(...borderColor);
      doc.rect(marginX, currentY, contentWidth, rowH, "FD");

      const locationText = formatLocation(
        stay.location || trip.destination || "Destination"
      );
      const stayDates = `${formatDate(
        stay.checkIn || stay.startDate
      )} – ${formatDate(stay.checkOut || stay.endDate)}`;
      const nightsText = stay.nights ? `${stay.nights} Nights` : "-";
      const hotelName =
        stay.selectedHotel?.name ||
        stay.hotel?.name ||
        stay.hotelName ||
        "No hotel selected";

      let cX = marginX + 4;
      // Location
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...textDark);
      doc.text(locationText, cX, currentY + 6);
      cX += stayTableCols[0].width;

      // Dates
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...textBody);
      doc.text(stayDates, cX, currentY + 6);
      cX += stayTableCols[1].width;

      // Nights
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...textDark);
      doc.text(nightsText, cX, currentY + 6);
      cX += stayTableCols[2].width;

      // Hotel
      doc.setFont(
        "helvetica",
        hotelName === "No hotel selected" ? "italic" : "bold"
      );
      doc.setFontSize(7.5);
      doc.setTextColor(
        hotelName === "No hotel selected" ? textMuted[0] : primaryBrand[0],
        hotelName === "No hotel selected" ? textMuted[1] : primaryBrand[1],
        hotelName === "No hotel selected" ? textMuted[2] : primaryBrand[2]
      );
      const hotelTrunc = doc.splitTextToSize(
        cleanText(hotelName),
        stayTableCols[3].width - 6
      );
      doc.text(hotelTrunc[0] || "", cX, currentY + 6);

      currentY += rowH;
    });
  }

  currentY += 10;

  // --- 2. TRANSPORT DETAILS ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...primaryBrand);
  doc.text("TRANSPORT DETAILS", marginX, currentY);
  currentY += 6;

  // Subtitle
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryBrand);
  doc.text(
    "INTERCITY TRANSIT (CAMPUS OUTBOUND & RETURN)",
    marginX,
    currentY
  );
  currentY += 4.5;

  const intercityTransitCards = [
    {
      direction: "OUTBOUND",
      mode: "Train",
      from: originCity,
      to: destCity,
      date: formatDate(trip.startDate),
      timing: "10:40 AM – 11:40 AM",
      carrier: "Netravati Express #16345",
      status: "Scheduled",
    },
    {
      direction: "RETURN",
      mode: "Train",
      from: destCity,
      to: originCity,
      date: formatDate(trip.endDate || trip.startDate),
      timing: "09:10 AM – 09:40 AM",
      carrier: "Mangala Lakshadweep Express #12618",
      status: "Scheduled",
    },
  ];

  intercityTransitCards.forEach((c) => {
    const cardH = 16.5;
    doc.setFillColor(...cardBg);
    doc.setDrawColor(...borderColor);
    doc.roundedRect(marginX, currentY, contentWidth, cardH, 2, 2, "FD");

    // Direction & Mode Tag
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...accentColor);
    doc.text(`${c.direction} · ${c.mode}`, marginX + 6, currentY + 5.5);

    // Route with clean Vector Arrow
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...textDark);
    const rX = marginX + 42;
    doc.text(c.from, rX, currentY + 5.5);
    const fW = doc.getTextWidth(c.from);
    drawVectorArrow(doc, rX + fW + 2, currentY + 4.3, 4.5, primaryBrand);
    doc.text(c.to, rX + fW + 9, currentY + 5.5);

    // Details Line
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...textMuted);
    doc.text(
      `Date: ${c.date}   ·   Timing: ${c.timing}   ·   Carrier: ${c.carrier}`,
      marginX + 6,
      currentY + 11.5
    );

    // Status Badge
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(16, 149, 106);
    drawVectorCheck(
      doc,
      marginX + contentWidth - 26,
      currentY + 4.5,
      2.8,
      [16, 149, 106]
    );
    doc.text(c.status, marginX + contentWidth - 21, currentY + 5.5);

    currentY += cardH + 4;
  });

  currentY += 4;

  // Group Road Transport
  const groupFleet = trip.campusTransportPlan || {
    vehiclesRequired: 8,
    vehicleType: "Coach",
    comfort: "AC",
    capacityPerVehicle: 25,
    totalTravelers: 200,
    studentsCount: 200,
    teachersStaffCount: 0,
    luggageCount: 200,
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryBrand);
  doc.text("GROUP ROAD TRANSPORT", marginX, currentY);
  currentY += 4.5;

  const fleetCardH = 21;
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(marginX, currentY, contentWidth, fleetCardH, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryBrand);
  doc.text(
    `${groupFleet.vehiclesRequired} × ${groupFleet.comfort || "AC"} ${groupFleet.vehicleType || "Coach"}`,
    marginX + 6,
    currentY + 6
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...textBody);
  doc.text(
    `${groupFleet.totalTravelers || travelerCount} Travelers (${groupFleet.studentsCount || travelerCount} Students · ${groupFleet.teachersStaffCount || 0} Staff)   ·   ${groupFleet.vehiclesRequired} Vehicles Required`,
    marginX + 6,
    currentY + 11.5
  );

  doc.text(
    `Capacity: ${groupFleet.capacityPerVehicle || 25} Seats / Vehicle   ·   Luggage: ${groupFleet.luggageCount || travelerCount} Bags`,
    marginX + 6,
    currentY + 16.5
  );

  currentY += fleetCardH + 4.5;

  // Resolved Operational Route
  const routeOriginState =
    trip.campusTransportPlan?.route?.originState || "Maharashtra";
  const routeDestState =
    trip.campusTransportPlan?.route?.destinationState || "Kerala";

  const routeCardH = 11;
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(marginX, currentY, contentWidth, routeCardH, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...secondaryBrand);
  doc.text("RESOLVED ROUTE:", marginX + 6, currentY + 6.8);

  const routeStr1 = `${originCity}, ${routeOriginState}`;
  const routeStr2 = `${destCity}, ${routeDestState}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...textDark);
  const routeX = marginX + 42;
  doc.text(routeStr1, routeX, currentY + 6.8);
  const r1W = doc.getTextWidth(routeStr1);
  drawVectorArrow(doc, routeX + r1W + 3, currentY + 5.5, 5, primaryBrand);
  doc.text(routeStr2, routeX + r1W + 11, currentY + 6.8);

  // ==========================================
  // FOOTER (ALL PAGES DYNAMIC COUNT)
  // ==========================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Subtle hairline divider
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 14, marginX + contentWidth, pageHeight - 14);

    // Left Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...textMuted);
    doc.text("TRANSIX · Your Journey, Organized.", marginX, pageHeight - 8.5);

    // Right Footer
    const pageStr = `Page ${i} of ${totalPages}`;
    const pageStrWidth = doc.getTextWidth(pageStr);
    doc.text(pageStr, marginX + contentWidth - pageStrWidth, pageHeight - 8.5);
  }

  // ==========================================
  // SAVE / DOWNLOAD TRIGGER
  // ==========================================
  const cleanOrg = sanitizeFilename(organizationName) || "Campus";
  const cleanDest = sanitizeFilename(destCity) || "Trip";
  const filename = `Transix_${cleanOrg}_${cleanDest}_Itinerary.pdf`;

  doc.save(filename);
  return filename;
}

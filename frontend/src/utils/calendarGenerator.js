/**
 * Calendar Generator & Export Utility for Transix Tour Operations
 * 
 * Supports:
 * 1. RFC 5545 compliant iCalendar (.ics) export (works with Google Calendar, Apple Calendar, Outlook)
 * 2. Direct 1-click Google Calendar web event creation
 */

function formatIcsDateTime(dateStr, timeStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    
    let hours = 9;
    let minutes = 0;
    if (timeStr && typeof timeStr === "string") {
      const parts = timeStr.trim().split(":");
      if (parts.length >= 2) {
        hours = parseInt(parts[0], 10) || 9;
        minutes = parseInt(parts[1], 10) || 0;
      }
    }
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  } catch {
    return new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  }
}

function escapeIcsText(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Generate standard RFC 5545 iCalendar content and trigger .ics file download
 */
export function downloadTripIcsFile(trip, events = []) {
  if (!trip) return;

  const eventList = events.length > 0 
    ? events 
    : (trip.bookingSummary?.calendarEvents || []);

  const calendarRows = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Transix//Operations Center//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Transix - ${trip.source ? `${trip.source} to ` : ""}${trip.destination}`,
    "X-WR-TIMEZONE:Asia/Kolkata"
  ];

  const nowStamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  if (eventList.length === 0) {
    // Fallback master event if no granular events exist
    const startStamp = formatIcsDateTime(trip.startDate, "09:00");
    const endStamp = formatIcsDateTime(trip.endDate, "18:00");
    calendarRows.push(
      "BEGIN:VEVENT",
      `UID:trx-master-${trip._id}@transix.in`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART:${startStamp}`,
      `DTEND:${endStamp}`,
      `SUMMARY:${escapeIcsText(`Tour: ${trip.source} → ${trip.destination}`)}`,
      `DESCRIPTION:${escapeIcsText(`Confirmed tour coordinated by Transix Operations. Status: ${trip.status || "CONFIRMED"}`)}`,
      `LOCATION:${escapeIcsText(trip.destination)}`,
      "STATUS:CONFIRMED",
      "END:VEVENT"
    );
  } else {
    eventList.forEach((ev, idx) => {
      const startStamp = formatIcsDateTime(ev.startDate || trip.startDate, ev.startTime || "10:00");
      const endStamp = formatIcsDateTime(ev.startDate || trip.startDate, ev.endTime || "12:00");
      calendarRows.push(
        "BEGIN:VEVENT",
        `UID:trx-${trip._id}-${idx}-${Date.now()}@transix.in`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART:${startStamp}`,
        `DTEND:${endStamp}`,
        `SUMMARY:${escapeIcsText(ev.title || "Tour Event")}`,
        `DESCRIPTION:${escapeIcsText(ev.description || "Transix Confirmed Itinerary Item")}`,
        `LOCATION:${escapeIcsText(ev.location || trip.destination)}`,
        "STATUS:CONFIRMED",
        "END:VEVENT"
      );
    });
  }

  calendarRows.push("END:VCALENDAR");

  const icsBlob = new Blob([calendarRows.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const filename = `Transix_${(trip.destination || "Trip").replace(/\s+/g, "_")}_Schedule.ics`;

  const link = document.createElement("a");
  link.href = window.URL.createObjectURL(icsBlob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(link.href);
}

/**
 * Open Google Calendar web interface with pre-filled master tour details
 */
export function openGoogleCalendarWeb(trip, events = []) {
  if (!trip) return;

  const firstEvent = events[0] || trip.bookingSummary?.calendarEvents?.[0];
  const title = firstEvent?.title || `Transix Tour: ${trip.source ? `${trip.source} → ` : ""}${trip.destination}`;
  const location = firstEvent?.location || trip.destination || "Tour Location";
  const details = firstEvent?.description || `Confirmed Transix Itinerary (${events.length || "All"} items confirmed). Status: ${trip.status || "CONFIRMED"}. Ref: ${trip.bookingSummary?.masterTripCode || trip._id}`;

  const startDate = firstEvent?.startDate || trip.startDate || new Date();
  const endDate = firstEvent?.startDate || trip.endDate || new Date();
  
  const startStamp = formatIcsDateTime(startDate, firstEvent?.startTime || "09:00");
  const endStamp = formatIcsDateTime(endDate, firstEvent?.endTime || "18:00");

  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startStamp}/${endStamp}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
  
  window.open(googleUrl, "_blank", "noopener,noreferrer");
}

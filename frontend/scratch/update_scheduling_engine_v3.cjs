const fs = require("fs");
const path = require("path");

const enginePath = path.resolve("c:/Projects/Transix/frontend/src/utils/schedulingEngine.js");
let content = fs.readFileSync(enginePath, "utf8");

// Detect line ending
const isCRLF = content.includes("\r\n");
const eol = isCRLF ? "\r\n" : "\n";

// Normalize to LF for matching
let normalized = content.replace(/\r\n/g, "\n");

const startMarker = `    if (leg.journeyDirection === "outbound") {`;
const endMarker = `    } else if (leg.journeyDirection === "return") {
      // Return journey: Day 10 (or final day)
      if (dayNum === depDay) {
        const bufferStart = Math.max(baseOffset, baseOffset + depMin - BUFFERS.PRE_DEPARTURE_RETURN);
        constraints.push({
          startMin: bufferStart,
          endMin: baseOffset + depMin,
          type: "buffer",
          reason: \`return station preparation and transfer buffer (minimum 2-3 hours)\`,
        });
        constraints.push({
          startMin: baseOffset + depMin,
          endMin: baseOffset + 1440,
          type: "travel",
          reason: \`return train journey to \${leg.to || "origin"}\`,
        });
      }
    }`;

const sIdx = normalized.indexOf(startMarker);
const eIdx = normalized.indexOf(endMarker);

if (sIdx === -1 || eIdx === -1) {
  console.error("Markers not found:", { sIdx, eIdx });
  process.exit(1);
}

const fullOldSection = normalized.slice(sIdx, eIdx + endMarker.length);

const newSection = `    const isFlight = leg.mode === "flight" || Boolean(leg.flightNumber);
    const transportTypeLabel = isFlight ? "flight" : "train";
    const transportName = leg.flightNumber ? \`\${leg.airline || "Flight"} #\${leg.flightNumber}\` : (leg.trainName || "train");

    if (leg.journeyDirection === "outbound") {
      // Day 1: Station / Airport assembly & pre-departure preparation window
      if (dayNum === depDay) {
        const preBuffer = isFlight ? 120 : BUFFERS.PRE_DEPARTURE_OUTBOUND;
        constraints.push({
          startMin: Math.max(baseOffset, baseOffset + depMin - preBuffer),
          endMin: baseOffset + depMin,
          type: "buffer",
          reason: \`pre-departure \${isFlight ? "airport security & check-in" : "station assembly"} buffer for outbound \${transportTypeLabel} (\${transportName})\`,
        });
        const endDayMin = (arrDay === depDay && arrMin !== null) ? arrMin : 1440;
        constraints.push({
          startMin: baseOffset + depMin,
          endMin: baseOffset + endDayMin,
          type: "travel",
          reason: \`outbound \${transportTypeLabel} journey to \${leg.to || "destination"}\`,
        });
        if (arrDay === depDay && arrMin !== null && arrMin < 1440) {
          constraints.push({
            startMin: baseOffset + arrMin,
            endMin: Math.min(baseOffset + 1440, baseOffset + arrMin + (isFlight ? 60 : BUFFERS.POST_ARRIVAL)),
            type: "buffer",
            reason: \`post-arrival \${isFlight ? "airport exit & transfer" : "station transfer"} buffer at \${leg.to || "destination"}\`,
          });
        }
      } else if (dayNum > depDay && dayNum < arrDay) {
        // Intermediate days: entire calendar day occupied by transit
        constraints.push({
          startMin: baseOffset,
          endMin: baseOffset + 1440,
          type: "travel",
          reason: \`\${transportTypeLabel} journey in transit to \${leg.to || "destination"}\`,
        });
      } else if (dayNum === arrDay && arrDay > depDay) {
        // Arrival day: travel until arrival + post-arrival buffer
        const actualArr = arrMin !== null ? arrMin : 8 * 60;
        constraints.push({
          startMin: baseOffset,
          endMin: baseOffset + actualArr,
          type: "travel",
          reason: \`overnight \${transportTypeLabel} arrival at \${leg.to || "destination"}\`,
        });
        constraints.push({
          startMin: baseOffset + actualArr,
          endMin: Math.min(baseOffset + 1440, baseOffset + actualArr + (isFlight ? 60 : BUFFERS.POST_ARRIVAL)),
          type: "buffer",
          reason: \`post-arrival \${isFlight ? "airport exit & transfer" : "station transfer"} buffer at \${leg.to || "destination"}\`,
        });
      }
    } else if (leg.journeyDirection === "return") {
      // Return journey: Day 10 (or final day)
      if (dayNum === depDay) {
        const preBuffer = isFlight ? 120 : BUFFERS.PRE_DEPARTURE_RETURN;
        const bufferStart = Math.max(baseOffset, baseOffset + depMin - preBuffer);
        constraints.push({
          startMin: bufferStart,
          endMin: baseOffset + depMin,
          type: "buffer",
          reason: \`return \${isFlight ? "airport transfer & security clearance" : "station preparation and transfer"} buffer\`,
        });
        const retEndMin = (arrDay === depDay && arrMin !== null && arrMin > depMin) ? arrMin : 1440;
        constraints.push({
          startMin: baseOffset + depMin,
          endMin: baseOffset + retEndMin,
          type: "travel",
          reason: \`return \${transportTypeLabel} journey to \${leg.to || "origin"}\`,
        });
      }
    }`;

normalized = normalized.replace(fullOldSection, newSection);

// Convert back to original EOL
const finalContent = isCRLF ? normalized.replace(/\n/g, "\r\n") : normalized;
fs.writeFileSync(enginePath, finalContent, "utf8");
console.log("Successfully updated getDayConstraints!");

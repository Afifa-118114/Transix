import fs from "fs";
import path from "path";

const targetFile = "c:/Projects/Transix/frontend/src/utils/schedulingEngine.js";
let code = fs.readFileSync(targetFile, "utf-8");

// 1. Update BUFFERS: PRE_DEPARTURE_RETURN to 120 (2h buffer, aligned with station assembly)
code = code.replace(
  /PRE_DEPARTURE_RETURN:\s*180,/,
  "PRE_DEPARTURE_RETURN: 120,"
);

// 2. Update getActivityLogicalWindow to support Hotel Check-out (04:00 to 15:00) and Hotel Check-in (10:00 to 23:59)
const oldLogicalWindow = `export const getActivityLogicalWindow = (item) => {
  const cat = String(item.category || "").toLowerCase();
  const title = String(item.name || item.activity || "").toLowerCase();

  if (isImmutableTransport(item)) return { start: 0, end: 1440 }; // Transport can be anytime
  if (title.includes("dinner")) return { start: 17 * 60, end: 23 * 60 + 30 }; // 5 PM to 11:30 PM
  if (title.includes("lunch")) return { start: 11 * 60, end: 16 * 60 }; // 11 AM to 4 PM
  if (title.includes("breakfast")) return { start: 6 * 60, end: 11 * 60 }; // 6 AM to 11 AM

  if (cat.includes("museum") || cat.includes("fort") || cat.includes("attraction")) return { start: 8 * 60, end: 20 * 60 }; // 8 AM to 8 PM
  if (cat.includes("shopping") || cat.includes("market")) return { start: 9 * 60, end: 22 * 60 }; // 9 AM to 10 PM
  if (cat.includes("sightseeing")) return { start: 6 * 60, end: 22 * 60 }; // 6 AM to 10 PM
  
  return { start: 6 * 60, end: 23 * 60 + 59 }; // Default 6 AM to Midnight
};`;

const newLogicalWindow = `export const getActivityLogicalWindow = (item) => {
  const cat = String(item.category || "").toLowerCase();
  const title = String(item.name || item.activity || "").toLowerCase();

  if (isImmutableTransport(item)) return { start: 0, end: 1440 }; // Transport can be anytime
  if (title.includes("dinner")) return { start: 17 * 60, end: 23 * 60 + 30 }; // 5 PM to 11:30 PM
  if (title.includes("lunch")) return { start: 11 * 60, end: 16 * 60 }; // 11 AM to 4 PM
  if (title.includes("breakfast")) return { start: 6 * 60, end: 11 * 60 }; // 6 AM to 11 AM

  // Hotel Check-out window: standard 04:00 AM to 03:00 PM (supports early train departure checkouts)
  if (title.includes("check-out") || title.includes("checkout") || title.includes("check out")) {
    return { start: 4 * 60, end: 15 * 60 };
  }
  // Hotel Check-in window: standard 10:00 AM to 11:59 PM (supports late arrivals)
  if (title.includes("check-in") || title.includes("checkin") || title.includes("check in")) {
    return { start: 10 * 60, end: 23 * 60 + 59 };
  }

  if (cat.includes("museum") || cat.includes("fort") || cat.includes("attraction")) return { start: 8 * 60, end: 20 * 60 }; // 8 AM to 8 PM
  if (cat.includes("shopping") || cat.includes("market")) return { start: 9 * 60, end: 22 * 60 }; // 9 AM to 10 PM
  if (cat.includes("sightseeing")) return { start: 6 * 60, end: 22 * 60 }; // 6 AM to 10 PM
  
  return { start: 6 * 60, end: 23 * 60 + 59 }; // Default 6 AM to Midnight
};`;

code = code.replace(oldLogicalWindow, newLogicalWindow);

// 3. Update detectConflicts:
// - Meals on train during transit do not conflict with train transit
// - Do not double-report an activity with generic OVERLAP if it already has TRANSPORT_CONSTRAINT
const oldConstraintLoop = `        for (const block of mergedConstraints) {
          if (block.itemIds && block.itemIds.includes(item.id)) continue;
          if (isImmutableTransport(item)) continue;
          if (absStart < block.endMin && absEnd > block.startMin) {
            
            // Deduplicate internal buffers into a single meaningful message
            let reason = \`Conflicts with \${block.reason}\`;
            let type = "HARD_CONSTRAINT_VIOLATION";
            if (block.type === "buffer" || block.type === "travel") {
                reason = block.reason.includes("travel to") 
                  ? \`Activity conflicts with your travel leg to \${block.reason.split("travel to ")[1]}\` 
                  : \`Activity conflicts with fixed transport.\`;
                type = "TRANSPORT_CONSTRAINT";
            } else if (block.type === "hotel_checkin" || block.type === "hotel_checkout") {
                type = "STAY_BOUNDARY";
            }

            const existing = conflicts.find(c => c.itemId === item.id && c.type === type);
            if (!existing) {
              conflicts.push({
                type,
                severity: "high",
                itemId: item.id,
                itemTitle: item.name || item.activity,
                conflictingItemId: block.itemIds && block.itemIds.length > 0 ? block.itemIds[0] : null,
                reason,
                affectedDay: dayNum
              });
            }
          }
        }

        // Intra-day overlap check between non-transport activities in the same day
        if (dayPrevEnd > baseOffset && absStart < dayPrevEnd) {
           if (!isImmutableTransport(item)) {
             conflicts.push({
               type: "OVERLAP",
               severity: "high",
               itemId: item.id,
               itemTitle: item.name || item.activity,
               conflictingItemId: null,
               reason: \`Overlaps with previous activities\`,
               affectedDay: dayNum
             });
           }
        }
        
        dayPrevEnd = Math.max(dayPrevEnd, absEnd);`;

const newConstraintLoop = `        let hasTransportConflict = false;
        const actLower = String(item.activity || item.name || "").toLowerCase();
        const placeLower = String(item.place || item.location || "").toLowerCase();
        const notesLower = String(item.notes || "").toLowerCase();
        const isOnBoardTrain = actLower.includes("on train") || actLower.includes("in transit") || placeLower.includes("train") || notesLower.includes("on train") || notesLower.includes("train");

        for (const block of mergedConstraints) {
          if (block.itemIds && block.itemIds.includes(item.id)) continue;
          if (isImmutableTransport(item)) continue;

          // On-board meal or activity taking place during train transit is completely valid
          if (isOnBoardTrain && (block.type === "travel" || block.reason?.includes("train"))) {
            continue;
          }

          if (absStart < block.endMin && absEnd > block.startMin) {
            hasTransportConflict = true;
            // Deduplicate internal buffers into a single meaningful message
            let reason = \`Conflicts with \${block.reason}\`;
            let type = "HARD_CONSTRAINT_VIOLATION";
            if (block.type === "buffer" || block.type === "travel") {
                reason = block.reason.includes("travel to") 
                  ? \`Activity conflicts with your travel leg to \${block.reason.split("travel to ")[1]}\` 
                  : \`Activity conflicts with fixed transport.\`;
                type = "TRANSPORT_CONSTRAINT";
            } else if (block.type === "hotel_checkin" || block.type === "hotel_checkout") {
                type = "STAY_BOUNDARY";
            }

            const existing = conflicts.find(c => c.itemId === item.id && c.type === type);
            if (!existing) {
              conflicts.push({
                type,
                severity: "high",
                itemId: item.id,
                itemTitle: item.name || item.activity,
                conflictingItemId: block.itemIds && block.itemIds.length > 0 ? block.itemIds[0] : null,
                reason,
                affectedDay: dayNum
              });
            }
          }
        }

        // Intra-day overlap check between non-transport activities in the same day.
        // Do not double-flag an activity that already violated the preceding transport block.
        if (!hasTransportConflict && dayPrevEnd > baseOffset && absStart < dayPrevEnd) {
           if (!isImmutableTransport(item)) {
             conflicts.push({
               type: "OVERLAP",
               severity: "high",
               itemId: item.id,
               itemTitle: item.name || item.activity,
               conflictingItemId: null,
               reason: \`Overlaps with previous activities\`,
               affectedDay: dayNum
             });
           }
        }
        
        dayPrevEnd = Math.max(dayPrevEnd, absEnd);`;

code = code.replace(oldConstraintLoop, newConstraintLoop);

// 4. Update findExistingTrainRecord arrivalDay calculation (no hardcoded arrivalDay = 2 or dIdx + 2)
code = code.replace(
  /const arrDay = leg\.arrivalDay \|\| \(targetDir === "return" \? depDay : 2\);/,
  `const legDur = leg.durationMinutes || (depMin !== null && arrMin !== null ? (arrMin >= depMin ? arrMin - depMin : arrMin + 1440 - depMin) : 180);
      const arrDay = leg.arrivalDay || (depDay + Math.floor(((depMin || 0) + legDur) / 1440));`
);

code = code.replace(
  /const arrDay = targetDir === "outbound" \? Math\.min\(totalDays, dIdx \+ 2\) : depDay;/,
  `const itemDur = item.durationMinutes || (depMin !== null && arrMin !== null ? (arrMin >= depMin ? arrMin - depMin : arrMin + 1440 - depMin) : 180);
          const arrDay = targetDir === "outbound" ? (depDay + Math.floor(((depMin || 0) + itemDur) / 1440)) : depDay;`
);

// 5. Update scheduleTrainJourneyIntoTrip Day 2 arrival alignment with BUFFERS.POST_ARRIVAL
code = code.replace(
  /const exitStationMin = Math\.min\(1440, arrLocal \+ 50\);\s*const hotelArrivalMin = Math\.min\(1440, exitStationMin \+ 30\);/,
  `const exitStationMin = Math.min(1440, arrLocal + 60);
      const hotelArrivalMin = Math.min(1440, arrLocal + BUFFERS.POST_ARRIVAL);`
);

// 6. Update scheduleTrainJourneyIntoTrip Day 7 checkout detection and deduplication
const oldCheckoutBlock = `      // Check for Hotel Check-out: NEVER remove check-out!
      const isCheckout = (cat === "operational" || cat === "accommodation" || cat === "stay") &&
        (act.includes("checkout") || act.includes("check-out") || act.includes("check out"));
      if (isCheckout) {
        checkoutFound = true;
        // Check-out should adapt to departure time: standard 11:00 AM, or before departure
        let coStartMin = 11 * 60;
        if (retDepMin <= 12 * 60) {
          coStartMin = Math.max(5 * 60, assemblyStartMin - 45);
        }
        preservedFinalDay.push({
          ...item,
          startTime: minutesToTimeStr(coStartMin),
          endTime: minutesToTimeStr(coStartMin + 30),
          time: \`\${minutesToTimeStr(coStartMin)} - \${minutesToTimeStr(coStartMin + 30)}\`,
        });
        itineraryAdjustments.push(\`Hotel check-out scheduled for \${minutesToTimeStr(coStartMin)}.\`);
        return;
      }`;

const newCheckoutBlock = `      // Check for Hotel Check-out: NEVER remove check-out!
      const isCheckout = (cat === "hotel" || cat === "operational" || cat === "accommodation" || cat === "stay") &&
        (act.includes("checkout") || act.includes("check-out") || act.includes("check out") || act.includes("check-in / check-out")) ||
        act.includes("hotel check-out") || act.includes("hotel checkout");
      if (isCheckout) {
        checkoutFound = true;
        // Check-out should adapt to departure time: standard 10:30 or 11:00 AM, or before station assembly
        const existingStart = timeToMinutes(item.startTime || (item.time ? String(item.time).split("-")[0] : null));
        let coStartMin = 11 * 60;
        if (assemblyStartMin <= 11 * 60) {
          coStartMin = Math.max(4 * 60, assemblyStartMin - 45);
        } else if (existingStart !== null && existingStart < assemblyStartMin && existingStart >= 7 * 60) {
          coStartMin = existingStart;
        }
        preservedFinalDay.push({
          ...item,
          category: item.category || "hotel",
          startTime: minutesToTimeStr(coStartMin),
          endTime: minutesToTimeStr(coStartMin + 30),
          time: \`\${minutesToTimeStr(coStartMin)} - \${minutesToTimeStr(coStartMin + 30)}\`,
        });
        itineraryAdjustments.push(\`Hotel check-out scheduled for \${minutesToTimeStr(coStartMin)}.\`);
        return;
      }`;

code = code.replace(oldCheckoutBlock, newCheckoutBlock);

// 7. Update Day 7 fallback checkout insertion to use category "hotel" and prevent duplicate
const oldFallbackCheckout = `    // If check-out wasn't in the plan, insert standard check-out before station assembly
    if (!checkoutFound) {
      let coStartMin = 11 * 60;
      if (retDepMin <= 12 * 60) {
        coStartMin = Math.max(5 * 60, assemblyStartMin - 45);
      }
      preservedFinalDay.push({
        id: \`sync-checkout-final-day\`,
        activity: \`Hotel Check-out & Luggage Storage\`,
        name: \`Hotel Check-out\`,
        place: fromName,
        category: "operational",
        categoryLabel: "Operational",
        startTime: minutesToTimeStr(coStartMin),
        endTime: minutesToTimeStr(coStartMin + 30),
        time: \`\${minutesToTimeStr(coStartMin)} - \${minutesToTimeStr(coStartMin + 30)}\`,
        duration: "30m",
        durationMinutes: 30,
      });
      itineraryAdjustments.push(\`Hotel check-out scheduled for \${minutesToTimeStr(coStartMin)}.\`);
    }`;

const newFallbackCheckout = `    // If check-out wasn't in the plan, insert standard check-out before station assembly
    if (!checkoutFound) {
      let coStartMin = 11 * 60;
      if (assemblyStartMin <= 11 * 60) {
        coStartMin = Math.max(4 * 60, assemblyStartMin - 45);
      }
      preservedFinalDay.push({
        id: \`sync-checkout-final-day\`,
        activity: \`Hotel Check-out & Luggage Storage\`,
        name: \`Hotel Check-out\`,
        place: fromName,
        category: "hotel",
        categoryLabel: "Stay",
        startTime: minutesToTimeStr(coStartMin),
        endTime: minutesToTimeStr(coStartMin + 30),
        time: \`\${minutesToTimeStr(coStartMin)} - \${minutesToTimeStr(coStartMin + 30)}\`,
        duration: "30m",
        durationMinutes: 30,
      });
      itineraryAdjustments.push(\`Hotel check-out scheduled for \${minutesToTimeStr(coStartMin)}.\`);
    }`;

code = code.replace(oldFallbackCheckout, newFallbackCheckout);

fs.writeFileSync(targetFile, code, "utf-8");
console.log("Successfully patched schedulingEngine.js with comprehensive conflict fixes!");

const Train = require("../models/Train");

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function calculateDuration(departure, arrival, departureDay = 1, arrivalDay = 1) {
  if (!departure || !arrival || departure === "Source" || arrival === "Destination") {
    return "0h 0m";
  }

  const [depHour, depMin] = departure.split(":").map(Number);
  const [arrHour, arrMin] = arrival.split(":").map(Number);

  if (isNaN(depHour) || isNaN(depMin) || isNaN(arrHour) || isNaN(arrMin)) {
    return "0h 0m";
  }

  let depMinutes = depHour * 60 + depMin;
  let arrMinutes = arrHour * 60 + arrMin;

  const depDayNum = Number(departureDay) || 1;
  let arrDayNum = Number(arrivalDay) || depDayNum;

  if (arrDayNum < depDayNum) {
    arrDayNum = depDayNum;
  }

  arrMinutes += (arrDayNum - depDayNum) * 24 * 60;

  if (arrMinutes < depMinutes) {
    arrMinutes += 24 * 60;
  }

  const totalMinutes = arrMinutes - depMinutes;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr || timeStr === "Source" || timeStr === "Destination") return 0;
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

function formatStation(station) {
  if (!station) {
    return {
      name: "",
      code: "",
      arrival: "",
      departure: "",
      distance: 0,
      day: 1,
    };
  }

  const parts = (station.stationName || "").split(" - ");
  const name = parts[0]?.trim() || station.stationName || "";
  const code = (parts[parts.length - 1] || "").trim().toUpperCase();

  let distanceNum = 0;
  if (typeof station.distance === "string") {
    distanceNum = Number(station.distance.replace(/[^0-9.]/g, "")) || 0;
  } else if (typeof station.distance === "number") {
    distanceNum = station.distance;
  }

  return {
    name,
    code,
    arrival: station.arrives,
    departure: station.departs,
    distance: distanceNum,
    day: Number(station.day) || 1,
  };
}

function buildCandidatesRegex(candidates) {
  if (!candidates) return null;
  const codePatterns = (candidates.codes || []).map((c) => `- ${escapeRegex(c)}$`);
  const namePatterns = (candidates.stationNames || []).map((n) => `^${escapeRegex(n)}$`);
  const all = [...codePatterns, ...namePatterns];
  if (all.length === 0) return null;
  return new RegExp(all.join("|"), "i");
}

function isStationMatchingCandidates(station, candidates) {
  if (!station || !candidates) return false;
  const stationName = station.stationName || "";
  const parts = stationName.split(" - ");
  const code = (parts[parts.length - 1] || "").trim().toUpperCase();

  if (candidates.codes && candidates.codes.includes(code)) {
    return true;
  }
  if (
    candidates.stationNames &&
    candidates.stationNames.some(
      (sn) => sn.toLowerCase() === stationName.toLowerCase(),
    )
  ) {
    return true;
  }
  return false;
}

async function searchDirectTrains(sourceCandidates, destCandidates, travelDate = null) {
  if (
    (!sourceCandidates.codes || sourceCandidates.codes.length === 0) &&
    (!sourceCandidates.stationNames || sourceCandidates.stationNames.length === 0)
  ) {
    return [];
  }
  if (
    (!destCandidates.codes || destCandidates.codes.length === 0) &&
    (!destCandidates.stationNames || destCandidates.stationNames.length === 0)
  ) {
    return [];
  }

  const srcRegex = buildCandidatesRegex(sourceCandidates);
  const destRegex = buildCandidatesRegex(destCandidates);

  if (!srcRegex || !destRegex) return [];

  const trains = await Train.find({
    $and: [
      { "trainRoute.stationName": { $regex: srcRegex } },
      { "trainRoute.stationName": { $regex: destRegex } },
    ],
  });

  const results = [];
  const seenTrainNumbers = new Set();

  for (const train of trains) {
    if (seenTrainNumbers.has(train.trainNumber)) continue;

    let sourceIndex = -1;
    let destinationIndex = -1;

    for (let i = 0; i < train.trainRoute.length; i++) {
      const station = train.trainRoute[i];
      if (isStationMatchingCandidates(station, sourceCandidates)) {
        if (sourceIndex === -1) {
          sourceIndex = i;
        }
      }
      if (
        sourceIndex !== -1 &&
        i > sourceIndex &&
        isStationMatchingCandidates(station, destCandidates)
      ) {
        destinationIndex = i;
      }
    }

    if (
      sourceIndex !== -1 &&
      destinationIndex !== -1 &&
      sourceIndex < destinationIndex
    ) {
      // Check travel date operating day if provided
      if (travelDate && train.runningDays) {
        const dateObj = new Date(travelDate);
        if (!isNaN(dateObj.getTime())) {
          const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
          const dayKey = daysOfWeek[dateObj.getDay()];
          if (train.runningDays[dayKey] === false) {
            continue;
          }
        }
      }

      const journey = train.trainRoute.slice(sourceIndex, destinationIndex + 1);
      const from = formatStation(journey[0]);
      const to = formatStation(journey[journey.length - 1]);

      const depTime =
        journey[0].departs !== "Source" ? journey[0].departs : journey[0].arrives;
      const arrTime =
        journey[journey.length - 1].arrives !== "Destination"
          ? journey[journey.length - 1].arrives
          : journey[journey.length - 1].departs;

      const durationStr = calculateDuration(depTime, arrTime, from.day, to.day);
      const distDiff = Math.max(0, to.distance - from.distance);

      const standardFare = Math.round(distDiff * 1.15) || 1450;
      const sleeperFare = Math.round(120 + distDiff * 0.45);
      const thirdAcFare = Math.round(450 + distDiff * 1.15);
      const secondAcFare = Math.round(750 + distDiff * 1.65);
      const firstAcFare = Math.round(1200 + distDiff * 2.5);

      const durMatch = durationStr.match(/\d+/g);
      const durHours = durMatch ? Number(durMatch[0]) || 0 : 0;
      const durMins = durMatch && durMatch[1] ? Number(durMatch[1]) || 0 : 0;
      const totalDurationMins = durHours * 60 + durMins;

      const isGatewayStation = ["NCJ", "NCJT", "DMV", "SCL", "GHY", "KYQ"].includes(to.code);
      const gatewayLabel =
        to.code === "NCJ" || to.code === "NCJT"
          ? "Nagercoil Jn (Kanyakumari Railhead • 18 km)"
          : ["GHY", "KYQ"].includes(to.code)
            ? "Guwahati (NE Gateway Station)"
            : to.code === "DMV"
              ? "Dimapur (Manipur/Nagaland Gateway)"
              : to.code === "SCL"
                ? "Silchar (Barak Valley Gateway)"
                : null;

      results.push({
        trainNumber: train.trainNumber,
        trainName: train.trainName,
        type: train.type || "Express",

        from,
        to,
        source: from.name,
        destination: to.name,
        isGateway: isGatewayStation,
        gatewayLabel,
        destinationType: isGatewayStation ? "gateway" : "direct",

        departure: depTime,
        arrival: arrTime,

        duration: durationStr,
        durationMinutes: totalDurationMins,
        distance: `${distDiff} kms`,
        totalStops: journey.length - 1,
        stops: journey.length - 1,

        price: standardFare,
        fare: standardFare,
        fares: {
          SL: sleeperFare,
          "3A": thirdAcFare,
          "2A": secondAcFare,
          "1A": firstAcFare,
        },

        runningDays: train.runningDays || {},
        route: journey.map(formatStation),

        recommended: false,
      });

      seenTrainNumbers.add(train.trainNumber);
    }
  }

  results.sort((a, b) => {
    return (a.durationMinutes || 0) - (b.durationMinutes || 0);
  });

  if (results.length > 0) {
    results[0].recommended = true;
  }

  return results;
}

async function searchConnectingTrains(sourceCandidates, destCandidates, travelDate = null) {
  const srcRegex = buildCandidatesRegex(sourceCandidates);
  const destRegex = buildCandidatesRegex(destCandidates);

  if (!srcRegex || !destRegex) return [];

  const sourceTrains = await Train.find({
    "trainRoute.stationName": { $regex: srcRegex },
  }).limit(100);

  const destTrains = await Train.find({
    "trainRoute.stationName": { $regex: destRegex },
  }).limit(100);

  const journeys = [];
  const seenPairs = new Set();

  for (const firstTrain of sourceTrains) {
    let srcIdx1 = -1;
    for (let i = 0; i < firstTrain.trainRoute.length; i++) {
      if (isStationMatchingCandidates(firstTrain.trainRoute[i], sourceCandidates)) {
        srcIdx1 = i;
        break;
      }
    }
    if (srcIdx1 === -1) continue;

    for (const secondTrain of destTrains) {
      if (firstTrain.trainNumber === secondTrain.trainNumber) continue;

      let destIdx2 = -1;
      for (let j = secondTrain.trainRoute.length - 1; j >= 0; j--) {
        if (isStationMatchingCandidates(secondTrain.trainRoute[j], destCandidates)) {
          destIdx2 = j;
          break;
        }
      }
      if (destIdx2 === -1) continue;

      // Find common interchange station after srcIdx1 in train1 and before destIdx2 in train2
      for (let i = srcIdx1 + 1; i < firstTrain.trainRoute.length; i++) {
        const st1 = firstTrain.trainRoute[i];
        const code1 = (st1.stationName.split(" - ")[1] || "").trim().toUpperCase();

        for (let j = 0; j < destIdx2; j++) {
          const st2 = secondTrain.trainRoute[j];
          const code2 = (st2.stationName.split(" - ")[1] || "").trim().toUpperCase();

          if (code1 && code1 === code2) {
            const pairKey = `${firstTrain.trainNumber}-${secondTrain.trainNumber}`;
            if (seenPairs.has(pairKey)) continue;

            const t1Dep = firstTrain.trainRoute[srcIdx1].departs !== "Source" ? firstTrain.trainRoute[srcIdx1].departs : firstTrain.trainRoute[srcIdx1].arrives;
            const t1Arr = st1.arrives !== "Destination" ? st1.arrives : st1.departs;
            const t2Dep = st2.departs !== "Source" ? st2.departs : st2.arrives;
            const t2Arr = secondTrain.trainRoute[destIdx2].arrives !== "Destination" ? secondTrain.trainRoute[destIdx2].arrives : secondTrain.trainRoute[destIdx2].departs;

            const arr1Mins = parseTimeToMinutes(t1Arr);
            const dep2Mins = parseTimeToMinutes(t2Dep);

            let layoverMins = dep2Mins - arr1Mins;
            if (layoverMins < 0) {
              layoverMins += 24 * 60;
            }

            // Reasonable transfer layover (45 mins to 14 hours)
            if (layoverMins >= 45 && layoverMins <= 840) {
              const leg1From = formatStation(firstTrain.trainRoute[srcIdx1]);
              const leg1To = formatStation(st1);
              const leg2From = formatStation(st2);
              const leg2To = formatStation(secondTrain.trainRoute[destIdx2]);

              const leg1Dur = calculateDuration(t1Dep, t1Arr, leg1From.day, leg1To.day);
              const leg2Dur = calculateDuration(t2Dep, t2Arr, leg2From.day, leg2To.day);

              const getMins = (dur) => {
                const match = dur.match(/\d+/g);
                if (!match) return 0;
                return (Number(match[0]) || 0) * 60 + (Number(match[1]) || 0);
              };

              const totalMins = getMins(leg1Dur) + layoverMins + getMins(leg2Dur);
              const totalHours = Math.floor(totalMins / 60);
              const remainingMins = totalMins % 60;
              const totalDurationStr = `${totalHours}h ${remainingMins}m`;

              const dist1 = Math.max(0, leg1To.distance - leg1From.distance);
              const dist2 = Math.max(0, leg2To.distance - leg2From.distance);
              const totalDist = dist1 + dist2;
              const fare = Math.round(totalDist * 1.2) || 1850;

              // Full composite train representation
              const compositeTrain = {
                trainNumber: `${firstTrain.trainNumber} ➔ ${secondTrain.trainNumber}`,
                trainName: `${firstTrain.trainName} + ${secondTrain.trainName}`,
                type: "Connecting",
                isConnecting: true,
                changeAt: leg1To.name,
                interchangeCode: code1,
                layover: `${Math.floor(layoverMins / 60)}h ${layoverMins % 60}m`,

                from: leg1From,
                to: leg2To,
                source: leg1From.name,
                destination: leg2To.name,

                departure: t1Dep,
                arrival: t2Arr,
                duration: totalDurationStr,
                durationMinutes: totalMins,
                distance: `${totalDist} kms`,
                stops: (i - srcIdx1) + (destIdx2 - j),
                totalStops: (i - srcIdx1) + (destIdx2 - j),
                price: fare,
                fare: fare,
                fares: {
                  SL: Math.round(180 + totalDist * 0.45),
                  "3A": Math.round(600 + totalDist * 1.15),
                  "2A": Math.round(950 + totalDist * 1.65),
                },
                firstLeg: {
                  trainNumber: firstTrain.trainNumber,
                  trainName: firstTrain.trainName,
                  from: leg1From.name,
                  to: leg1To.name,
                  departure: t1Dep,
                  arrival: t1Arr,
                  duration: leg1Dur,
                },
                secondLeg: {
                  trainNumber: secondTrain.trainNumber,
                  trainName: secondTrain.trainName,
                  from: leg2From.name,
                  to: leg2To.name,
                  departure: t2Dep,
                  arrival: t2Arr,
                  duration: leg2Dur,
                },
                route: [
                  ...firstTrain.trainRoute.slice(srcIdx1, i + 1).map(formatStation),
                  ...secondTrain.trainRoute.slice(j + 1, destIdx2 + 1).map(formatStation),
                ],
              };

              journeys.push(compositeTrain);
              seenPairs.add(pairKey);
            }
          }
        }
        if (journeys.length >= 15) break;
      }
      if (journeys.length >= 15) break;
    }
    if (journeys.length >= 15) break;
  }

  journeys.sort((a, b) => (a.durationMinutes || 0) - (b.durationMinutes || 0));
  return journeys;
}

module.exports = {
  searchDirectTrains,
  searchConnectingTrains,
  calculateDuration,
  formatStation,
};

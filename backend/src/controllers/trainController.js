const { resolveStationCandidates } = require("../services/stationService");
const {
  searchDirectTrains,
  searchConnectingTrains,
} = require("../services/trainPlannerService");
const liveRailService = require("../services/liveRailService");

const searchTrains = async (req, res) => {
  try {
    const { source, destination, date, liveOnly } = req.query;

    if (!source || !destination) {
      return res.status(400).json({
        message: "Source and destination are required",
      });
    }

    console.log(
      `[Train Search] Source: "${source}", Destination: "${destination}", Date: "${date || "None"}"`,
    );

    const sourceCandidates = await resolveStationCandidates(source);
    const destinationCandidates = await resolveStationCandidates(destination);

    console.log(
      `[Train Search] Resolved Source codes (${sourceCandidates.codes.length}):`,
      sourceCandidates.codes.slice(0, 10),
    );
    console.log(
      `[Train Search] Resolved Destination codes (${destinationCandidates.codes.length}):`,
      destinationCandidates.codes.slice(0, 10),
    );

    // 1. Try Live RapidAPI Search if key is configured
    if (process.env.RAPIDAPI_KEY && sourceCandidates.codes.length > 0 && destinationCandidates.codes.length > 0) {
      try {
        const fromCode = sourceCandidates.codes[0];
        const toCode = destinationCandidates.codes[0];
        console.log(`[Train Search] Attempting Live RapidAPI search: ${fromCode} -> ${toCode} for ${date}`);
        
        const liveTrains = await liveRailService.getLiveTrainsBetweenStations(fromCode, toCode, date);
        if (liveTrains && liveTrains.length > 0) {
          console.log(`[Train Search] Found ${liveTrains.length} LIVE trains via RapidAPI`);
          return res.json({
            type: "direct",
            isLive: true,
            source: "rapidapi",
            resolvedSource: sourceCandidates.codes,
            resolvedDestination: destinationCandidates.codes,
            trains: liveTrains,
            total: liveTrains.length,
          });
        }
      } catch (liveErr) {
        console.warn(`[Train Search] Live RapidAPI search failed or returned error, falling back to database: ${liveErr.message}`);
        if (liveOnly === 'true') {
          return res.status(502).json({
            message: `Live train service error: ${liveErr.message}`
          });
        }
      }
    }

    // 2. Database Fallback (Kaggle Dataset in MongoDB)
    const direct = await searchDirectTrains(
      sourceCandidates,
      destinationCandidates,
      date,
    );

    if (direct.length > 0) {
      console.log(`[Train Search] Found ${direct.length} direct trains (Database)`);
      return res.json({
        type: "direct",
        isLive: false,
        source: "database",
        resolvedSource: sourceCandidates.codes,
        resolvedDestination: destinationCandidates.codes,
        trains: direct,
        total: direct.length,
      });
    }

    console.log(
      `[Train Search] No direct trains found, checking connecting journeys...`,
    );
    const connecting = await searchConnectingTrains(
      sourceCandidates,
      destinationCandidates,
      date,
    );

    if (connecting.length > 0) {
      console.log(
        `[Train Search] Found ${connecting.length} connecting journeys (Database)`,
      );
      return res.json({
        type: "connecting",
        isLive: false,
        source: "database",
        resolvedSource: sourceCandidates.codes,
        resolvedDestination: destinationCandidates.codes,
        trains: connecting,
        journeys: connecting,
        total: connecting.length,
      });
    }

    return res.json({
      type: "none",
      isLive: false,
      resolvedSource: sourceCandidates.codes,
      resolvedDestination: destinationCandidates.codes,
      trains: [],
      total: 0,
    });
  } catch (error) {
    console.error("Train Search Error:", error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

/**
 * Live Seat Availability Endpoint
 * GET /api/trains/availability?trainNo=12952&from=NDLS&to=MMCT&date=2026-10-15&class=3A
 */
const checkSeatAvailability = async (req, res) => {
  try {
    const { trainNo, from, to, date, class: classType, quota = 'GN' } = req.query;

    if (!trainNo || !from || !to || !date) {
      return res.status(400).json({
        message: "trainNo, from, to, date are required parameters",
      });
    }

    if (classType) {
      const availability = await liveRailService.getLiveSeatAvailability(
        trainNo,
        from,
        to,
        date,
        classType,
        quota
      );
      return res.json({ success: true, data: availability });
    } else {
      // Check for all major classes (SL, 3A, 2A, 1A)
      const allAvailability = await liveRailService.getAllClassAvailability(
        trainNo,
        from,
        to,
        date,
        ['SL', '3A', '2A', '1A'],
        quota
      );
      return res.json({ success: true, data: allAvailability });
    }
  } catch (error) {
    console.error("[Train Availability Error]:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch seat availability",
    });
  }
};

/**
 * Live PNR Status Check
 * GET /api/trains/pnr/:pnr
 */
const checkPNRStatus = async (req, res) => {
  try {
    const { pnr } = req.params;
    if (!pnr || pnr.length !== 10) {
      return res.status(400).json({
        message: "A valid 10-digit PNR number is required",
      });
    }

    const pnrDetails = await liveRailService.getLivePNRStatus(pnr);
    return res.json({ success: true, data: pnrDetails });
  } catch (error) {
    console.error("[Train PNR Error]:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch PNR status",
    });
  }
};

/**
 * Live Train Running Status (GPS / Station Delay)
 * GET /api/trains/live-status?trainNo=12952&date=2026-10-15
 */
const getTrainLiveStatus = async (req, res) => {
  try {
    const { trainNo, date } = req.query;
    if (!trainNo) {
      return res.status(400).json({
        message: "trainNo is required",
      });
    }

    const liveStatus = await liveRailService.getLiveTrainStatus(trainNo, date);
    return res.json({ success: true, data: liveStatus });
  } catch (error) {
    console.error("[Train Live Status Error]:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch train running status",
    });
  }
};

module.exports = {
  searchTrains,
  checkSeatAvailability,
  checkPNRStatus,
  getTrainLiveStatus,
};


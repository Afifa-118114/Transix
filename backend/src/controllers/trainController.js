const { resolveStationCandidates } = require("../services/stationService");
const {
  searchDirectTrains,
  searchConnectingTrains,
} = require("../services/trainPlannerService");

const searchTrains = async (req, res) => {
  try {
    const { source, destination, date } = req.query;

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

    const direct = await searchDirectTrains(
      sourceCandidates,
      destinationCandidates,
      date,
    );

    if (direct.length > 0) {
      console.log(`[Train Search] Found ${direct.length} direct trains`);
      return res.json({
        type: "direct",
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
        `[Train Search] Found ${connecting.length} connecting journeys`,
      );
      return res.json({
        type: "connecting",
        resolvedSource: sourceCandidates.codes,
        resolvedDestination: destinationCandidates.codes,
        trains: connecting,
        journeys: connecting,
        total: connecting.length,
      });
    }

    return res.json({
      type: "none",
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

module.exports = {
  searchTrains,
};

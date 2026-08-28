const { fetchTravelOptions } = require("../services/travelService");
const AppError = require("../utils/AppError");
const { success, failure } = require("../utils/response");

exports.getTravelOptions = async (req, res) => {
  try {
    const { source, destination } = req.query;

    if (!source || !destination) {
      throw new AppError("Source and destination required", 400);
    }

    const data = await fetchTravelOptions(source, destination);

    return success(res, data);
  } catch (err) {
    return failure(res, err, {
      train: [],
      cab: [],
    });
  }
};


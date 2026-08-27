const mongoose = require("mongoose");

const trainSchema = new mongoose.Schema({}, { strict: false });

module.exports = mongoose.model("Train", trainSchema);

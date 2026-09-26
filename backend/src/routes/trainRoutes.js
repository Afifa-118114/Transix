const express = require("express");
const router = express.Router();

const {
  searchTrains,
  checkSeatAvailability,
  checkPNRStatus,
  getTrainLiveStatus,
} = require("../controllers/trainController");

// Train search (RapidAPI Live with MongoDB Kaggle fallback)
router.get("/search", searchTrains);

// Live seat availability per class (SL, 3A, 2A, 1A)
router.get("/availability", checkSeatAvailability);

// Live PNR status check
router.get("/pnr/:pnr", checkPNRStatus);

// Live train running status (delay, current location)
router.get("/live-status", getTrainLiveStatus);

module.exports = router;


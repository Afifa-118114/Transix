const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { getHotels, getPlaces, getPlaceImage } = require("../controllers/placeController");

router.get("/image", getPlaceImage);
router.get("/hotels", authMiddleware, getHotels);
router.get("/search", authMiddleware, getPlaces);

module.exports = router;

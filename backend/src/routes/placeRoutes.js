const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/authMiddleware");
const { getHotels, getPlaces, getPlaceImage, getAttractionPhoto, geocodePlace, getItineraryImage } = require("../controllers/placeController");

router.get("/geocode", geocodePlace);
router.get("/image", getPlaceImage);
router.get("/itinerary-image", getItineraryImage);
router.get("/attraction-photo", getAttractionPhoto);
router.get("/hotels", authMiddleware, getHotels);
router.get("/search", authMiddleware, getPlaces);

module.exports = router;

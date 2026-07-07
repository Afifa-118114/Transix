const express = require("express");
const router = express.Router();

const { getTravelOptions } = require("../controllers/travelController");

router.get("/", getTravelOptions);

module.exports = router;

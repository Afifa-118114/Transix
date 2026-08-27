const express = require("express");
const router = express.Router();

const { searchTrains } = require("../controllers/trainController");

router.get("/search", searchTrains);

module.exports = router;

const express = require("express");

const router = express.Router();

const {
  registerUser,
  loginUser,
  googleAuth,
  getOperatorsDirectory,
} = require("../controllers/authController");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google", googleAuth);
router.get("/operators", getOperatorsDirectory);

module.exports = router;


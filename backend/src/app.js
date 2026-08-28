const express = require("express");
const cors = require("cors");

const tripRoutes = require("./routes/tripRoutes");
const authRoutes = require("./routes/authRoutes");
const errorHandler = require("./middleware/errMiddleware");
const aiRoutes = require("./routes/aiRoutes");
const placeRoutes = require("./routes/placeRoutes");
const travelRoutes = require("./routes/travelRoutes");
const trainRoutes = require("./routes/trainRoutes");
const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]
    : true,
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API is running..");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Transix backend is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/places", placeRoutes);
app.use("/api/travel", travelRoutes);
app.use("/api/trains", trainRoutes);
app.use(errorHandler);

module.exports = app;

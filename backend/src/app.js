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

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API is running..");
});

app.use("/api/auth", authRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/places", placeRoutes);
app.use("/api/travel", travelRoutes);
app.use("/api/trains", trainRoutes);
app.use(errorHandler);

module.exports = app;

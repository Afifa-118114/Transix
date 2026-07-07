const axios = require("axios");

async function getCoordinates(place) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      place,
    )}&format=json&limit=1`;

    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Transix-App",
      },
      timeout: 8000,
    });

    if (!data.length) {
      throw new Error("Location not found");
    }

    return {
      lat: Number(data[0].lat),
      lng: Number(data[0].lon),
    };
  } catch (err) {
    throw new Error(err.message);
  }
}

module.exports = { getCoordinates };

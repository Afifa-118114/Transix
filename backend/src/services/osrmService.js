const axios = require("axios");

async function getRoute(sLat, sLng, dLat, dLng) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${sLng},${sLat};${dLng},${dLat}?overview=false`;

    const { data } = await axios.get(url, {
      timeout: 8000,
    });

    if (!data.routes.length) {
      throw new Error("No route found");
    }

    return {
      distance: data.routes[0].distance,
      duration: data.routes[0].duration,
    };
  } catch (err) {
    throw new Error(err.message);
  }
}

module.exports = { getRoute };

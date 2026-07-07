const axios = require("axios");

const getDestinationImage = async (destination) => {
  try {
    const response = await axios.get("https://api.pexels.com/v1/search", {
      headers: {
        Authorization: process.env.PEXELS_API_KEY,
      },
      params: {
        query: `${destination} city`,
        per_page: 1,
        orientation: "landscape",
      },
    });

    if (response.data.photos.length > 0) {
      return response.data.photos[0].src.landscape;
    }

    return null;
  } catch (error) {
    console.error("Pexels Error:", error.message);
    return null;
  }
};

module.exports = {
  getDestinationImage,
};

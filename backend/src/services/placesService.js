const axios = require("axios");

const BASE_URL = "https://places.googleapis.com/v1/places:searchText";

const headers = {
  "Content-Type": "application/json",
  "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
  "X-Goog-FieldMask":
    "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri,places.photos",
};

const searchHotels = async (destination) => {
  const response = await axios.post(
    BASE_URL,
    {
      textQuery: `Hotels in ${destination}`,
    },
    {
      headers,
    },
  );

  console.log(JSON.stringify(response.data, null, 2));

  return response.data.places || [];
};

const searchPlaces = async (destination, category) => {
  const response = await axios.post(
    BASE_URL,
    {
      textQuery: `${category} in ${destination}`,
    },
    {
      headers,
    },
  );

  return response.data.places || [];
};

const getPhotoUrl = (photoName, maxWidth = 600) => {
  if (!photoName) return null;

  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
};

const getEstimatedPrice = (priceLevel) => {
  switch (priceLevel) {
    case "PRICE_LEVEL_FREE":
      return "Free";

    case "PRICE_LEVEL_INEXPENSIVE":
      return "₹1,200";

    case "PRICE_LEVEL_MODERATE":
      return "₹2,800";

    case "PRICE_LEVEL_EXPENSIVE":
      return "₹5,500";

    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return "₹9,500";

    default:
      return "₹2,000";
  }
};

module.exports = {
  searchHotels,
  searchPlaces,
  getPhotoUrl,
  getEstimatedPrice,
};

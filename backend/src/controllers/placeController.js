const asyncHandler = require("../middleware/asyncHandler");
const {
  searchHotels,
  searchPlaces,
  getPhotoUrl,
  getEstimatedPrice,
} = require("../services/placesService");

const getHotels = asyncHandler(async (req, res) => {
  const { destination } = req.query;

  if (!destination) {
    return res.status(400).json({
      success: false,
      message: "Destination is required",
    });
  }

  const places = await searchHotels(destination);

  const hotels = places.map((place) => ({
    id: place.id,
    name: place.displayName.text,
    address: place.formattedAddress,
    rating: place.rating,
    reviews: place.userRatingCount,
    mapsUrl: place.googleMapsUri,
    website: place.websiteUri,
    phone: place.nationalPhoneNumber,
    image: place.photos?.length ? getPhotoUrl(place.photos[0].name) : null,

    photos:
      place.photos?.slice(0, 5).map((photo) => ({
        url: getPhotoUrl(photo.name),
      })) || [],

    price: getEstimatedPrice(place.priceLevel),
  }));

  res.json({
    success: true,
    count: hotels.length,
    hotels,
  });
});

const getPlaces = asyncHandler(async (req, res) => {
  const { destination, category } = req.query;

  if (!destination || !category) {
    return res.status(400).json({
      success: false,
      message: "Destination and category are required",
    });
  }

  const places = await searchPlaces(destination, category);

  const data = places.map((place) => ({
    id: place.id,
    name: place.displayName?.text,
    address: place.formattedAddress,
    rating: place.rating,
    reviews: place.userRatingCount,
    mapsUrl: place.googleMapsUri,
    website: place.websiteUri,
    phone: place.nationalPhoneNumber,
    image: place.photos?.length ? getPhotoUrl(place.photos[0].name) : null,
  }));

  res.json({
    success: true,
    count: data.length,
    places: data,
  });
});

module.exports = {
  getHotels,
  getPlaces,
};

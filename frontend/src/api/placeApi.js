import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export const getHotels = async (destination, token, checkin, checkout, travelers) => {
  const res = await axios.get(`${API}/places/hotels`, {
    params: { destination, checkin, checkout, travelers },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data.hotels;
};

// Generic Places API
export const getPlaces = async (destination, category, token) => {
  const res = await axios.get(`${API}/places/search`, {
    params: {
      destination,
      category,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data.places;
};

export const getPlaceImage = async (query) => {
  const res = await axios.get(`${API}/places/image`, {
    params: { query },
  });

  return res.data?.url;
};

import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export const getHotels = async (destination, token) => {
  const res = await axios.get(`${API}/places/hotels`, {
    params: { destination },
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

import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export const searchTrains = async (source, destination, date) => {
  const { data } = await axios.get(`${API}/trains/search`, {
    params: {
      source,
      destination,
      ...(date ? { date } : {}),
    },
  });

  return data;
};

export const getSeatAvailability = async (trainNo, from, to, date, classType, quota = 'GN') => {
  const { data } = await axios.get(`${API}/trains/availability`, {
    params: {
      trainNo,
      from,
      to,
      date,
      ...(classType ? { class: classType } : {}),
      quota,
    },
  });
  return data;
};

export const getPNRStatus = async (pnr) => {
  const { data } = await axios.get(`${API}/trains/pnr/${pnr}`);
  return data;
};

export const getTrainLiveStatus = async (trainNo, date) => {
  const { data } = await axios.get(`${API}/trains/live-status`, {
    params: {
      trainNo,
      ...(date ? { date } : {}),
    },
  });
  return data;
};


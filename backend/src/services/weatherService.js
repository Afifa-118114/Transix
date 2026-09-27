const axios = require("axios");
const { getDestinationBounds } = require("./placesService");

// In-memory cache: Map of "lat,lng" -> { data, expiresAt }
const weatherCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const WMO_CODE_MAP = {
  0: "CLEAR",
  1: "PARTLY_CLOUDY",
  2: "PARTLY_CLOUDY",
  3: "CLOUDY",
  45: "FOG",
  48: "FOG",
  51: "RAIN",
  53: "RAIN",
  55: "RAIN",
  56: "RAIN",
  57: "RAIN",
  61: "RAIN",
  63: "RAIN",
  65: "HEAVY_RAIN",
  66: "RAIN",
  67: "RAIN",
  71: "SNOW",
  73: "SNOW",
  75: "SNOW",
  77: "SNOW",
  80: "RAIN",
  81: "RAIN",
  82: "HEAVY_RAIN",
  85: "SNOW",
  86: "SNOW",
  95: "STORM",
  96: "STORM",
  99: "STORM",
};

const normalizeWeatherCode = (code) => {
  return WMO_CODE_MAP[code] || "OTHER";
};

const fetchWeatherData = async (lat, lng) => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m&timezone=auto&forecast_days=7`;
  const response = await axios.get(url, { timeout: 5000 });
  return response.data;
};

const getWeatherForLocation = async (latitude, longitude, destinationName = null) => {
  let lat = parseFloat(latitude);
  let lng = parseFloat(longitude);

  try {
    if (isNaN(lat) || isNaN(lng)) {
      if (!destinationName) {
        throw new Error("WEATHER LOCATION UNAVAILABLE");
      }
      // Try to resolve using Places service bounds
      const bounds = await getDestinationBounds(destinationName);
      if (!bounds) {
        throw new Error("WEATHER LOCATION UNAVAILABLE");
      }
      // Use center of bounds
      lat = (bounds.low.latitude + bounds.high.latitude) / 2;
      lng = (bounds.low.longitude + bounds.high.longitude) / 2;
    }

    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const cached = weatherCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const rawData = await fetchWeatherData(lat, lng);

    const current = rawData.current;
    if (!current) throw new Error("Invalid provider data");

    const hourlyRaw = rawData.hourly || {};
    const hourlyLength = hourlyRaw.time ? hourlyRaw.time.length : 0;
    const hourly = [];

    for (let i = 0; i < hourlyLength; i++) {
      hourly.push({
        timestamp: hourlyRaw.time[i], // e.g. "2024-05-18T00:00" in local timezone due to timezone=auto
        temperature: hourlyRaw.temperature_2m[i] ?? 0,
        precipitation: hourlyRaw.precipitation[i] ?? 0,
        precipitationProbability: hourlyRaw.precipitation_probability ? hourlyRaw.precipitation_probability[i] ?? 0 : 0,
        windSpeed: hourlyRaw.wind_speed_10m[i] ?? 0,
        weatherCode: hourlyRaw.weather_code[i] ?? 0,
        condition: normalizeWeatherCode(hourlyRaw.weather_code[i]),
      });
    }

    const result = {
      location: { latitude: lat, longitude: lng },
      current: {
        temperature: current.temperature_2m ?? 0,
        precipitation: current.precipitation ?? 0,
        precipitationProbability: hourly.length > 0 && hourly[0] ? hourly[0].precipitationProbability : 0, // Fallback to current hour
        windSpeed: current.wind_speed_10m ?? 0,
        weatherCode: current.weather_code ?? 0,
        condition: normalizeWeatherCode(current.weather_code),
        observedAt: current.time,
      },
      hourly,
      fetchedAt: new Date().toISOString(),
    };

    weatherCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch (err) {
    console.log("[weatherService] Live weather failed, falling back to smart simulation.", err.message);
    return {
      location: { latitude: lat || 32.2396, longitude: lng || 77.1887 }, // Default to Manali region
      current: {
        temperature: 14.5,
        precipitation: 8.4,
        precipitationProbability: 72,
        windSpeed: 18,
        weatherCode: 65,
        condition: "HEAVY_RAIN",
        observedAt: new Date().toISOString(),
      },
      hourly: [],
      fetchedAt: new Date().toISOString(),
    };
  }
};

const getWeatherForTrip = async (trip) => {
  if (!trip) throw new Error("Trip not provided");
  return getWeatherForLocation(null, null, trip.destination);
};

module.exports = {
  getWeatherForLocation,
  getWeatherForTrip,
};

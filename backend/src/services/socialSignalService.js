const axios = require("axios");
const { XMLParser } = require("fast-xml-parser");

const signalCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 mins

const WEATHER_KEYWORDS = {
  HEAVY_RAIN: ["heavy rain", "torrential", "downpour", "monsoon"],
  RAIN: ["rain", "drizzle", "showers", "wet"],
  FLOODING: ["flood", "waterlogging", "inundated"],
  ROAD_DISRUPTION: ["road closed", "landslide", "blocked", "traffic", "jam", "accident"],
  STORM: ["storm", "thunder", "lightning", "cyclone"],
  WIND: ["wind", "gust", "breeze"],
  HEAT: ["heat", "hot", "sun", "sunny", "heatwave"],
  SNOW: ["snow", "blizzard", "ice", "avalanche"],
  FOG: ["fog", "smog", "visibility", "haze"],
  CLOSURE: ["closed", "shutdown", "halted"],
};

const classifySignalType = (text) => {
  const lowerText = text.toLowerCase();
  for (const [type, keywords] of Object.entries(WEATHER_KEYWORDS)) {
    if (keywords.some((kw) => lowerText.includes(kw))) {
      return type;
    }
  }
  return "GENERAL_WEATHER";
};

const getSocialSignalsForLocation = async (destination) => {
  if (!destination) {
    throw new Error("SOCIAL SIGNALS UNAVAILABLE");
  }

  const cacheKey = destination.toLowerCase();
  const cached = signalCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    // We use Google News RSS as a highly reliable, public web intelligence signal source
    // to search for recent reports/disruptions about the destination.
    // Query: destination + weather OR rain OR road OR delay
    const query = encodeURIComponent(`${destination} (weather OR rain OR road OR flood)`);
    const url = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;
    
    const response = await axios.get(url, { timeout: 8000 });
    
    const parser = new XMLParser();
    const parsed = parser.parse(response.data);
    
    const items = parsed.rss?.channel?.item || [];
    const normalizedItems = Array.isArray(items) ? items : [items];

    const recentLimitMs = 7 * 24 * 60 * 60 * 1000; // last 7 days max for "recent"
    const now = Date.now();
    
    const relevantSignals = [];
    const topicCounts = {};

    normalizedItems.forEach((item) => {
      if (!item.title || !item.pubDate) return;
      
      const pubDate = new Date(item.pubDate);
      const ageMs = now - pubDate.getTime();
      
      if (ageMs > recentLimitMs) return; // ignore old news
      
      const titleLower = item.title.toLowerCase();
      // Double check relevance: must include destination
      if (!titleLower.includes(destination.toLowerCase())) return;

      const signalType = classifySignalType(item.title);
      
      relevantSignals.push({
        source: item.source || "Public News",
        text: item.title,
        createdAt: item.pubDate,
        destination: destination,
        signalType: signalType,
        sourceUrl: item.link,
        credibility: "PUBLIC_SIGNAL",
      });

      topicCounts[signalType] = (topicCounts[signalType] || 0) + 1;
    });

    const topTopics = Object.entries(topicCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    let signalStrength = "LOW";
    if (relevantSignals.length > 10) signalStrength = "HIGH";
    else if (relevantSignals.length > 3) signalStrength = "MEDIUM";

    // Handle conflict (e.g. if we had structured sentiment for "stopped rain", we would flag MIXED. 
    // Here we can just flag MIXED if there are very different signal types like Heat vs Rain)
    if (topicCounts["HEAT"] && (topicCounts["RAIN"] || topicCounts["HEAVY_RAIN"])) {
      signalStrength = "MIXED";
    }

    const result = {
      available: true,
      destination,
      signals: {
        count: relevantSignals.length,
        topTopics,
        signalStrength,
        recent: relevantSignals.slice(0, 5), // Only return top 5 raw to frontend
      },
      fetchedAt: new Date().toISOString()
    };

    signalCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;

  } catch (err) {
    console.error("[SocialSignalService] Failed:", err.message);
    throw new Error("SOCIAL SIGNALS UNAVAILABLE");
  }
};

const getSocialSignalsForTrip = async (trip) => {
  if (!trip || !trip.destination) throw new Error("Trip destination not provided");
  return getSocialSignalsForLocation(trip.destination);
};

module.exports = {
  getSocialSignalsForLocation,
  getSocialSignalsForTrip
};

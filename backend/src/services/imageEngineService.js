const axios = require("axios");
const Trip = require("../models/Trip");

// A. Location Resolver
const LocationResolver = {
  states: {
    "uttarakhand": ["nainital", "mussoorie", "rishikesh", "haridwar", "dehradun", "auli"],
    "kerala": ["munnar", "alleppey", "kochi", "varkala", "thekkady", "wayanad", "trivandrum"],
    "karnataka": ["bengaluru", "mysuru", "coorg", "gokarna", "hampi", "mangalore"],
    "rajasthan": ["jaipur", "udaipur", "jodhpur", "jaisalmer", "pushkar"],
    "uttar pradesh": ["varanasi", "agra", "lucknow", "mathura"],
    "maharashtra": ["mumbai", "pune", "lonavala", "mahabaleshwar", "aurangabad"],
    "goa": ["goa", "panaji", "baga", "calangute"],
    "tamil nadu": ["chennai", "ooty", "kodaikanal", "madurai", "mahabalipuram"]
  },
  
  resolve: function(rawDestination, plan, dayTitle) {
    const dest = (rawDestination || "").trim().toLowerCase();
    let resolvedState = null;
    let resolvedDest = dest;
    let resolvedAttraction = null;

    // Find state
    for (const [state, cities] of Object.entries(this.states)) {
      if (cities.includes(dest)) {
        resolvedState = state;
        break;
      }
    }
    
    // Find attraction
    const textToSearch = `${dayTitle || ""} ${plan ? JSON.stringify(plan) : ""}`.toLowerCase();
    if (textToSearch.includes("isro") || textToSearch.includes("space center")) resolvedAttraction = "isro";
    if (textToSearch.includes("zoo")) resolvedAttraction = "zoo";
    if (textToSearch.includes("tea plantation") || textToSearch.includes("tea garden")) resolvedAttraction = "tea plantation";
    if (textToSearch.includes("naini lake")) resolvedAttraction = "naini lake";

    return {
      original: rawDestination,
      destination: resolvedDest,
      state: resolvedState,
      attraction: resolvedAttraction
    };
  }
};

// B. Activity Classifier
const ActivityClassifier = {
  categories: {
    "Sightseeing": ["sightseeing", "explore", "tour", "viewpoint", "lake", "temple", "monument"],
    "Nature Exploration": ["nature", "garden", "park", "valley", "hills", "plantation"],
    "Transportation": ["flight", "train", "bus", "travel", "transfer", "arrive", "depart", "transit"],
    "Hotel Check-in / Stay": ["check-in", "check in", "hotel", "resort", "relax"],
    "Boating": ["boat", "cruise", "shikara"],
    "Backwater Cruise": ["houseboat", "backwater"],
    "Beach Activities": ["beach", "sea", "ocean", "coast", "surf"],
    "Trekking": ["trek", "hike", "mountain"],
    "Wildlife Safari": ["safari", "wildlife", "sanctuary", "national park", "tiger"],
    "Zoo Visit": ["zoo", "animal park"],
    "Industrial Visit": ["industrial", "factory", "isro", "facility"],
    "Museum Visit": ["museum", "gallery"],
    "Historical Visit": ["fort", "palace", "ruins", "heritage", "history"],
    "Cultural Experience": ["culture", "village", "tradition", "dance"],
    "Shopping": ["shop", "market", "mall", "bazaar"],
    "Food and Dining": ["food", "restaurant", "cafe", "dine", "eat"],
    "Waterfalls": ["waterfall", "falls"]
  },

  classify: function(dayTitle, plan) {
    const text = `${dayTitle || ""} ${plan ? JSON.stringify(plan) : ""}`.toLowerCase();
    
    // Check specific first
    if (/\b(isro|industrial)\b/.test(text)) return "Industrial Visit";
    if (/\b(houseboat|backwater)\b/.test(text)) return "Backwater Cruise";
    if (/\b(safari)\b/.test(text)) return "Wildlife Safari";
    if (/\b(zoo)\b/.test(text)) return "Zoo Visit";
    if (/\b(boat)\b/.test(text)) return "Boating";
    if (/\b(tea plantation)\b/.test(text)) return "Nature Exploration";

    for (const [category, keywords] of Object.entries(this.categories)) {
      if (keywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(text))) {
        return category;
      }
    }
    return "Leisure / Free Time";
  }
};

// C. Curated Image Registry
const CuratedRegistry = {
  // Level 1: State
  states: {
    "kerala": ["https://images.pexels.com/photos/13691355/pexels-photo-13691355.jpeg", "https://images.pexels.com/photos/17638062/pexels-photo-17638062.jpeg"],
    "uttarakhand": ["https://images.pexels.com/photos/3408744/pexels-photo-3408744.jpeg"],
    "karnataka": ["https://images.pexels.com/photos/1483024/pexels-photo-1483024.jpeg"]
  },
  
  // Level 2: Destination
  destinations: {
    "munnar": ["https://images.pexels.com/photos/13691355/pexels-photo-13691355.jpeg", "https://images.pexels.com/photos/3408744/pexels-photo-3408744.jpeg"],
    "alleppey": ["https://images.pexels.com/photos/17638062/pexels-photo-17638062.jpeg"],
    "kochi": ["https://images.pexels.com/photos/5405596/pexels-photo-5405596.jpeg"],
    "varkala": ["https://images.pexels.com/photos/20343335/pexels-photo-20343335.jpeg"],
    "thekkady": ["https://images.pexels.com/photos/1684883/pexels-photo-1684883.jpeg"],
    "jaipur": ["https://images.pexels.com/photos/386009/pexels-photo-386009.jpeg"],
    "nainital": ["https://images.pexels.com/photos/3408744/pexels-photo-3408744.jpeg"]
  },
  
  // Level 3: Attraction
  attractions: {
    "isro": ["https://images.pexels.com/photos/256381/pexels-photo-256381.jpeg"], // aerospace proxy
    "zoo": ["https://images.pexels.com/photos/133356/pexels-photo-133356.jpeg"], // zoo proxy
    "tea plantation": ["https://images.pexels.com/photos/13691355/pexels-photo-13691355.jpeg"],
    "naini lake": ["https://images.pexels.com/photos/3408744/pexels-photo-3408744.jpeg"]
  },
  
  // Level 4: Activity
  activities: {
    "Backwater Cruise": ["https://images.pexels.com/photos/17638062/pexels-photo-17638062.jpeg"],
    "Beach Activities": ["https://images.pexels.com/photos/18264906/pexels-photo-18264906.jpeg"],
    "Wildlife Safari": ["https://images.pexels.com/photos/1684883/pexels-photo-1684883.jpeg"],
    "Historical Visit": ["https://images.pexels.com/photos/386009/pexels-photo-386009.jpeg"],
    "Food and Dining": ["https://images.pexels.com/photos/262959/pexels-photo-262959.jpeg"]
  },

  getMatch: function(location, activityCategory, usedImages = []) {
    // Priority 1: Verified attraction
    if (location.attraction && this.attractions[location.attraction]) {
      const img = this.attractions[location.attraction].find(i => !usedImages.includes(i));
      if (img) return { url: img, category: "Attraction", source: "Curated" };
    }

    // Priority 2 & 3: Destination
    if (location.destination && this.destinations[location.destination]) {
      const img = this.destinations[location.destination].find(i => !usedImages.includes(i));
      if (img) return { url: img, category: "Destination", source: "Curated" };
    }

    // Priority 4: State
    if (location.state && this.states[location.state]) {
      const img = this.states[location.state].find(i => !usedImages.includes(i));
      if (img) return { url: img, category: "State", source: "Curated" };
    }

    // Priority 5: Activity
    if (activityCategory && this.activities[activityCategory]) {
      const img = this.activities[activityCategory].find(i => !usedImages.includes(i));
      if (img) return { url: img, category: "Activity", source: "Curated" };
    }

    return null;
  }
};

// D & E. Pexels Search Service & Relevance Filter
const PexelsSearch = {
  search: async function(location, activityCategory, usedImages = []) {
    if (!process.env.PEXELS_API_KEY) return null;

    let query = "";
    if (location.attraction) {
      query = `${location.attraction} ${location.destination} ${activityCategory}`.trim();
    } else {
      query = `${location.destination} ${activityCategory}`.trim();
    }
    
    if (query.trim() === "") query = "landscape";

    try {
      const response = await axios.get("https://api.pexels.com/v1/search", {
        headers: { Authorization: process.env.PEXELS_API_KEY },
        params: { query, per_page: 5, orientation: "landscape" } 
      });

      if (response.data && response.data.photos && response.data.photos.length > 0) {
        let bestPhoto = response.data.photos.find(p => !usedImages.includes(p.src.landscape));
        if (!bestPhoto) bestPhoto = response.data.photos[0]; 

        return {
          url: bestPhoto.src.landscape,
          category: "Pexels Result",
          source: "Pexels API",
          query: query
        };
      }
    } catch (err) {
      console.warn("[PexelsSearch] Failed:", err.message);
    }
    return null;
  }
};

// H. Fallback Handler
const FallbackHandler = {
  placeholders: [
    "https://images.pexels.com/photos/1010657/pexels-photo-1010657.jpeg", // Mountain
    "https://images.pexels.com/photos/346529/pexels-photo-346529.jpeg", // Lake
    "https://images.pexels.com/photos/1450353/pexels-photo-1450353.jpeg", // Beach
    "https://images.pexels.com/photos/1271619/pexels-photo-1271619.jpeg", // City
    "https://images.pexels.com/photos/3225517/pexels-photo-3225517.jpeg", // Nature road
    "https://images.pexels.com/photos/1659437/pexels-photo-1659437.jpeg" // Abstract landscape
  ],
  getPlaceholder: function(dayIndex = 0) {
    const idx = Math.max(0, dayIndex) % this.placeholders.length;
    return {
      url: this.placeholders[idx],
      category: "Fallback",
      source: "Placeholder"
    };
  }
};

// F & G. Image Selection Service & Persistence
const Engine = {
  resolveImageForDay: async function(tripId, dayIndex, rawDestination, dayTitle, plan, usedImages = []) {
    const location = LocationResolver.resolve(rawDestination, plan, dayTitle);
    const activityCategory = ActivityClassifier.classify(dayTitle, plan);

    let imageResult = CuratedRegistry.getMatch(location, activityCategory, usedImages);

    // Temporarily disabled Pexels Search to prevent 429 rate limit errors
    // if (!imageResult) {
    //   imageResult = await PexelsSearch.search(location, activityCategory, usedImages);
    // }

    if (!imageResult) {
      imageResult = FallbackHandler.getPlaceholder(dayIndex);
    }

    return imageResult;
  },

  processItineraryImage: async function(tripId, dayIndex) {
    const trip = await Trip.findById(tripId);
    if (!trip || !trip.itinerary || !trip.itinerary[dayIndex]) {
      throw new Error("Invalid trip or day index");
    }

    const day = trip.itinerary[dayIndex];

    const location = LocationResolver.resolve(trip.destination, day.plan, day.title);
    const activityCategory = ActivityClassifier.classify(day.title, day.plan);
    const contextHash = JSON.stringify({ location, activityCategory });

    // G. Persistent Caching Check & Cache Invalidation
    if (day.imageMetadata && day.imageMetadata.url && day.imageMetadata.contextHash === contextHash) {
      return day.imageMetadata.url;
    }

    // Collect used images in this trip
    const usedImages = [];
    trip.itinerary.forEach((d, idx) => {
      if (idx !== dayIndex && d.imageMetadata && d.imageMetadata.url) {
        usedImages.push(d.imageMetadata.url);
      }
    });

    const result = await this.resolveImageForDay(tripId, dayIndex, trip.destination, day.title, day.plan, usedImages);

    // Save back to DB (Cache assignment)
    trip.itinerary[dayIndex].image = result.url;
    trip.itinerary[dayIndex].imageMetadata = {
      url: result.url,
      source: result.source,
      category: result.category,
      query: result.query || null,
      contextHash: contextHash,
      timestamp: new Date()
    };
    
    trip.markModified("itinerary");
    await trip.save();

    return result.url;
  }
};

module.exports = {
  Engine,
  LocationResolver,
  ActivityClassifier,
  CuratedRegistry,
  PexelsSearch
};

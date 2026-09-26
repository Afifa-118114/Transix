import trainImg from "../assets/travel/train.jpg";
import flightImg from "../assets/travel/flight.jpg";
import busImg from "../assets/travel/bus.jpg";
import cabImg from "../assets/travel/cab.jpg";

import breakfastImg from "../assets/activities/breakfast.jpg";
import diningImg from "../assets/activities/dining.jpg";
import hotelImg from "../assets/activities/hotel.jpg";
import shoppingImg from "../assets/activities/shopping.svg";
import teaImg from "../assets/activities/tea.svg";
import relaxationImg from "../assets/activities/relaxation.svg";
import attractionPlaceholderImg from "../assets/activities/attraction.svg";

export const ACTIVITY_CATEGORIES = {
  MEAL_BREAKFAST: "MEAL_BREAKFAST",
  MEAL_DINING: "MEAL_DINING",
  MEAL_TEA: "MEAL_TEA",
  TRANSPORT_TRAIN: "TRANSPORT_TRAIN",
  TRANSPORT_FLIGHT: "TRANSPORT_FLIGHT",
  TRANSPORT_BUS: "TRANSPORT_BUS",
  TRANSPORT_CAB: "TRANSPORT_CAB",
  TRANSPORT_LOCAL: "TRANSPORT_LOCAL",
  LOGISTICS_HOTEL: "LOGISTICS_HOTEL",
  LOGISTICS_BUFFER: "LOGISTICS_BUFFER",
  LEISURE_SHOPPING: "LEISURE_SHOPPING",
  LEISURE_RELAXATION: "LEISURE_RELAXATION",
  SPECIFIC_PLACE: "SPECIFIC_PLACE",
};

/**
 * Clean place name by stripping activity verbs, prepositions and narrative text.
 * Example: "Visit to Vikram Sarabhai Space Centre (ISRO)" -> "Vikram Sarabhai Space Centre"
 */
export function extractCleanPlaceName(rawPlace, rawActivity) {
  let text = (rawPlace || rawActivity || "").trim();

  // If place is generic or empty, inspect activity
  const isGenericPlace =
    !text ||
    /^(hotel|resort|station|airport|destination|city|market|restaurant|bazaar|india)$/i.test(text);

  if (isGenericPlace && rawActivity) {
    text = rawActivity.trim();
  }

  // Strip narrative prefixes
  text = text.replace(/^(visit to|explore|tour of|discover|trip to|stop by|excursion to|head to|arrive at|journey to|sightseeing at|viewing at)\s+/i, "");
  // Strip trailing notes
  text = text.replace(/\s+(en route|and relax|and explore|for sunset|and dinner|with guide).*$/i, "");
  // Strip parentheses if needed or keep meaningful ones
  text = text.replace(/\(ISRO\)/i, "ISRO");
  text = text.replace(/[()]/g, "");

  return text.trim();
}

/**
 * Extract clean city context from day title or destination.
 */
export function extractCityContext(dayTitle, destination) {
  if (dayTitle && typeof dayTitle === "string") {
    const cityMatch = dayTitle.match(
      /\b(mumbai|delhi|kochi|cochin|munnar|alleppey|alappuzha|thekkady|wayanad|varkala|trivandrum|thiruvananthapuram|jaipur|jodhpur|udaipur|jaisalmer|goa|panaji|bangalore|bengaluru|chennai|hyderabad|pune|agra|varanasi|kalyan)\b/i
    );
    if (cityMatch) return cityMatch[1];
  }
  return destination || "";
}

/**
 * Classifies an itinerary activity into generic categories (with curated local assets)
 * or identifies it as a specific place (which qualifies for Google Places photo matching).
 */
export function classifyActivity(activity, destination = "", dayTitle = "") {
  if (!activity) {
    return {
      isGeneric: true,
      category: ACTIVITY_CATEGORIES.SPECIFIC_PLACE,
      asset: attractionPlaceholderImg,
      isSpecificPlace: false,
    };
  }

  const actText = (activity.activity || activity.name || activity.title || "").toLowerCase();
  const placeText = (activity.place || activity.location || "").toLowerCase();
  const catText = (activity.category || activity.type || "").toLowerCase();
  const fullText = `${actText} ${placeText} ${catText}`.toLowerCase();

  // ----------------------------------------------------
  // 1. SPECIFIC PLACES DETECTION (Prioritized for distinct cultural/scientific institutions)
  // Even if they mention "tea" (e.g., "Tea Museum") or "train" (e.g. "Rail Museum")
  // ----------------------------------------------------
  const isHighPriorityAttraction =
    /\b(museum|zoo|planetarium|observatory|isro|space centre|space center|botanical garden|sanctuary|national park|fort|palace|waterfall|falls|dam|ashram|temple|church|cathedral|tea museum|tea factory|tea estate)\b/i.test(fullText);

  if (isHighPriorityAttraction) {
    const placeName = extractCleanPlaceName(activity.place || activity.location, activity.activity || activity.name);
    const cityContext = extractCityContext(dayTitle, destination);
    return {
      isGeneric: false,
      isSpecificPlace: true,
      category: ACTIVITY_CATEGORIES.SPECIFIC_PLACE,
      placeName,
      cityContext,
      fallbackAsset: attractionPlaceholderImg,
    };
  }

  // ----------------------------------------------------
  // 2. MEALS & DINING
  // ----------------------------------------------------
  if (/\b(breakfast|morning meal|nashta|buffet breakfast)\b/.test(fullText)) {
    return {
      isGeneric: true,
      isSpecificPlace: false,
      category: ACTIVITY_CATEGORIES.MEAL_BREAKFAST,
      asset: breakfastImg,
      name: "Breakfast",
    };
  }

  if (/\b(tea break|high tea|evening tea|tea & snacks|tea and snacks|chai break|coffee break|snacks break)\b/.test(fullText)) {
    return {
      isGeneric: true,
      isSpecificPlace: false,
      category: ACTIVITY_CATEGORIES.MEAL_TEA,
      asset: teaImg,
      name: "Tea & Refreshments",
    };
  }

  if (
    /\b(lunch|dinner|supper|midday meal|thali|dining|restaurant|cafe|culinary trail|food tasting|seafood dinner|authentic meal|local cuisine)\b/.test(fullText) ||
    catText.includes("dining") ||
    catText.includes("food") ||
    catText.includes("meal")
  ) {
    return {
      isGeneric: true,
      isSpecificPlace: false,
      category: ACTIVITY_CATEGORIES.MEAL_DINING,
      asset: diningImg,
      name: "Dining & Cuisine",
    };
  }

  // ----------------------------------------------------
  // 3. ACCOMMODATION & LOGISTICS
  // ----------------------------------------------------
  if (/\b(station buffer|assembly & buffer|pre-departure assembly|pre-departure buffer|reporting at station|layover)\b/.test(fullText)) {
    return {
      isGeneric: true,
      isSpecificPlace: false,
      category: ACTIVITY_CATEGORIES.LOGISTICS_BUFFER,
      asset: trainImg,
      name: "Pre-departure Assembly & Buffer",
    };
  }

  if (
    /\b(check-in|checkin|hotel check|resort check|check-out|checkout|check in|check out)\b/.test(fullText) ||
    activity.isStaySegmentHotel ||
    catText.includes("hotel") ||
    catText.includes("stay") ||
    catText.includes("accommodation")
  ) {
    return {
      isGeneric: true,
      isSpecificPlace: false,
      category: ACTIVITY_CATEGORIES.LOGISTICS_HOTEL,
      asset: hotelImg,
      name: "Hotel & Accommodation",
    };
  }

  // ----------------------------------------------------
  // 4. TRANSPORTATION
  // ----------------------------------------------------
  if (
    activity.trainNumber ||
    catText === "train" ||
    /\b(train|railway|express|superfast|vande bharat|rajdhani|shatabdi|train travel|train journey)\b/.test(fullText)
  ) {
    return {
      isGeneric: true,
      isSpecificPlace: false,
      category: ACTIVITY_CATEGORIES.TRANSPORT_TRAIN,
      asset: trainImg,
      name: "Train Travel",
    };
  }

  if (
    activity.flightNumber ||
    catText === "flight" ||
    /\b(flight|fly|airport|terminal|airline|boarding|airways)\b/.test(fullText)
  ) {
    return {
      isGeneric: true,
      isSpecificPlace: false,
      category: ACTIVITY_CATEGORIES.TRANSPORT_FLIGHT,
      asset: flightImg,
      name: "Flight Journey",
    };
  }

  if (
    catText === "bus" ||
    /\b(bus|coach|volvo|ksrtc|krtc|intercity bus|bus journey)\b/.test(fullText)
  ) {
    return {
      isGeneric: true,
      isSpecificPlace: false,
      category: ACTIVITY_CATEGORIES.TRANSPORT_BUS,
      asset: busImg,
      name: "Bus Journey",
    };
  }

  if (
    /\b(cab|taxi|uber|ola|private transfer|car drive|road drive|pickup|drop|scenic drive|drive to)\b/.test(fullText) ||
    catText === "car" ||
    catText === "cab"
  ) {
    return {
      isGeneric: true,
      isSpecificPlace: false,
      category: ACTIVITY_CATEGORIES.TRANSPORT_CAB,
      asset: cabImg,
      name: "Private Cab Transfer",
    };
  }

  // ----------------------------------------------------
  // 5. LEISURE & EXPERIENCES
  // ----------------------------------------------------
  if (/\b(shopping|market|bazaar|souvenir|mall|handicraft|silk store|spices shopping|local market)\b/.test(fullText)) {
    return {
      isGeneric: true,
      isSpecificPlace: false,
      category: ACTIVITY_CATEGORIES.LEISURE_SHOPPING,
      asset: shoppingImg,
      name: "Local Shopping & Bazaar",
    };
  }

  if (
    /\b(relaxation|relax|unwind|leisure|free time|rest|spa|massage|ayurveda|sunset view|poolside|stroll|walking|walk|promenade|wander)\b/.test(fullText)
  ) {
    return {
      isGeneric: true,
      isSpecificPlace: false,
      category: ACTIVITY_CATEGORIES.LEISURE_RELAXATION,
      asset: relaxationImg,
      name: "Leisure & Relaxation",
    };
  }

  // ----------------------------------------------------
  // 6. DEFAULT: SPECIFIC PLACE
  // Identifiable location or attraction with place name
  // ----------------------------------------------------
  const placeName = extractCleanPlaceName(activity.place || activity.location, activity.activity || activity.name);
  const cityContext = extractCityContext(dayTitle, destination);

  return {
    isGeneric: false,
    isSpecificPlace: true,
    category: ACTIVITY_CATEGORIES.SPECIFIC_PLACE,
    placeName,
    cityContext,
    fallbackAsset: attractionPlaceholderImg,
  };
}

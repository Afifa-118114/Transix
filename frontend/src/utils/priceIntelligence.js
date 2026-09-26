export const calculateMedian = (prices) => {
  if (!prices || prices.length === 0) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
};

export const calculatePriceScore = (price, median) => {
  if (!price || !median) return null;
  const diffPercent = (price - median) / median;
  
  // Score 0 to 100
  // If price is exactly median -> 50
  // If price is 50% below median -> 100
  // If price is 50% above median -> 0
  
  let score = 50 - (diffPercent * 100);
  return Math.max(0, Math.min(100, score));
};

export const calculateQualityScore = (rating, reviews) => {
  const r = parseFloat(rating);
  if (isNaN(r) || r === 0) return 0;
  
  // Base score from rating (out of 5)
  let score = (r / 5) * 100;
  
  // Slight boost/penalty for review counts if available
  const revCount = parseInt(reviews, 10);
  if (!isNaN(revCount)) {
    if (revCount < 5) score -= 10;
    else if (revCount > 500) score += 5;
  }
  return Math.max(0, Math.min(100, score));
};

export const calculatePreferenceScore = (hotel, tripContext) => {
  let score = 50; // Base score
  const pref = tripContext?.hotelType ? tripContext.hotelType.toLowerCase() : "";
  const hotelText = ((hotel.name || "") + " " + (hotel.notes || "") + " " + (hotel.category || "")).toLowerCase();
  
  if (pref && hotelText.includes(pref.replace(" hotel", ""))) {
    score += 40;
  }

  // Example: if budget preferred but hotel is very expensive, penalty could apply, but we keep it simple
  return Math.max(0, Math.min(100, score));
};

export const calculatePriceIntelligence = (hotels, tripContext) => {
  if (!hotels || hotels.length === 0) return { recommendations: [], metadata: { pricedCount: 0 } };

  const PRICE_WEIGHT = 0.40;
  const QUALITY_WEIGHT = 0.35;
  const PREF_WEIGHT = 0.25;

  // Filter hotels that have a VERIFIED, numeric price from Nuitee (or Demo mode)
  const pricedHotels = hotels.filter(h => 
    h.nuitee?.livePriceAvailable === true && 
    typeof h.nuitee.totalPrice === "number" && 
    h.nuitee.totalPrice > 0
  );

  const pricedCount = pricedHotels.length;

  // Calculate peer median
  const validPrices = pricedHotels.map(h => h.nuitee.totalPrice);
  const peerMedian = calculateMedian(validPrices);

  // Score all hotels (priced and unpriced)
  const scoredHotels = hotels.map((hotel, index) => {
    const isPriced = hotel.nuitee?.livePriceAvailable === true && typeof hotel.nuitee.totalPrice === "number" && hotel.nuitee.totalPrice > 0;
    const price = isPriced ? hotel.nuitee.totalPrice : null;
    
    const qScore = calculateQualityScore(hotel.rating, hotel.reviews);
    const prefScore = calculatePreferenceScore(hotel, tripContext);
    
    let pScore = null;
    let priceDiffPercent = null;
    
    if (isPriced && peerMedian) {
      pScore = calculatePriceScore(price, peerMedian);
      priceDiffPercent = ((price - peerMedian) / peerMedian) * 100;
    }

    let overallScore = null;
    let valueScore = null;

    if (isPriced && pScore !== null) {
      overallScore = (pScore * PRICE_WEIGHT) + (qScore * QUALITY_WEIGHT) + (prefScore * PREF_WEIGHT);
      
      // Value Score: How much Quality+Pref fit do we get relative to the price position?
      // A slightly different formula prioritizing Quality over pure price
      const combinedFit = (qScore * 0.6) + (prefScore * 0.4);
      valueScore = combinedFit + (pScore * 0.5); // Add price score as a bonus modifier
    }

    // Match score doesn't rely on price
    const matchScore = (prefScore * 0.6) + (qScore * 0.4);

    return {
      ...hotel,
      originalIndex: index,
      isPriced,
      price,
      pScore,
      qScore,
      prefScore,
      overallScore,
      valueScore,
      matchScore,
      priceDiffPercent
    };
  });

  const recommendations = [];
  const usedIndices = new Set();

  // Helper to build reasons
  const buildReason = (type, hotel) => {
    const reasons = [];
    if (type === "Overall") {
      reasons.push("Strong balance of price, quality, and preferences");
    } else if (type === "Value") {
      if (hotel.priceDiffPercent < 0) {
        reasons.push(`${Math.abs(Math.round(hotel.priceDiffPercent))}% below comparable median`);
      } else {
        reasons.push(`Strong quality and fit for its price range`);
      }
      if (hotel.rating >= 4.0) reasons.push(`Maintains a ${hotel.rating}★ rating`);
    } else if (type === "Match") {
      if (tripContext?.hotelType) reasons.push(`Strong match for your ${tripContext.hotelType} preference`);
      if (hotel.rating >= 4.0) reasons.push(`Highly rated at ${hotel.rating}★`);
    }
    return reasons;
  };

  // 1. Best Overall (requires price)
  if (pricedCount >= 2) {
    const validOverall = scoredHotels.filter(h => h.isPriced && h.overallScore !== null);
    if (validOverall.length > 0) {
      validOverall.sort((a, b) => b.overallScore - a.overallScore);
      const best = validOverall[0];
      recommendations.push({
        ...best,
        category: "Best Overall",
        icon: "🥇",
        intelligenceScore: Math.round(best.overallScore),
        reasons: buildReason("Overall", best)
      });
      usedIndices.add(best.originalIndex);
    }
  }

  // 2. Best Value (requires price and meaningful median)
  if (pricedCount >= 3) {
    const validValue = scoredHotels.filter(h => h.isPriced && !usedIndices.has(h.originalIndex) && h.valueScore !== null);
    if (validValue.length > 0) {
      validValue.sort((a, b) => b.valueScore - a.valueScore);
      const bestValue = validValue[0];
      recommendations.push({
        ...bestValue,
        category: "Best Value",
        icon: "💎",
        intelligenceScore: Math.round(Math.min(100, bestValue.valueScore)),
        reasons: buildReason("Value", bestValue)
      });
      usedIndices.add(bestValue.originalIndex);
    }
  }

  // 3. Best Match (does NOT require price)
  const availableMatch = scoredHotels.filter(h => !usedIndices.has(h.originalIndex));
  if (availableMatch.length > 0) {
    availableMatch.sort((a, b) => b.matchScore - a.matchScore);
    const bestMatch = availableMatch[0];
    recommendations.push({
      ...bestMatch,
      category: "Best Match",
      icon: "🎯",
      intelligenceScore: Math.round(bestMatch.matchScore),
      reasons: buildReason("Match", bestMatch)
    });
  }

  // Data Sufficiency messaging
  let message = "No verified live prices are currently available.";
  if (pricedCount >= 5) {
    message = `Based on ${pricedCount} hotels with verified live prices.`;
  } else if (pricedCount >= 2) {
    message = `Limited price comparison — based on ${pricedCount} hotels with verified live prices.`;
  } else if (pricedCount === 1) {
    message = "Only 1 hotel has a verified live price. Price comparison is unavailable.";
  }

  return {
    recommendations: recommendations.slice(0, 3),
    metadata: {
      pricedCount,
      peerMedian,
      message,
      isDemoMode: typeof import.meta !== 'undefined' && import.meta.env 
        ? import.meta.env.VITE_PRICE_INTELLIGENCE_DEMO === 'true' 
        : process.env.VITE_PRICE_INTELLIGENCE_DEMO === 'true'
    }
  };
};

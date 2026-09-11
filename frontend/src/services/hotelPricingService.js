// Deterministic hash based on hotel name
function getDeterministicHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getDemoPricing(hotel, numNights = 1) {
  const hash = getDeterministicHash(hotel.name || hotel.id || "hotel");
  
  // Base rate between 3000 and 18000
  const baseRate = 3000 + (hash % 15000);
  // Round to nearest 100
  const nightlyPrice = Math.round(baseRate / 100) * 100;
  const totalPrice = nightlyPrice * numNights;
  const taxes = Math.round(totalPrice * 0.18); // 18% GST mock

  // We want MOST hotels to have a price in demo mode, but maybe 1 or 2 fail
  const isAvailable = (hash % 10) !== 0; // 90% chance of price

  if (!isAvailable) {
    return {
      livePriceAvailable: false,
      isDemo: true,
      provider: "demo"
    };
  }

  return {
    livePriceAvailable: true,
    isDemo: true,
    provider: "demo",
    currency: "INR",
    totalPrice: totalPrice + taxes, // Demo total includes taxes for realism
    nightlyPrice: nightlyPrice,
    basePrice: totalPrice,
    taxesAndCharges: [{ type: "tax", amount: taxes, currency: "INR" }],
    fetchedAt: new Date().toISOString()
  };
}

/**
 * Resolves whether to use actual Nuitee pricing or deterministic demo pricing.
 */
export function resolveHotelPricing(hotel, numNights = 1) {
  const isDemoMode = typeof import.meta !== 'undefined' && import.meta.env 
    ? import.meta.env.VITE_PRICE_INTELLIGENCE_DEMO === 'true' 
    : process.env.VITE_PRICE_INTELLIGENCE_DEMO === 'true';

  if (isDemoMode) {
    return getDemoPricing(hotel, numNights);
  }

  // Normal mode: strictly Nuitee
  if (hotel.nuitee && hotel.nuitee.livePriceAvailable && hotel.nuitee.totalPrice > 0) {
    return {
      ...hotel.nuitee,
      isDemo: false
    };
  }

  // Fallback: No verified price
  return {
    livePriceAvailable: false,
    isDemo: false,
    provider: "nuitee"
  };
}

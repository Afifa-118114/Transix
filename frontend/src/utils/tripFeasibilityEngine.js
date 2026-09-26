// frontend/src/utils/tripFeasibilityEngine.js

// Hardcoded conservative estimates for feasibility checks
const ESTIMATES = {
  transport: {
    "flight": { minCostPP: 4000 },
    "train": { minCostPP: 800 },
    "bus": { minCostPP: 500 },
    "car": { minCostPerVehiclePerDay: 2500 }, 
  },
  accommodation: {
    "budget": { minCostPRPN: 800 }, // Per room, per night
    "comfort": { minCostPRPN: 2000 },
    "premium": { minCostPRPN: 4000 },
    "luxury": { minCostPRPN: 8000 },
    "resort": { minCostPRPN: 6000 },
  },
  food: {
    "fine dining": { minCostPPPD: 1500 },
    "default": { minCostPPPD: 500 }
  }
};

export const getDays = (state) => {
  // Always prefer explicit dates if they are valid
  if (state.startDate && state.endDate) {
    const d1 = new Date(state.startDate);
    const d2 = new Date(state.endDate);
    const diff = (d2 - d1) / (1000 * 60 * 60 * 24);
    if (diff >= 0 && !isNaN(diff)) return diff + 1; // Inclusive days
  }
  // Fallback to duration string ONLY if it explicitly mentions days/weeks
  if (state.durationStr) {
    const s = String(state.durationStr).toLowerCase();
    const match = s.match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (s.includes("week")) return num * 7;
      if (s.includes("day") || s.includes("night")) return num;
    }
  }
  return 3; // fallback to 3 days (2 nights)
};

const getTravelers = (state) => {
  return Number(state.travelers) > 0 ? Number(state.travelers) : 1;
};

const getRooms = (travelers) => {
  return Math.ceil(travelers / 2);
};

export const getFeasibilityContext = (state) => {
  const budget = Number(state.budget) || 0;
  const travelers = getTravelers(state);
  const days = getDays(state);
  const nights = Math.max(1, days - 1);
  const rooms = getRooms(travelers);

  // Compute fixed selected costs
  let selectedTransportCost = 0;
  if (state.travelMode && state.travelMode.toLowerCase() !== "no preference") {
    const mode = state.travelMode.toLowerCase();
    if (ESTIMATES.transport[mode]) {
      selectedTransportCost = ESTIMATES.transport[mode].minCostPP 
        ? ESTIMATES.transport[mode].minCostPP * travelers 
        : (ESTIMATES.transport[mode].minCostPerVehiclePerDay * days);
    }
  }

  let selectedStayCost = 0;
  if (state.stay && state.stay.toLowerCase() !== "no preference") {
    const stayType = state.stay.toLowerCase();
    if (ESTIMATES.accommodation[stayType]) {
      selectedStayCost = ESTIMATES.accommodation[stayType].minCostPRPN * rooms * nights;
    }
  }
  
  let selectedFoodCost = ESTIMATES.food.default.minCostPPPD * travelers * days;
  if (state.dining && state.dining.toLowerCase().includes("fine")) {
    selectedFoodCost = ESTIMATES.food["fine dining"].minCostPPPD * travelers * days;
  }

  return { budget, travelers, days, nights, rooms, selectedTransportCost, selectedStayCost, selectedFoodCost };
};

export const getOptionAvailability = (state, questionId, optionId) => {
  const option = String(optionId).toLowerCase();
  
  // 1. Destination Check
  if (questionId === "destination" && state.source) {
    if (option === state.source.toLowerCase()) {
      return { available: false, reason: "Origin and destination cannot be the same.", severity: "hard" };
    }
  }
  if (questionId === "source" && state.destination) {
    if (option === state.destination.toLowerCase()) {
      return { available: false, reason: "Origin and destination cannot be the same.", severity: "hard" };
    }
  }

  // 2. Traveler Type / Group Config Check
  if (questionId === "travelerType") {
    const travelers = Number(state.travelers);
    if (travelers > 0) {
      if ((option.includes("just me") || option === "solo") && travelers !== 1) {
        return { available: false, reason: "Requires exactly 1 traveler.", severity: "hard" };
      }
      if (option.includes("couple") && travelers !== 2) {
        return { available: false, reason: "Requires exactly 2 travelers.", severity: "hard" };
      }
      if (option.includes("group") && travelers < 3) {
        return { available: false, reason: "Requires 3 or more travelers.", severity: "hard" };
      }
    }
  }

  // 3. Budget / Feasibility Checks
  const ctx = getFeasibilityContext(state);
  
  if (ctx.budget > 0) {
    // Determine the absolute minimum remaining costs for the rest of the trip
    const minTransport = ctx.selectedTransportCost > 0 ? ctx.selectedTransportCost : (ESTIMATES.transport.bus.minCostPP * ctx.travelers);
    const minStay = ctx.selectedStayCost > 0 ? ctx.selectedStayCost : (ESTIMATES.accommodation.budget.minCostPRPN * ctx.rooms * ctx.nights);
    const minFood = ctx.selectedFoodCost;
    
    const minRemainingAfterTransport = minStay + minFood;
    const minRemainingAfterStay = minTransport + minFood;

    // Developer Diagnostic Logging
    if (process.env.NODE_ENV === "development") {
      console.log(`[FEASIBILITY DEBUG] Evaluating ${questionId}=${option}`);
      console.log(`  Budget: ${ctx.budget}, Travelers: ${ctx.travelers}, Days: ${ctx.days}, Nights: ${ctx.nights}`);
      console.log(`  Min Transport: ${minTransport}, Min Stay: ${minStay}, Min Food: ${minFood}`);
    }

    if (questionId === "travelMode") {
      if (option === "no preference") {
        if (minTransport + minRemainingAfterTransport > ctx.budget) {
           return { available: true, warning: true, reason: "Estimated minimum trip cost is near or exceeds budget." };
        }
        return { available: true };
      }

      if (ESTIMATES.transport[option]) {
        const optionCost = ESTIMATES.transport[option].minCostPP 
          ? ESTIMATES.transport[option].minCostPP * ctx.travelers 
          : (ESTIMATES.transport[option].minCostPerVehiclePerDay * ctx.days);
        
        const estimatedTotal = optionCost + minRemainingAfterTransport;
        
        if (estimatedTotal > ctx.budget * 1.5) {
          return { available: false, reason: "Minimum estimated trip cost exceeds your budget.", severity: "hard" };
        } else if (estimatedTotal > ctx.budget) {
          return { available: true, warning: true, reason: "Estimated cost may leave a limited amount for other expenses." };
        }
      }
    }

    if (questionId === "stay") {
      if (option === "no preference") return { available: true };

      if (ESTIMATES.accommodation[option]) {
        const optionCost = ESTIMATES.accommodation[option].minCostPRPN * ctx.rooms * ctx.nights;
        const estimatedTotal = optionCost + minRemainingAfterStay;
        
        if (estimatedTotal > ctx.budget * 1.5) {
          return { available: false, reason: "Minimum estimated trip cost exceeds your budget.", severity: "hard" };
        } else if (estimatedTotal > ctx.budget) {
          return { available: true, warning: true, reason: "Estimated cost may leave a limited amount for other expenses." };
        }
      }
    }
  }

  return { available: true };
};

export const getTripFeasibility = (state) => {
  if (state.source && state.destination && state.source.toLowerCase() === state.destination.toLowerCase()) {
    return { valid: false, reason: "Origin and destination cannot be the same." };
  }
  
  if (Number(state.travelers) <= 0) {
    return { valid: false, reason: "Traveler count must be at least 1." };
  }

  const ctx = getFeasibilityContext(state);
  if (ctx.budget <= 0) return { valid: true };

  const minTransport = ctx.selectedTransportCost > 0 ? ctx.selectedTransportCost : (ESTIMATES.transport.bus.minCostPP * ctx.travelers);
  const minStay = ctx.selectedStayCost > 0 ? ctx.selectedStayCost : (ESTIMATES.accommodation.budget.minCostPRPN * ctx.rooms * ctx.nights);
  const minFood = ctx.selectedFoodCost;
  
  const totalMinEstimate = minTransport + minStay + minFood;
  
  // We only HARD BLOCK at generate time if they are aggressively under budget (> 150%)
  if (totalMinEstimate > ctx.budget * 1.5) {
    let msg = `Trip configuration is likely infeasible.\nEstimated minimum: ₹${totalMinEstimate.toLocaleString()} (Budget: ₹${ctx.budget.toLocaleString()}).\n`;
    msg += `Suggested changes:\n• Increase budget\n• Reduce trip duration\n• Change travel mode/stay`;
    return { valid: false, reason: msg };
  }

  return { valid: true };
};

export const validateStateConsistency = (state, questions) => {
  const nextState = { ...state };
  const cleared = [];
  
  for (const q of questions) {
    if (q.id === "source" || q.id === "destination" || q.id === "dates" || q.id === "budget" || q.id === "travelers") continue;
    
    const answer = nextState[q.id];
    if (answer) {
      if (Array.isArray(answer) && q.id === "interests") {
        // Interests are rarely hard-blocked based on budget in this logic
      } else {
        const avail = getOptionAvailability(nextState, q.id, answer);
        if (!avail.available) {
          nextState[q.id] = "";
          cleared.push(q.title);
        }
      }
    }
  }
  return { nextState, cleared };
};

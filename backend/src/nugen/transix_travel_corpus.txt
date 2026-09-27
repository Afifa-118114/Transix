# Transix Travel Domain Corpus: Personalized Travel Intelligence & Optimization

## 1. Domain Overview & Purpose
Transix is an intelligent tour operations and travel planning platform designed to synthesize, schedule, and execute conflict-free travel itineraries. The core challenge in multi-day travel planning is balancing hard constraints (fixed intercity transport, accommodation check-in/checkout hours, travel buffers) with soft traveler preferences (interests, pacing, culinary tastes, budget tolerances, and weather contingencies).

## 2. Hard Constraints vs Soft Preferences
### 2.1 Fixed Intercity Transport (Immutable Skeleton)
- **Flight & Rail Intercity Transport:** Once an intercity flight or train is selected between the origin (e.g. Mumbai) and destination (e.g. Srinagar/Kashmir), its departure time, arrival time, and terminals form the immutable temporal skeleton of Day 1 and the Return Day.
- **Buffers:** 
  - Station / Airport Departure: Minimum 60-minute pre-departure buffer for domestic flights / intercity express trains.
  - Arrival Buffer: Minimum 30-minute post-arrival transfer buffer before initiating any sightseeing or hotel check-in.
- **Local In-Trip Transport:** Separate from intercity transport. Local transfers (cabs, houseboats, prepaid shikaras, tempo travellers) handle local point-to-point hops.

### 2.2 Accommodations & Geographic Stay Allocations
- **Check-in / Check-out Windows:** Standard hotel check-in is 12:00 PM – 02:00 PM; checkout is 10:00 AM – 11:00 AM.
- **Geographic Grouping:** Activities must strictly cluster around the active stay segment to prevent wasteful backtrack driving (e.g. in Kashmir: Srinagar stay covers Dal Lake, Mughal Gardens, Shankaracharya; Gulmarg stay covers Gondola & Apharwat; Pahalgam stay covers Betaab Valley & Aru).
- **Contiguous Dates:** Total nights across all stay segments must equal exactly `(Trip End Date - Trip Start Date)`.

### 2.3 Strict Financial & Budget Allocations
- **10% Safety Buffer:** Total planned expenses must not exceed 90–92% of the approved budget, leaving 8–10% as emergency buffer.
- **Standard Ratio for Moderate Tours (Personal/Family):**
  - Accommodation: ~35% - 40% of total budget.
  - Intercity & Local Transport: ~30% - 35% of total budget.
  - Activities, Guides & Entry Tickets: ~15% - 20% of total budget.
  - Food & Incidental Buffer: ~10% of total budget.

## 3. Traveler Personas & Pacing Rules
1. **Families with Children / Seniors:**
   - Maximum 2 main sightseeing activities per day.
   - Low physical exertion: exclude steep treks; prioritize cable cars, boat rides, gardens, scenic viewpoints.
   - Afternoon rest buffer (02:00 PM – 03:30 PM).
2. **Adventure & Nature Enthusiasts:**
   - Active morning treks, wildlife safaris, river rafting, snow sports.
   - Early morning starts (07:00 AM – 08:00 AM).
3. **Campus Group / Student Tours:**
   - High passenger density (20–200 pax).
   - Require centralized fleet coordination (45-seater AC buses, multi-sharing room rates).
   - Mandatory educational/industrial visit windows during core daylight hours.

## 4. Disruption Scenarios & Smart Recovery
1. **Transport Delay (e.g., Flight/Train delayed 2-4 hours):**
   - Automatically identify all downstream activities on the arrival day.
   - Non-critical activities (souvenir shopping, minor viewpoints) are dropped or shifted to a later free evening.
   - Hotel check-in is updated to evening check-in.
2. **Weather Disruption (e.g., Heavy Rainfall, Snowstorms, Mountain Roadblocks):**
   - Immediate substitution of open outdoor activities (e.g. Shikara ride, open meadows) with climate-controlled indoor heritage centers, cultural museums, handicrafts complexes, or indoor tea lounges.
   - Travel buffers between locations are increased by 50% due to slippery mountain roads or waterlogging.
3. **Activity Unavailability (e.g., Weekly Monument Closures, Maintenance):**
   - Substitute with geographically adjacent alternative within a 3–5 km radius that shares the traveler's category preference (e.g. replace closed museum with art gallery or historic palace).

## 5. Output Specification for Transix Travel Intelligence
The domain-aligned model generates a structured intelligence payload:
```json
{
  "feasibilityScore": 95,
  "budgetAssessment": {
    "totalEstimatedCost": 36800,
    "approvedBudget": 40000,
    "remainingBuffer": 3200,
    "status": "WITHIN_BUDGET"
  },
  "pacingProfile": "BALANCED_FAMILY",
  "recommendedHighlights": [
    {
      "day": 1,
      "timeSlot": "MORNING",
      "activityName": "Dal Lake Shikara Ride",
      "category": "Sightseeing",
      "estimatedCost": 800,
      "durationMinutes": 90,
      "weatherProof": false
    }
  ],
  "disruptionContingency": {
    "weatherRisk": "LOW",
    "indoorAlternative": "Sri Pratap Singh Museum & Handicrafts Centre"
  }
}
```

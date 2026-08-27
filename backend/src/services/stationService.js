const Train = require("../models/Train");
const { searchNearestRailwayStation } = require("./placesService");

// Comprehensive multi-station metropolitan hubs, states, aliases & railway gateways across India
const CITY_STATION_HUBS = {
  // Metros & Major Capitals
  mumbai: ["CSMT", "CSTM", "MMCT", "BCT", "BDTS", "LTT", "DR", "BVI", "KYN", "TNA", "PNVL", "BSR", "KJT", "IGP"],
  bombay: ["CSMT", "CSTM", "MMCT", "BCT", "BDTS", "LTT", "DR", "BVI", "KYN", "TNA", "PNVL", "BSR", "KJT", "IGP"],
  delhi: ["NDLS", "DLI", "NZM", "ANVT", "DEE", "DEC", "DSA", "DSJ", "SZM"],
  "new delhi": ["NDLS", "DLI", "NZM", "ANVT", "DEE", "DEC", "DSA", "DSJ", "SZM"],
  bengaluru: ["SBC", "YPR", "SMVB", "BNC", "BNCE", "BYPL", "KJM"],
  bangalore: ["SBC", "YPR", "SMVB", "BNC", "BNCE", "BYPL", "KJM"],
  kolkata: ["HWH", "SDAH", "KOAA", "SHM", "SRC"],
  calcutta: ["HWH", "SDAH", "KOAA", "SHM", "SRC"],
  chennai: ["MAS", "MS", "MSB", "TBM", "PER", "AJJ"],
  madras: ["MAS", "MS", "MSB", "TBM", "PER", "AJJ"],
  hyderabad: ["HYB", "SC", "KCG", "CHZ", "LPI"],
  secunderabad: ["SC", "HYB", "KCG", "CHZ", "LPI"],
  pune: ["PUNE", "SVJR", "CCH", "HDK", "LNL"],
  ahmedabad: ["ADI", "SBT", "MAN", "CLDY"],
  jaipur: ["JP", "GADJ", "DKBJ", "DPA"],
  lucknow: ["LKO", "LJN", "BNZ", "ASH", "UTR"],
  patna: ["PNBE", "PPTA", "DNR", "RJPB"],
  bhopal: ["BPL", "RKMP", "HBJ"],
  nagpur: ["NGP"],
  kanpur: ["CNB", "CPA"],
  surat: ["ST"],
  vadodara: ["BRC"],
  baroda: ["BRC"],
  indore: ["INDB", "INDM"],
  varanasi: ["BSB", "BCY", "DDU", "MUV", "BSBS"],
  benares: ["BSB", "BCY", "DDU", "MUV", "BSBS"],
  banaras: ["BSB", "BCY", "DDU", "MUV", "BSBS"],
  agra: ["AGC", "AF", "IDH", "RKM", "AH"],
  chandigarh: ["CDG", "UMB"],
  amritsar: ["ASR"],
  prayagraj: ["PRYJ", "PRRB", "PCOI", "NYN", "ALD"],
  allahabad: ["PRYJ", "PRRB", "PCOI", "NYN", "ALD"],
  gwalior: ["GWL"],
  jabalpur: ["JBP", "MML"],
  kota: ["KOTA"],
  ranchi: ["RNC", "HTE"],
  dhanbad: ["DHN"],
  jamshedpur: ["TATA"],
  tatanagar: ["TATA"],
  raipur: ["R", "DURG", "BSP"],
  bilaspur: ["BSP"],
  gorakhpur: ["GKP"],
  bareilly: ["BE", "BC"],
  moradabad: ["MB"],
  aligarh: ["ALJN"],
  meerut: ["MTC", "MUT"],
  mathura: ["MTJ"],
  jalandhar: ["JUC", "JRC"],
  ludhiana: ["LDH"],
  ujjain: ["UJN"],
  jodhpur: ["JU", "BGKT", "JUCT"],
  udaipur: ["UDZ", "RPZ", "UDPU"],
  bikaner: ["BKN"],
  ajmer: ["AII"],
  jaisalmer: ["JSM"],

  // Southern Hubs & Regions
  kanyakumari: ["CAPE", "NCJ", "NCJT"],
  "cape comorin": ["CAPE", "NCJ", "NCJT"],
  nagercoil: ["NCJ", "NCJT", "CAPE"],
  coimbatore: ["CBE", "CBF", "PTJ"],
  madurai: ["MDU"],
  tiruchirappalli: ["TPJ"],
  trichy: ["TPJ"],
  salem: ["SA"],
  erode: ["ED"],
  tirunelveli: ["TEN"],
  tirupati: ["TPTY", "RU"],
  vijayawada: ["BZA"],
  visakhapatnam: ["VSKP", "DVD"],
  vizag: ["VSKP", "DVD"],
  mysuru: ["MYS"],
  mysore: ["MYS"],
  hubli: ["UBL"],
  hubballi: ["UBL"],
  belagavi: ["BGM"],
  belgaum: ["BGM"],
  mangalore: ["MAQ", "MAJN"],
  mangaluru: ["MAQ", "MAJN"],
  puducherry: ["PDY"],
  pondicherry: ["PDY"],

  // Kerala State & Hubs
  kerala: [
    "TVC", "TVCN", "KCVL", "TVP", "ERS", "ERN", "AWY", "CLT", "TCR", "QLN", "CAN",
    "ALLP", "PGT", "PGTN", "KTYM", "SRR", "KGQ", "VAK", "KYJ", "CNGR", "TIR", "TLY",
    "MVLK", "TRVL", "BDJ", "PAY", "PTB", "KTU", "TA", "PGI", "FK", "QLD", "PYOL",
    "KPY", "AMPA", "ETM", "PVRD", "MNTT", "WKI", "TUVR", "PUU", "NYY", "KVU", "PVU",
    "CKI", "IJK", "PNQ", "GUV", "KZK", "NIL"
  ],
  kochi: ["ERS", "ERN", "AWY", "IPL", "KLMR"],
  cochin: ["ERS", "ERN", "AWY", "IPL", "KLMR"],
  ernakulam: ["ERS", "ERN", "AWY", "IPL", "KLMR"],
  thiruvananthapuram: ["TVC", "TVCN", "KCVL", "TVP", "KZK", "NYY"],
  trivandrum: ["TVC", "TVCN", "KCVL", "TVP", "KZK", "NYY"],
  kozhikode: ["CLT", "FK", "KUL", "ETR", "QLD"],
  calicut: ["CLT", "FK", "KUL", "ETR", "QLD"],
  thrissur: ["TCR", "PNQ", "MGK", "WKI", "PUK", "IJK", "CKI"],
  trichur: ["TCR", "PNQ", "MGK", "WKI", "PUK", "IJK", "CKI"],
  kollam: ["QLN", "KLQ", "KPY", "PVU"],
  quilon: ["QLN", "KLQ", "KPY", "PVU"],
  kannur: ["CAN", "TLY", "PAY", "PAZ", "KPQ", "VAPM"],
  alappuzha: ["ALLP", "AMPA", "TUVR"],
  alleppey: ["ALLP", "AMPA", "TUVR"],
  palakkad: ["PGT", "PGTN", "SRR", "PTB"],
  palghat: ["PGT", "PGTN", "SRR", "PTB"],
  kottayam: ["KTYM", "ETM", "TRVL", "CNGR", "MVLK"],
  shoranur: ["SRR", "PTB", "KTU", "TUA", "TIR"],
  kasaragod: ["KGQ", "KMQ", "MJS", "KQK", "BFR", "NLE", "CHV"],
  varkala: ["VAK", "KVU", "PVU", "KZK"],
  munnar: ["AWY", "ERS", "ERN", "TCR", "PGT"],
  wayanad: ["CLT", "CAN", "TIR"],
  thekkady: ["KTYM", "CNGR", "MDU"],

  // Eastern & North-Eastern Hubs / Gateway Stations
  manipur: ["DMV", "JRBM", "VNGP", "SCL", "MOAR", "GHY"],
  imphal: ["DMV", "JRBM", "VNGP", "SCL", "GHY"],
  jiribam: ["JRBM"],
  dimapur: ["DMV"],
  silchar: ["SCL", "NSCL"],
  nagaland: ["DMV"],
  assam: ["GHY", "KYQ", "DBRG", "NTSK", "RNY", "LMG", "SCL"],
  guwahati: ["GHY", "KYQ"],
  dibrugarh: ["DBRG", "DBRT"],
  tinsukia: ["NTSK", "TSK"],
  agartala: ["AGTL"],
  tripura: ["AGTL", "DMR"],
  mizoram: ["BHRB", "SCL"],
  shillong: ["GHY", "KYQ"],
  meghalaya: ["GHY", "KYQ"],
  itanagar: ["NHLN", "HMY"],
  "arunachal pradesh": ["NHLN", "HMY"],
  darjeeling: ["NJP", "SGUJ", "DJ"],
  siliguri: ["NJP", "SGUJ"],
  sikkim: ["NJP", "SGUJ"],
  gangtok: ["NJP", "SGUJ"],
  bhubaneswar: ["BBS", "CTC", "KUR"],
  cuttack: ["CTC"],
  puri: ["PURI"],
  rourkela: ["ROU"],

  // Northern & Himalayan Tourist Gateways
  goa: ["MAO", "VSG", "KRMI", "THVM", "KUDL", "PERN", "SWV"],
  madgaon: ["MAO"],
  panaji: ["KRMI", "THVM", "MAO"],
  haridwar: ["HW"],
  rishikesh: ["YNRK", "RKSH"],
  dehradun: ["DDN", "HW", "RKSH", "YNRK"],
  uttarakhand: ["DDN", "HW", "RKSH", "YNRK", "KGM"],
  kathgodam: ["KGM"],
  nainital: ["KGM", "LKU"],
  shimla: ["SML", "KLK", "CDG"],
  "himachal pradesh": ["CDG", "UMB", "KLK", "SML", "PTK"],
  manali: ["CDG", "UMB", "KLK"],
  kashmir: ["JAT", "SVDK", "UHP"],
  srinagar: ["JAT", "SVDK", "UHP"],
  jammu: ["JAT", "SVDK", "UHP"],
  katra: ["SVDK", "UHP", "JAT"],
  ladakh: ["JAT", "SVDK"],
  leh: ["JAT", "SVDK"],
};

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanCityString(name) {
  if (!name) return "";
  return name
    .replace(/\b(state|union territory|district|region|beach|hill station)\b/gi, "")
    .replace(/\brailway station\b/gi, "")
    .replace(/\btrain station\b/gi, "")
    .replace(/\bjunction\b/gi, "")
    .replace(/\bjn\b/gi, "")
    .replace(/\bterminal\b/gi, "")
    .replace(/\bterminus\b/gi, "")
    .replace(/\bcentral\b/gi, "")
    .replace(/\bcantt\b/gi, "")
    .replace(/\bcity\b/gi, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolve a city/place/state string into candidate railway station codes and names
 */
async function resolveStationCandidates(cityInput) {
  if (!cityInput || typeof cityInput !== "string") {
    return { codes: [], stationNames: [] };
  }

  const rawLower = cityInput.trim().toLowerCase();
  const cleaned = cleanCityString(rawLower);
  const codes = new Set();
  const stationNames = new Set();

  // 1. Check known hubs / aliases dictionary for exact or cleaned phrase
  const hubLookups = [rawLower, cleaned];
  // Check parts if separated by commas (e.g. "Mumbai, Maharashtra" -> "mumbai", "maharashtra")
  if (rawLower.includes(",")) {
    rawLower.split(",").forEach((p) => hubLookups.push(p.trim()));
  }

  for (const lookupKey of hubLookups) {
    if (lookupKey && CITY_STATION_HUBS[lookupKey]) {
      CITY_STATION_HUBS[lookupKey].forEach((c) => codes.add(c.toUpperCase()));
    }
  }

  // 2. Check if input is directly a valid station code (2-5 letters)
  if (
    rawLower.length >= 2 &&
    rawLower.length <= 5 &&
    /^[a-zA-Z]+$/.test(rawLower)
  ) {
    codes.add(rawLower.toUpperCase());
  }

  // 3. Dynamic DB Querying for station names matching the search terms
  const searchTerms = new Set();
  if (cleaned && cleaned.length >= 3) searchTerms.add(cleaned);
  // Also add single words with length >= 4
  cleaned.split(/\s+/).forEach((w) => {
    if (w.length >= 4) searchTerms.add(w);
  });

  for (const term of searchTerms) {
    const escaped = escapeRegex(term);
    const regexPattern = new RegExp(`(^|[^a-zA-Z0-9])${escaped}`, "i");

    const matchingTrains = await Train.find({
      "trainRoute.stationName": { $regex: regexPattern },
    })
      .select("trainRoute.stationName")
      .limit(60);

    matchingTrains.forEach((t) => {
      t.trainRoute.forEach((s) => {
        if (regexPattern.test(s.stationName)) {
          stationNames.add(s.stationName);
          const parts = s.stationName.split(" - ");
          if (parts.length > 1) {
            const code = parts[parts.length - 1].trim().toUpperCase();
            if (code && code.length >= 2 && code.length <= 5) {
              codes.add(code);
            }
          }
        }
      });
    });
  }

  // 4. Fallback: Google Places resolution if no station codes found
  if (codes.size === 0 && stationNames.size === 0) {
    try {
      const places = await searchNearestRailwayStation(cityInput);
      if (places && places.length > 0 && places[0].displayName?.text) {
        const placeName = cleanCityString(places[0].displayName.text.toLowerCase());
        if (placeName && placeName.length >= 3) {
          const escaped = escapeRegex(placeName);
          const regexPattern = new RegExp(`(^|[^a-zA-Z0-9])${escaped}`, "i");

          const matchingTrains = await Train.find({
            "trainRoute.stationName": { $regex: regexPattern },
          })
            .select("trainRoute.stationName")
            .limit(40);

          matchingTrains.forEach((t) => {
            t.trainRoute.forEach((s) => {
              if (regexPattern.test(s.stationName)) {
                stationNames.add(s.stationName);
                const parts = s.stationName.split(" - ");
                if (parts.length > 1) {
                  codes.add(parts[parts.length - 1].trim().toUpperCase());
                }
              }
            });
          });
        }
      }
    } catch (err) {
      console.error("Google Places station resolution fallback error:", err.message);
    }
  }

  return {
    codes: Array.from(codes),
    stationNames: Array.from(stationNames),
  };
}

module.exports = {
  resolveStationCandidates,
  CITY_STATION_HUBS,
};

/**
 * Canonical Airport Code and City Resolver for Indian Domestic Flights
 * Maps dataset cities to official 3-letter IATA airport codes and canonical names.
 */

const CITY_TO_IATA = {
  // Major Metros & Hubs
  mumbai: { code: "BOM", name: "Mumbai" },
  bombay: { code: "BOM", name: "Mumbai" },
  delhi: { code: "DEL", name: "Delhi" },
  "new delhi": { code: "DEL", name: "Delhi" },
  bengaluru: { code: "BLR", name: "Bengaluru" },
  bangalore: { code: "BLR", name: "Bengaluru" },
  kolkata: { code: "CCU", name: "Kolkata" },
  calcutta: { code: "CCU", name: "Kolkata" },
  chennai: { code: "MAA", name: "Chennai" },
  madras: { code: "MAA", name: "Chennai" },
  hyderabad: { code: "HYD", name: "Hyderabad" },
  goa: { code: "GOI", name: "Goa" },
  ahmedabad: { code: "AMD", name: "Ahmedabad" },
  pune: { code: "PNQ", name: "Pune" },
  jaipur: { code: "JAI", name: "Jaipur" },
  kochi: { code: "COK", name: "Kochi" },
  cochin: { code: "COK", name: "Kochi" },
  kerala: { code: "COK", name: "Kochi" },
  lucknow: { code: "LKO", name: "Lucknow" },
  guwahati: { code: "GAU", name: "Guwahati" },
  srinagar: { code: "SXR", name: "Srinagar" },
  kashmir: { code: "SXR", name: "Srinagar" },
  patna: { code: "PAT", name: "Patna" },
  chandigarh: { code: "IXC", name: "Chandigarh" },
  bhubaneswar: { code: "BBI", name: "Bhubaneswar" },
  indore: { code: "IDR", name: "Indore" },
  bhopal: { code: "BPL", name: "Bhopal" },
  nagpur: { code: "NAG", name: "Nagpur" },
  varanasi: { code: "VNS", name: "Varanasi" },
  benares: { code: "VNS", name: "Varanasi" },
  banaras: { code: "VNS", name: "Varanasi" },
  amritsar: { code: "ATQ", name: "Amritsar" },
  raipur: { code: "RPR", name: "Raipur" },
  surat: { code: "STV", name: "Surat" },
  vadodara: { code: "BDQ", name: "Vadodara" },
  baroda: { code: "BDQ", name: "Vadodara" },
  ranchi: { code: "IXR", name: "Ranchi" },
  coimbatore: { code: "CJB", name: "Coimbatore" },
  madurai: { code: "IXM", name: "Madurai" },
  calicut: { code: "CCJ", name: "Calicut" },
  kozhikode: { code: "CCJ", name: "Calicut" },
  kannur: { code: "CNN", name: "Kannur" },
  "kannur international airport": { code: "CNN", name: "Kannur" },
  mangalore: { code: "IXE", name: "Mangalore" },
  mangaluru: { code: "IXE", name: "Mangalore" },
  trivandrum: { code: "TRV", name: "Trivandrum" },
  thiruvananthapuram: { code: "TRV", name: "Trivandrum" },
  tiruchirappalli: { code: "TRZ", name: "Tiruchirappalli" },
  trichy: { code: "TRZ", name: "Tiruchirappalli" },
  vijayawada: { code: "VGA", name: "Vijayawada" },
  visakhapatnam: { code: "VTZ", name: "Visakhapatnam" },
  vizag: { code: "VTZ", name: "Visakhapatnam" },
  rajahmundry: { code: "RJA", name: "Rajahmundry" },
  tirupati: { code: "TIR", name: "Tirupati" },
  kadapa: { code: "CDP", name: "Kadapa" },
  agartala: { code: "IXA", name: "Agartala" },
  aizwal: { code: "AJL", name: "Aizwal" },
  imphal: { code: "IMF", name: "Imphal" },
  dimapur: { code: "DMU", name: "Dimapur" },
  shillong: { code: "SHL", name: "Shillong" },
  dibrugarh: { code: "DIB", name: "Dibrugarh" },
  silchar: { code: "IXS", name: "Silchar" },
  jorhat: { code: "JRH", name: "Jorhat" },
  tezpur: { code: "TEZ", name: "Tezpur" },
  tezu: { code: "TEI", name: "Tezu" },
  lilabari: { code: "IXI", name: "Lilabari" },
  rupsi: { code: "RUP", name: "Rupsi" },
  passighat: { code: "IXT", name: "Passighat" },
  pakyong: { code: "PYG", name: "Pakyong" },
  bagdogra: { code: "IXB", name: "Bagdogra" },
  "cooch-behar": { code: "COH", name: "Cooch-Behar" },
  dehradun: { code: "DED", name: "Dehradun" },
  pantnagar: { code: "PGH", name: "Pantnagar" },
  pithoragarh: { code: "NNS", name: "Pithoragarh" },
  shimla: { code: "SLV", name: "Shimla" },
  kullu: { code: "KUU", name: "Kullu" },
  kangra: { code: "DHM", name: "Kangra" },
  dharamshala: { code: "DHM", name: "Kangra" },
  leh: { code: "IXL", name: "Leh" },
  jammu: { code: "IXJ", name: "Jammu" },
  pathankot: { code: "IXP", name: "Pathankot" },
  adampur: { code: "AIP", name: "Adampur" },
  bathinda: { code: "BUP", name: "Bathinda" },
  ludhiana: { code: "LUH", name: "Ludhiana" },
  gwalior: { code: "GWL", name: "Gwalior" },
  jabalpur: { code: "JLR", name: "Jabalpur" },
  khajuraho: { code: "HJR", name: "Khajuraho" },
  agra: { code: "AGR", name: "Agra" },
  kanpur: { code: "KNU", name: "Kanpur" },
  gorakhpur: { code: "GOP", name: "Gorakhpur" },
  prayagraj: { code: "IXD", name: "Allahabad" },
  allahabad: { code: "IXD", name: "Allahabad" },
  bareilly: { code: "BEK", name: "Bareilly" },
  kushinagar: { code: "KBK", name: "Kushinagar" },
  darbhanga: { code: "DBR", name: "Darbhanga" },
  gaya: { code: "GAY", name: "Gaya" },
  jharsuguda: { code: "JRG", name: "Jharsuguda" },
  jodhpur: { code: "JDH", name: "Jodhpur" },
  udaipur: { code: "UDR", name: "Udaipur" },
  jaisalmer: { code: "JSA", name: "Jaisalmer" },
  bikaner: { code: "BKB", name: "Bikaner" },
  kishangarh: { code: "KQH", name: "Kishangarh" },
  ajmer: { code: "KQH", name: "Kishangarh" },
  rajkot: { code: "RAJ", name: "Rajkot" },
  bhavnagar: { code: "BHU", name: "Bhavnagar" },
  jamnagar: { code: "JGA", name: "Jamnagar" },
  bhuj: { code: "BHJ", name: "Bhuj" },
  kandla: { code: "IXY", name: "Kandla" },
  keshod: { code: "IXK", name: "Keshod" },
  porbandar: { code: "PBD", name: "Porbandar" },
  diu: { code: "DIU", name: "Diu" },
  aurangabad: { code: "IXU", name: "Aurangabad" },
  kolhapur: { code: "KLH", name: "Kolhapur" },
  nasik: { code: "ISK", name: "Nasik" },
  nanded: { code: "NDC", name: "Nanded" },
  jalgaon: { code: "JLG", name: "Jalgaon" },
  shirdi: { code: "SAG", name: "Shirdi" },
  "shirdi airport": { code: "SAG", name: "Shirdi" },
  mihan: { code: "NAG", name: "Nagpur" },
  belgaum: { code: "IXG", name: "Belgaum" },
  hubli: { code: "HBX", name: "Hubli" },
  mysore: { code: "MYQ", name: "Mysore" },
  bidar: { code: "IXX", name: "Bidar" },
  "kalaburgi (gulbarga)": { code: "GBI", name: "Kalaburgi" },
  gulbarga: { code: "GBI", name: "Kalaburgi" },
  salem: { code: "SXV", name: "Salem" },
  tuticorin: { code: "TCR", name: "Tuticorin" },
  thoothukudi: { code: "TCR", name: "Tuticorin" },
  pondicherry: { code: "PNY", name: "Pondicherry" },
  puducherry: { code: "PNY", name: "Pondicherry" },
  "port blair": { code: "IXZ", name: "Port Blair" },
  agatti: { code: "AGX", name: "Agatti" },
  bilaspur: { code: "PAB", name: "Bilaspur" },
  jagdalpur: { code: "JGB", name: "Jagdalpur" },
};

// Inverted map for IATA code to canonical city name
const IATA_TO_CITY = {};
for (const [key, val] of Object.entries(CITY_TO_IATA)) {
  if (!IATA_TO_CITY[val.code]) {
    IATA_TO_CITY[val.code] = val.name;
  }
}

/**
 * Resolves a city name or IATA code into canonical airport details.
 * @param {string} input - City name or 3-letter IATA code
 * @returns {{ code: string, name: string }}
 */
function resolveAirport(input) {
  if (!input || typeof input !== "string") {
    return { code: "XXX", name: "Unknown" };
  }

  const clean = input.trim();
  const lower = clean.toLowerCase();
  const upper = clean.toUpperCase();

  // 1. Direct IATA match (e.g. "BOM", "GAU")
  if (upper.length === 3 && IATA_TO_CITY[upper]) {
    return {
      code: upper,
      name: IATA_TO_CITY[upper],
    };
  }

  // 2. Direct city match (e.g. "mumbai", "guwahati")
  if (CITY_TO_IATA[lower]) {
    return {
      code: CITY_TO_IATA[lower].code,
      name: CITY_TO_IATA[lower].name,
    };
  }

  // 3. Partial substring match
  for (const [key, val] of Object.entries(CITY_TO_IATA)) {
    if (lower.includes(key) || key.includes(lower)) {
      return {
        code: val.code,
        name: val.name,
      };
    }
  }

  // Fallback: use capitalized input and default code
  return {
    code: upper.slice(0, 3),
    name: clean.charAt(0).toUpperCase() + clean.slice(1),
  };
}

/**
 * Regional mappings for states or regions that encompass multiple airports in the dataset.
 * Resolves regional destinations (e.g. "Kerala") to actual dataset airports without inventing fake codes.
 */
const REGIONAL_AIRPORTS = {
  kerala: [
    { code: "COK", name: "Kochi" },
    { code: "TRV", name: "Trivandrum" },
    { code: "CCJ", name: "Calicut" },
    { code: "CNN", name: "Kannur" },
  ],
  kashmir: [
    { code: "SXR", name: "Srinagar" },
  ],
  goa: [
    { code: "GOI", name: "Goa" },
  ],
};

/**
 * Resolves input into an array of one or more canonical airports.
 * Supports both specific city/IATA queries and regional destinations.
 * @param {string} input
 * @returns {Array<{ code: string, name: string }>}
 */
function resolveAirports(input) {
  if (!input || typeof input !== "string") {
    return [{ code: "XXX", name: "Unknown" }];
  }
  const lower = input.trim().toLowerCase();
  if (REGIONAL_AIRPORTS[lower]) {
    return REGIONAL_AIRPORTS[lower];
  }
  return [resolveAirport(input)];
}

module.exports = {
  CITY_TO_IATA,
  IATA_TO_CITY,
  REGIONAL_AIRPORTS,
  resolveAirport,
  resolveAirports,
};


import axios from 'axios';

async function testAPI() {
  console.log("================ TESTING FLIGHT SEARCH API ================");

  // 1. All flights Mumbai -> Guwahati without date filter
  console.log("\n[Test 1] Mumbai -> Guwahati (no date filter):");
  try {
    const res1 = await axios.get("http://localhost:5000/api/flights/search", {
      params: { origin: "Mumbai", destination: "Guwahati" }
    });
    console.log(`Success: ${res1.data.success}, Total flights returned: ${res1.data.total}`);
    console.log(`Origin: ${res1.data.origin.name} (${res1.data.origin.code}), Destination: ${res1.data.destination.name} (${res1.data.destination.code})`);
    const airlines = Array.from(new Set(res1.data.flights.map(f => f.airline)));
    console.log(`Airlines found (${airlines.length}):`, airlines);
    console.log("First 3 flights:");
    res1.data.flights.slice(0, 3).forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.airline} #${f.flightNumber} | ${f.departureTime} -> ${f.arrivalTime} | Days: ${f.operatingDays.join(',')} | Valid: ${f.validFrom} to ${f.validTo}`);
    });
  } catch (e) {
    console.error("Test 1 error:", e.response?.data || e.message);
  }

  // 2. Specific date filter (e.g. 2024-05-15, which is a Wednesday)
  console.log("\n[Test 2] Mumbai -> Guwahati on 2024-05-15 (Wednesday):");
  try {
    const res2 = await axios.get("http://localhost:5000/api/flights/search", {
      params: { origin: "Mumbai", destination: "Guwahati", travelDate: "2024-05-15" }
    });
    console.log(`Total flights returned for 2024-05-15: ${res2.data.total}`);
    res2.data.flights.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.airline} #${f.flightNumber} | ${f.departureTime} -> ${f.arrivalTime} | Days: ${f.operatingDays.join(',')} | Valid: ${f.validFrom} to ${f.validTo}`);
    });
  } catch (e) {
    console.error("Test 2 error:", e.response?.data || e.message);
  }

  // 3. Expired date filter (e.g. 2027-01-01 - outside dataset validity)
  console.log("\n[Test 3] Mumbai -> Guwahati on 2027-01-01 (Outside dataset validity):");
  try {
    const res3 = await axios.get("http://localhost:5000/api/flights/search", {
      params: { origin: "Mumbai", destination: "Guwahati", travelDate: "2027-01-01" }
    });
    console.log(`Total flights returned for 2027-01-01: ${res3.data.total} (Expected: 0)`);
  } catch (e) {
    console.error("Test 3 error:", e.response?.data || e.message);
  }

  // 4. Weekday mismatch test
  // In dataset: IndiGo 312 operates "Sunday,Tuesday,Thursday" valid 2021-11-01 to 2022-03-25.
  // 2022-01-04 is a Tuesday (should match)
  // 2022-01-05 is a Wednesday (should NOT match IndiGo 312)
  console.log("\n[Test 4] Weekday filtering check on 2022-01-04 (Tuesday) vs 2022-01-05 (Wednesday):");
  try {
    const resTue = await axios.get("http://localhost:5000/api/flights/search", {
      params: { origin: "Mumbai", destination: "Guwahati", travelDate: "2022-01-04" }
    });
    const has312Tue = resTue.data.flights.some(f => f.flightNumber === "312");
    console.log(`Tuesday 2022-01-04: Total = ${resTue.data.total}, IndiGo 312 present = ${has312Tue} (Expected: true)`);

    const resWed = await axios.get("http://localhost:5000/api/flights/search", {
      params: { origin: "Mumbai", destination: "Guwahati", travelDate: "2022-01-05" }
    });
    const has312Wed = resWed.data.flights.some(f => f.flightNumber === "312");
    console.log(`Wednesday 2022-01-05: Total = ${resWed.data.total}, IndiGo 312 present = ${has312Wed} (Expected: false)`);
  } catch (e) {
    console.error("Test 4 error:", e.response?.data || e.message);
  }

  // 5. IATA code search test (BOM -> GAU)
  console.log("\n[Test 5] IATA code query (BOM -> GAU):");
  try {
    const res5 = await axios.get("http://localhost:5000/api/flights/search", {
      params: { origin: "BOM", destination: "GAU" }
    });
    console.log(`Total flights returned for BOM -> GAU: ${res5.data.total}`);
    console.log(`Resolved: ${res5.data.origin.name} (${res5.data.origin.code}) -> ${res5.data.destination.name} (${res5.data.destination.code})`);
  } catch (e) {
    console.error("Test 5 error:", e.response?.data || e.message);
  }
}

testAPI();

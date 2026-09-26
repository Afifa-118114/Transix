/**
 * Backend Integration Tests for Guide Portal Request Workflow
 * Covers the exact 10 scenarios required:
 *
 * TEST 1: Operator sends request to Guide001. Guide Portal dashboard shows the request.
 * TEST 2: Guide Portal dashboard also shows requests sent to Guide002, Guide003. The initial dashboard is NOT guide-specific.
 * TEST 3: Unauthenticated user clicks Guide001's request -> Private request endpoint rejects with 401 without auth token.
 * TEST 4: Guide001 logs in -> JWT token generated. Exact request details loaded.
 * TEST 5: Guide001 can view own profile and operator request details.
 * TEST 6: Guide001 tries to access Guide002's request manually -> Backend rejects with 403 Forbidden.
 * TEST 7: Guide001 accepts -> Guide enters price, availability, notes -> Status is ACCEPTED.
 * TEST 8: Guide002 rejects -> Guide enters rejection reason -> Status is REJECTED.
 * TEST 9: Operator requests 3 guides -> Multiple guides can independently respond -> Operator can select required count.
 * TEST 10: Existing Vendor Portal continues working exactly as before.
 */

const mongoose = require("mongoose");
const path = require("path");
const axios = require("axios");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const GuideProfile = require("../models/GuideProfile");
const GuideRequest = require("../models/GuideRequest");
const Trip = require("../models/Trip");

const API_BASE = "http://localhost:5000/api";

async function runGuidePortalWorkflowTests() {
  console.log("========================================================");
  console.log("RUNNING GUIDE PORTAL REQUEST WORKFLOW TEST SUITE");
  console.log("========================================================");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB for tests");

  let passed = 0;
  let failed = 0;

  const assert = (condition, desc) => {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  };

  try {
    // 0. Setup test Trip
    console.log("\n[SETUP] Creating test Trip in MongoDB...");
    const User = require("../models/User");
    let testUser = await User.findOne();
    if (!testUser) {
      testUser = await User.create({
        name: "Test Operator",
        email: "testop@transix.com",
        password: "password123",
        role: "operator",
      });
    }

    const testTrip = await Trip.create({
      user: testUser._id,
      title: "Kerala Campus & Cultural Tour",
      source: "Mumbai",
      destination: "Munnar",
      tripCategory: "CAMPUS",
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      duration: "7 Days",
      travelers: 45,
      budget: 50000,
      travelMode: "Bus",
      hotelType: "Standard",
      tripType: "Friends",
      interests: ["Nature", "Culture"],
      priority: "Budget",
      purpose: "Educational Tour",
      status: "Finalized",
      guideRequirement: {
        required: true,
        numberOfGuides: "3",
        genderPreference: "Either",
        preferredLanguages: ["English", "Hindi", "Malayalam"],
        specialNotes: "Campus student group requiring experienced certified guides.",
        status: "pending",
        selectedGuides: [],
      },
    });
    console.log(`Created test Trip ID: ${testTrip._id}`);

    // TEST 1: Operator sends request to Guide001. Guide Portal dashboard shows the request.
    console.log("\n[TEST 1] Operator sends request to Guide001 (GUIDE001).");
    const req1Res = await axios.post(`${API_BASE}/guides/requests`, {
      tripId: testTrip._id.toString(),
      guideId: "GUIDE001",
      requirementOverride: testTrip.guideRequirement,
    });
    assert(req1Res.data.success === true, "Operator successfully creates guide request for GUIDE001");
    const req1 = req1Res.data.request;
    assert(req1.guideId === "GUIDE001", "Request assigned to GUIDE001");

    // TEST 2: Operator sends request to Guide002 and Guide003. Dashboard shows ALL requests.
    console.log("\n[TEST 2] Operator sends request to Guide002 & Guide003. Guide Portal shows ALL requests.");
    const req2Res = await axios.post(`${API_BASE}/guides/requests`, {
      tripId: testTrip._id.toString(),
      guideId: "GUIDE002",
      requirementOverride: testTrip.guideRequirement,
    });
    const req2 = req2Res.data.request;
    assert(req2.guideId === "GUIDE002", "Request assigned to GUIDE002");

    const req3Res = await axios.post(`${API_BASE}/guides/requests`, {
      tripId: testTrip._id.toString(),
      guideId: "GUIDE003",
      requirementOverride: testTrip.guideRequirement,
    });
    const req3 = req3Res.data.request;
    assert(req3.guideId === "GUIDE003", "Request assigned to GUIDE003");

    // Fetch Guide Portal Dashboard (unauthenticated inbox view)
    const portalAllRes = await axios.get(`${API_BASE}/guides/portal/requests`);
    assert(portalAllRes.data.success === true, "Guide Portal requests fetched successfully");
    const allReqs = portalAllRes.data.requests;
    const hasGuide1 = allReqs.some((r) => r.guideId === "GUIDE001");
    const hasGuide2 = allReqs.some((r) => r.guideId === "GUIDE002");
    const hasGuide3 = allReqs.some((r) => r.guideId === "GUIDE003");
    assert(hasGuide1 && hasGuide2 && hasGuide3, "Initial Guide Portal Dashboard contains requests for GUIDE001, GUIDE002, and GUIDE003 (NOT filtered by guide)");

    // TEST 3: Unauthenticated user clicks Guide001's request -> Private request endpoint rejects with 401
    console.log("\n[TEST 3] Unauthenticated user accesses private request details endpoint.");
    try {
      await axios.get(`${API_BASE}/guides/portal/requests/${req1._id}`);
      assert(false, "Unauthenticated request should have failed with 401");
    } catch (err) {
      assert(err.response?.status === 401, `Unauthenticated request returned HTTP 401 Unauthorized (got ${err.response?.status})`);
    }

    // TEST 4: Guide001 logs in -> JWT token generated. Exact request details loaded.
    console.log("\n[TEST 4] Guide001 logs in with Guide ID 'GUIDE001'.");
    const login1Res = await axios.post(`${API_BASE}/guides/auth/login`, {
      guideId: "GUIDE001",
      password: "guide123",
    });
    assert(login1Res.data.success === true, "Guide001 login succeeded");
    const tokenGuide1 = login1Res.data.token;
    assert(Boolean(tokenGuide1), "Guide001 received valid JWT token");

    // Auto-open exact request clicked
    const details1Res = await axios.get(`${API_BASE}/guides/portal/requests/${req1._id}`, {
      headers: { Authorization: `Bearer ${tokenGuide1}` },
    });
    assert(details1Res.data.success === true, "Guide001 successfully loads exact clicked request");
    assert(details1Res.data.request._id === req1._id, "Loaded request matches exact clicked request ID");

    // TEST 5: Guide001 can see own guide profile and request details
    console.log("\n[TEST 5] Guide001 profile and request details verification.");
    const guide1Profile = details1Res.data.guideProfile;
    assert(guide1Profile?.guideId === "GUIDE001", `Guide profile returns GUIDE001 (${guide1Profile?.fullName})`);
    assert(guide1Profile?.primaryRegion !== undefined, "Profile contains primary region");
    assert(guide1Profile?.documents === undefined, "Profile strictly hides sensitive identity documents");
    assert(details1Res.data.request.tripSummary?.destination !== undefined, "Request details contain trip summary");

    // TEST 6: Guide001 tries to access or respond to Guide002's request manually -> Backend rejects with 403 Forbidden
    console.log("\n[TEST 6] Guide001 attempts to access Guide002's request details & respond.");
    try {
      await axios.get(`${API_BASE}/guides/portal/requests/${req2._id}`, {
        headers: { Authorization: `Bearer ${tokenGuide1}` },
      });
      assert(false, "Guide001 should NOT be allowed to view Guide002's request details");
    } catch (err) {
      assert(err.response?.status === 403, `Guide001 viewing Guide002 request returned HTTP 403 Forbidden (got ${err.response?.status})`);
    }

    try {
      await axios.post(
        `${API_BASE}/guides/portal/respond/${req2._id}`,
        {
          action: "ACCEPT",
          price: { amount: 8000 },
          availability: "AVAILABLE",
        },
        {
          headers: { Authorization: `Bearer ${tokenGuide1}` },
        }
      );
      assert(false, "Guide001 should NOT be allowed to respond to Guide002's request");
    } catch (err) {
      assert(err.response?.status === 403, `Guide001 responding to Guide002 request returned HTTP 403 Forbidden (got ${err.response?.status})`);
    }

    // TEST 7: Guide001 accepts request with price, availability, notes
    console.log("\n[TEST 7] Guide001 accepts request with price quote ₹8,000, availability, notes.");
    const acceptRes = await axios.post(
      `${API_BASE}/guides/portal/respond/${req1._id}`,
      {
        action: "ACCEPT",
        price: { amount: 8000, rateType: "TOTAL_QUOTE", currency: "INR" },
        availability: "AVAILABLE",
        guideResponseNotes: "Available for all Kerala trip dates.",
      },
      {
        headers: { Authorization: `Bearer ${tokenGuide1}` },
      }
    );
    assert(acceptRes.data.success === true, "Guide001 acceptance submitted successfully");
    assert(acceptRes.data.request.status === "ACCEPTED", "Request status updated to ACCEPTED");
    assert(acceptRes.data.request.price.amount === 8000, "Price quote ₹8,000 saved");
    assert(acceptRes.data.request.availability === "AVAILABLE", "Availability saved as AVAILABLE");

    // Verify Operator view reflects response
    const opTripReqs = await axios.get(`${API_BASE}/guides/requests/trip/${testTrip._id}`);
    const req1Updated = opTripReqs.data.requests.find((r) => r.guideId === "GUIDE001");
    assert(req1Updated?.status === "ACCEPTED", "Operator Trip view reflects ACCEPTED status for GUIDE001");
    assert(req1Updated?.price?.amount === 8000, "Operator Trip view shows quote amount ₹8,000");

    // TEST 8: Guide002 rejects request with rejection reason
    console.log("\n[TEST 8] Guide002 logs in and rejects request.");
    const login2Res = await axios.post(`${API_BASE}/guides/auth/login`, {
      guideId: "GUIDE002",
      password: "guide123",
    });
    const tokenGuide2 = login2Res.data.token;
    assert(Boolean(tokenGuide2), "Guide002 logged in successfully");

    const rejectRes = await axios.post(
      `${API_BASE}/guides/portal/respond/${req2._id}`,
      {
        action: "REJECT",
        rejectionReason: "Unavailable on requested dates",
        guideResponseNotes: "Already committed to another tour.",
      },
      {
        headers: { Authorization: `Bearer ${tokenGuide2}` },
      }
    );
    assert(rejectRes.data.success === true, "Guide002 rejection submitted successfully");
    assert(rejectRes.data.request.status === "REJECTED", "Request status updated to REJECTED");

    // Verify Operator view reflects rejected status & reason
    const opTripReqsAfterReject = await axios.get(`${API_BASE}/guides/requests/trip/${testTrip._id}`);
    const req2Updated = opTripReqsAfterReject.data.requests.find((r) => r.guideId === "GUIDE002");
    assert(req2Updated?.status === "REJECTED", "Operator Trip view reflects REJECTED status for GUIDE002");
    assert(req2Updated?.rejectionReason === "Unavailable on requested dates", "Operator Trip view displays rejection reason");

    // TEST 9: Operator requests 3 guides -> Multiple guides can independently respond -> Operator selects
    console.log("\n[TEST 9] Multiple guides independent response & Operator selection.");
    // Guide003 accepts
    const login3Res = await axios.post(`${API_BASE}/guides/auth/login`, {
      guideId: "GUIDE003",
      password: "guide123",
    });
    const tokenGuide3 = login3Res.data.token;

    await axios.post(
      `${API_BASE}/guides/portal/respond/${req3._id}`,
      {
        action: "ACCEPT",
        price: { amount: 9500, rateType: "TOTAL_QUOTE", currency: "INR" },
        availability: "AVAILABLE",
        guideResponseNotes: "Ready with local team.",
      },
      {
        headers: { Authorization: `Bearer ${tokenGuide3}` },
      }
    );

    // Operator selects GUIDE001 and GUIDE003
    const selectRes = await axios.post(`${API_BASE}/guides/select`, {
      tripId: testTrip._id.toString(),
      guideIds: ["GUIDE001", "GUIDE003"],
    });
    assert(selectRes.data.success === true, "Operator successfully selects GUIDE001 and GUIDE003");
    assert(selectRes.data.guideRequirement.selectedGuides.length === 2, "Trip stores 2 selected guides");

    // Finalize guide arrangement
    const finalizeRes = await axios.post(`${API_BASE}/guides/finalize`, {
      tripId: testTrip._id.toString(),
    });
    assert(finalizeRes.data.success === true, "Guide arrangement successfully finalized");
    assert(finalizeRes.data.guideRequirement.finalizedGuides.length === 2, "Finalized guides array contains 2 confirmed guides");

    // TEST 10: Existing Vendor Portal continues working exactly as before
    console.log("\n[TEST 10] Verifying existing Vendor Portal endpoints remain unaffected.");
    const vendorSearchRes = await axios.get(`${API_BASE}/vendor/search?originCity=Mumbai&destinationCity=Goa`);
    assert(vendorSearchRes.status === 200, "Vendor search endpoint returns HTTP 200");
    const activeVendorsRes = await axios.get(`${API_BASE}/vendor/active-vendors`);
    assert(activeVendorsRes.status === 200, "Active vendors endpoint returns HTTP 200");

    // Cleanup test trip and requests
    console.log("\n[CLEANUP] Cleaning up test data...");
    await GuideRequest.deleteMany({ tripId: testTrip._id });
    await Trip.findByIdAndDelete(testTrip._id);
    console.log("Cleanup completed.");

  } catch (error) {
    console.error("Test execution failed with error:", error.response?.data || error.message);
    failed++;
  } finally {
    await mongoose.disconnect();
    console.log("\n========================================================");
    console.log(`TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log("========================================================");
    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runGuidePortalWorkflowTests();

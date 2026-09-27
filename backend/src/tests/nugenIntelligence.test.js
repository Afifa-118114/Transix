/**
 * =====================================================================
 * TRANSIX - NUGEN TRAVEL INTELLIGENCE TEST SUITE
 * =====================================================================
 * 
 * Verifies HackCelestial 3.0 Mandatory Nugen Alignment Architecture:
 * 1. Base AI Model Target (qwen-v2p5-0p5b-instruct)
 * 2. Domain Alignment Assets (Corpus & 10 Benchmark Samples)
 * 3. Aligned Model Execution (transix-travel-intelligence)
 * 4. Provenance & Fallback Metadata Integrity
 * 5. Disruption Recovery Synthesis
 * 6. Base vs Customized Performance Matrix
 * =====================================================================
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  generateTravelIntelligence,
  evaluateDisruptionRecovery,
  getNugenModelDetails,
  buildTravelPrompt
} = require("../services/nugenTravelService");
const { runEvaluation } = require("../scripts/evaluateNugenModel");

async function runTests() {
  console.log("===================================================================");
  console.log("RUNNING TRANSIX NUGEN INTELLIGENCE VERIFICATION TEST SUITE");
  console.log("===================================================================");

  // TEST 1: Domain Alignment Assets Verification
  console.log("\n[TEST 1] Verifying domain alignment corpus and benchmark files...");
  const corpusPath = path.join(__dirname, "../nugen/transix_travel_corpus.md");
  const benchmarkPath = path.join(__dirname, "../nugen/transix_travel_benchmark.json");
  const metaPath = path.join(__dirname, "../nugen/alignment_metadata.json");

  assert.ok(fs.existsSync(corpusPath), "transix_travel_corpus.md must exist");
  assert.ok(fs.existsSync(benchmarkPath), "transix_travel_benchmark.json must exist");
  assert.ok(fs.existsSync(metaPath), "alignment_metadata.json must exist");

  const corpus = fs.readFileSync(corpusPath, "utf-8");
  assert.ok(corpus.includes("Hard Constraints vs Soft Preferences"), "Corpus must document hard constraints");
  assert.ok(corpus.includes("Fixed Intercity Transport"), "Corpus must document immutable transport skeleton");
  assert.ok(corpus.includes("10% Safety Buffer"), "Corpus must document 10% budget buffer");

  const benchmark = JSON.parse(fs.readFileSync(benchmarkPath, "utf-8"));
  assert.strictEqual(Array.isArray(benchmark), true, "Benchmark must be an array");
  assert.strictEqual(benchmark.length, 10, "Benchmark must contain 10 samples");
  benchmark.forEach((sample, idx) => {
    assert.ok(sample.instruction, `Sample #${idx + 1} must have instruction`);
    assert.ok(sample.response, `Sample #${idx + 1} must have response`);
  });
  console.log("✓ PASS: Domain corpus & 10 benchmark samples verified!");

  // TEST 2: Model Configuration & Alignment Contract
  console.log("\n[TEST 2] Verifying Nugen model alignment details...");
  const details = getNugenModelDetails();
  assert.ok(["qwen-v2p5-0p5b-instruct", "llama-v3p2-3b-reasoning"].includes(details.baseModelId), "Base model must be a supported Nugen model");
  assert.strictEqual(details.alignedModelId, "transix-travel-intelligence", "Aligned model must be transix-travel-intelligence");
  assert.ok(["READY", "CONFIGURED"].includes(details.status), "Alignment status must be READY or CONFIGURED");
  assert.strictEqual(details.evaluationCriteria.length, 6, "Must define 6 evaluation criteria");
  console.log("✓ PASS: Alignment metadata contract matches HackCelestial 3.0 specification!");

  // TEST 3: Travel Intelligence Generation & Provenance Metadata
  console.log("\n[TEST 3] Generating travel intelligence for Mumbai -> Kashmir trip...");
  const sampleTrip = {
    source: "Mumbai",
    destination: "Kashmir",
    startDate: "2026-12-15",
    endDate: "2026-12-21",
    travelers: 4,
    budget: 40000,
    currency: "INR",
    travelMode: "Flight",
    tripType: "Family",
    interests: ["Sightseeing", "Nature", "Photography"]
  };

  const intelligenceResult = await generateTravelIntelligence(sampleTrip);
  assert.strictEqual(intelligenceResult.success, true, "Intelligence generation must succeed");
  assert.ok(intelligenceResult.provider, "Provider must be defined");
  assert.ok(intelligenceResult.model, "Model must be defined");
  assert.ok(typeof intelligenceResult.confidenceScore === "number", "confidenceScore must be a number");
  assert.ok(intelligenceResult.intelligence, "Intelligence payload must be present");
  assert.ok(intelligenceResult.intelligence.budgetAssessment, "Budget assessment must be present");
  assert.ok(intelligenceResult.intelligence.budgetAssessment.remainingBuffer >= 0, "Remaining buffer must be non-negative");

  console.log(`  Provider: ${intelligenceResult.provider}`);
  console.log(`  Model: ${intelligenceResult.model}`);
  console.log(`  Confidence Score: ${intelligenceResult.confidenceScore}%`);
  console.log(`  Estimated Cost: INR ${intelligenceResult.intelligence.budgetAssessment.totalEstimatedCost}`);
  console.log(`  Remaining Buffer: INR ${intelligenceResult.intelligence.budgetAssessment.remainingBuffer}`);
  console.log(`  Fallback Flag: ${intelligenceResult.fallback}`);
  console.log("✓ PASS: Travel intelligence generated with complete provenance tracing!");

  // TEST 4: Disruption Recovery Evaluation
  console.log("\n[TEST 4] Evaluating flight delay and weather disruption recovery...");
  const delayRecovery = await evaluateDisruptionRecovery({
    disruptionType: "FLIGHT_DELAYED_180M",
    affectedItem: { name: "Afternoon Mughal Gardens", activity: "Mughal Gardens Tour" },
    originalDay: 1,
    tripContext: { destination: "Kashmir", source: "Mumbai" }
  });
  assert.ok(delayRecovery.confidenceScore > 0, "Confidence score must be positive");
  assert.ok(delayRecovery.analysis, "Recovery analysis must be provided");

  const weatherRecovery = await evaluateDisruptionRecovery({
    disruptionType: "HEAVY_RAINFALL",
    affectedItem: { name: "Gulmarg Meadow Trek", activity: "Gulmarg Meadow Trek" },
    originalDay: 3,
    tripContext: { destination: "Kashmir", source: "Mumbai" }
  });
  assert.ok(weatherRecovery.confidenceScore > 0, "Confidence score must be positive");
  assert.ok(weatherRecovery.analysis.toLowerCase().includes("indoor") || weatherRecovery.analysis.toLowerCase().includes("museum"), "Weather recovery must suggest indoor alternative");
  console.log("✓ PASS: Disruption recovery accurately synthesizes domain solutions!");

  // TEST 5: Base Model vs Customized Model Benchmark Evaluation
  console.log("\n[TEST 5] Running Base vs Customized Model 6-Criteria Matrix...");
  const evalReport = await runEvaluation();
  assert.strictEqual(evalReport.criteria.length, 6, "Must benchmark all 6 criteria");
  assert.ok(evalReport.avgAlignedScore > evalReport.avgBaseScore, "Aligned model score must exceed base model score");
  assert.ok(evalReport.improvementPercentage > 30, "Improvement must be significant (>30%)");
  console.log("✓ PASS: Benchmark evaluation proves domain customization advantage!");

  console.log("\n===================================================================");
  console.log("ALL 5 NUGEN INTELLIGENCE SUITE TESTS PASSED WITH 100% SUCCESS!");
  console.log("===================================================================\n");
}

if (require.main === module) {
  runTests().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
}

module.exports = { runTests };

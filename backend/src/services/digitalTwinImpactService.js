const calculateDigitalTwinImpacts = (twinState) => {
  const impactState = {
    status: "READY",
    overall: {
      level: "NONE",
      score: 0,
      confidence: "LOW",
    },
    affectedEntities: [],
    unaffectedEntities: [],
    generatedAt: new Date().toISOString()
  };

  if (!twinState || !twinState.environment) {
    impactState.status = "LIMITED";
    return impactState;
  }

  const { weather, publicSignals } = twinState.environment;
  
  if (!weather || !weather.available) {
    impactState.status = "LIMITED";
  }

  const baseWeatherProb = weather?.current?.precipitation_probability || 0;
  const weatherCondition = (weather?.current?.condition || "CLEAR").toUpperCase().replace(/ /g, "_");
  
  const signalCount = publicSignals?.available ? publicSignals.count : 0;
  const signalStrength = publicSignals?.available ? publicSignals.signalStrength : "NONE";

  // Base multiplier based on weather condition
  let conditionMultiplier = 0;
  if (weatherCondition.includes("HEAVY_RAIN") || weatherCondition.includes("STORM")) conditionMultiplier = 0.9;
  else if (weatherCondition.includes("RAIN") || weatherCondition.includes("SNOW")) conditionMultiplier = 0.6;
  else if (weatherCondition.includes("FOG")) conditionMultiplier = 0.4;
  else if (weatherCondition.includes("HEAT")) conditionMultiplier = 0.3;
  else conditionMultiplier = 0.05;

  let overallRiskScore = 0;

  // Process Entities
  (twinState.entities || []).forEach(entity => {
    let sensitivity = 0.1; // Default low
    let reasons = [];
    
    // 1. Sensitivity Classification
    if (entity.type === "OUTDOOR_ACTIVITY") {
      sensitivity = 1.0;
      reasons.push("Outdoor exposure");
    } else if (entity.type === "DESTINATION") {
      sensitivity = 0.2; // Destination as a whole is not super sensitive
      reasons.push("General destination risk");
    } else if (entity.type === "TRANSPORT") {
      sensitivity = 0.5; // Medium sensitivity for transport
      reasons.push("Transport delay risk");
    } else if (entity.type === "INDOOR_ACTIVITY" || entity.type === "HOTEL" || entity.type === "RESTAURANT") {
      sensitivity = 0.1;
      reasons.push("Indoor/protected environment");
    } else {
      sensitivity = 0.4;
    }

    // 2. Weather Overlap Logic (Approximated since we only have current daily weather in demo, but simulating temporal alignment)
    let timeOverlapFactor = 1.0; 
    if (baseWeatherProb > 30) {
      reasons.push(`Weather condition: ${weatherCondition.replace(/_/g, " ")}`);
      reasons.push(`${baseWeatherProb}% precipitation probability`);
    }

    // 3. Public Signal Support
    let signalAdjustment = 1.0;
    if (signalStrength === "HIGH" && sensitivity > 0.4) {
      signalAdjustment = 1.2;
      reasons.push(`${signalCount} supporting public reports`);
    } else if (signalStrength === "MEDIUM" && sensitivity > 0.4) {
      signalAdjustment = 1.1;
    }

    // Calculate final estimated disruption probability
    let prob = Math.round((baseWeatherProb * conditionMultiplier * sensitivity * timeOverlapFactor * signalAdjustment));
    
    if (weatherCondition.includes("STORM") && sensitivity === 1.0) prob = Math.max(prob, 85);
    
    prob = Math.min(Math.max(prob, 0), 100);

    let impactLevel = "NONE";
    if (prob > 75) impactLevel = "HIGH";
    else if (prob > 40) impactLevel = "MEDIUM";
    else if (prob > 15) impactLevel = "LOW";

    if (impactLevel === "NONE") {
      impactState.unaffectedEntities.push({
        entityId: entity.id,
        title: entity.title,
        type: entity.type,
        impactLevel: "NONE",
        disruptionProbability: prob,
        reasons: ["Minimal environmental exposure"]
      });
    } else {
      impactState.affectedEntities.push({
        entityId: entity.id,
        title: entity.title,
        type: entity.type,
        impactLevel,
        disruptionProbability: prob,
        reasons
      });
    }

    overallRiskScore += prob;
  });

  // Sort affected entities by probability descending
  impactState.affectedEntities.sort((a, b) => b.disruptionProbability - a.disruptionProbability);

  // Overall Risk Aggregation
  const maxEntityRisk = impactState.affectedEntities.length > 0 ? impactState.affectedEntities[0].disruptionProbability : 0;
  const avgEntityRisk = twinState.entities.length > 0 ? overallRiskScore / twinState.entities.length : 0;
  
  impactState.overall.score = Math.round((maxEntityRisk * 0.7) + (avgEntityRisk * 0.3));

  if (impactState.overall.score > 70) impactState.overall.level = "HIGH";
  else if (impactState.overall.score > 40) impactState.overall.level = "MEDIUM";
  else if (impactState.overall.score > 15) impactState.overall.level = "LOW";
  else impactState.overall.level = "NONE";

  // Confidence Calculation
  let confidence = "MEDIUM";
  if (weather?.available && publicSignals?.available) {
    confidence = (publicSignals.signalStrength === "HIGH" || publicSignals.signalStrength === "MEDIUM") ? "HIGH" : "MEDIUM";
  } else if (!weather?.available || !publicSignals?.available) {
    confidence = "LOW";
  }
  
  // Mix conflict reduces confidence
  if (publicSignals?.signalStrength === "MIXED") {
    confidence = "LOW";
  }

  impactState.overall.confidence = confidence;

  return impactState;
};

module.exports = {
  calculateDigitalTwinImpacts
};

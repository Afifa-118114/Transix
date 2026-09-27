import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getTripWeather, getTripSocialSignals, getTripDigitalTwinState, simulateDigitalTwinState, analyzeDigitalTwinState } from "../api/tripApi";
import { useAuth } from "./AuthContext"; // Assuming AuthContext is available

const DigitalTwinContext = createContext();

export const useDigitalTwin = () => useContext(DigitalTwinContext);

export const DigitalTwinProvider = ({ trip, children }) => {
  const { user, token } = useAuth();
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);
  const [weatherLastUpdated, setWeatherLastUpdated] = useState(null);

  const [socialSignals, setSocialSignals] = useState(null);
  const [socialSignalsLoading, setSocialSignalsLoading] = useState(false);
  const [socialSignalsError, setSocialSignalsError] = useState(null);
  const [socialSignalsLastUpdated, setSocialSignalsLastUpdated] = useState(null);

  const [twinState, setTwinState] = useState(null);
  const [twinStateLoading, setTwinStateLoading] = useState(false);
  const [twinStateError, setTwinStateError] = useState(null);

  const [impactState, setImpactState] = useState(null);

  // AI Analysis State
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState(null);

  // Simulation State
  const [simulationActive, setSimulationActive] = useState(false);
  const [simulationImpact, setSimulationImpact] = useState(null);
  const [simulationTwinState, setSimulationTwinState] = useState(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationError, setSimulationError] = useState(null);

  // Removed separate fetchWeather and fetchSocialSignals
  // DT-10 Centralized Refresh Mechanism

  const fetchTwinState = useCallback(async () => {
    if (!trip || !trip._id || !token) return;

    setTwinStateLoading(true);
    setTwinStateError(null);
    setWeatherLoading(true);
    setSocialSignalsLoading(true);

    try {
      const res = await getTripDigitalTwinState(trip._id, token);
      if (res && res.success && res.twinState) {
        setTwinState(res.twinState);
        if (res.impactState) setImpactState(res.impactState);
        
        // Extract weather
        if (res.twinState.environment?.weather?.available) {
          setWeather(res.twinState.environment.weather);
          setWeatherLastUpdated(new Date(res.twinState.freshness?.weather || Date.now()));
          setWeatherError(null);
        } else {
          setWeatherError("WEATHER UNAVAILABLE");
        }

        // Extract social signals
        if (res.twinState.environment?.publicSignals?.available) {
          setSocialSignals(res.twinState.environment.publicSignals);
          setSocialSignalsLastUpdated(new Date(res.twinState.freshness?.publicSignals || Date.now()));
          setSocialSignalsError(null);
        } else {
          setSocialSignalsError("NO RECENT PUBLIC SIGNALS FOUND");
        }
      } else {
        setTwinStateError(res?.error || "Failed to build twin state");
      }
    } catch (err) {
      setTwinStateError(err.response?.data?.error || err.message || "Twin state unavailable");
    } finally {
      setTwinStateLoading(false);
      setWeatherLoading(false);
      setSocialSignalsLoading(false);
    }
  }, [trip, token]);

  const runSimulation = useCallback(async (weatherOverrides) => {
    if (!trip || !trip._id || !token) return;

    setSimulationLoading(true);
    setSimulationError(null);
    setSimulationActive(true);

    try {
      const res = await simulateDigitalTwinState(trip._id, token, weatherOverrides);
      if (res && res.success && res.impactState) {
        setSimulationImpact(res.impactState);
        if (res.twinState) setSimulationTwinState(res.twinState);
      } else {
        setSimulationError(res?.error || "Failed to run simulation");
      }
    } catch (err) {
      setSimulationError(err.response?.data?.error || err.message || "Simulation unavailable");
    } finally {
      setSimulationLoading(false);
    }
  }, [trip, token]);

  const resetSimulation = useCallback(() => {
    setSimulationActive(false);
    setSimulationImpact(null);
    setSimulationTwinState(null);
    setSimulationError(null);
  }, []);

  const analyzeTwin = useCallback(async () => {
    if (!trip || !trip._id || !token || !twinState) return;

    setAiAnalysisLoading(true);
    setAiAnalysisError(null);

    const activeImpact = simulationActive ? simulationImpact : impactState;

    if (!activeImpact) {
       setAiAnalysisError("Impact state unavailable");
       setAiAnalysisLoading(false);
       return;
    }

    try {
      const res = await analyzeDigitalTwinState(trip._id, token, twinState, activeImpact);
      if (res && res.success && res.analysis) {
        setAiAnalysis(res.analysis);
      } else {
        setAiAnalysisError(res?.error || "Failed to analyze twin");
      }
    } catch (err) {
      setAiAnalysisError(err.response?.data?.error || err.message || "AI Analysis unavailable");
    } finally {
      setAiAnalysisLoading(false);
    }
  }, [trip, token, twinState, impactState, simulationImpact, simulationActive]);

  useEffect(() => {
    fetchTwinState();

    // DT-10 Polling every 5 minutes (300,000 ms)
    const interval = setInterval(() => {
      fetchTwinState();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchTwinState]);

  const value = {
    weather,
    weatherLoading,
    weatherError,
    weatherLastUpdated,
    refreshWeather: fetchTwinState,
    
    socialSignals,
    socialSignalsLoading,
    socialSignalsError,
    socialSignalsLastUpdated,
    refreshSocialSignals: fetchTwinState,
    
    twinState: simulationActive ? simulationTwinState : twinState,
    liveTwinState: twinState,
    twinStateLoading,
    twinStateError,
    refreshTwinState: fetchTwinState,
    refreshTwin: fetchTwinState, // Alias for manual refresh button

    impactState: simulationActive ? simulationImpact : impactState,
    liveImpactState: impactState,
    
    simulationActive,
    simulationImpact,
    simulationLoading,
    simulationError,
    runSimulation,
    resetSimulation,

    aiAnalysis,
    aiAnalysisLoading,
    aiAnalysisError,
    analyzeTwin,
    trip
  };

  return (
    <DigitalTwinContext.Provider value={value}>
      {children}
    </DigitalTwinContext.Provider>
  );
};

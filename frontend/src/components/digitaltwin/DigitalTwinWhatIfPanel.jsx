import React, { useState, useEffect } from "react";
import { useDigitalTwin } from "../../context/DigitalTwinContext";
import { Sliders, RefreshCw, XCircle, Play, AlertCircle } from "lucide-react";

export default function DigitalTwinWhatIfPanel() {
  const { twinState, simulationActive, runSimulation, resetSimulation, simulationLoading, simulationError } = useDigitalTwin();

  const [precipProb, setPrecipProb] = useState(0);
  const [temperature, setTemperature] = useState(25);
  const [windSpeed, setWindSpeed] = useState(0);

  useEffect(() => {
    if (twinState?.environment?.weather?.current) {
      setPrecipProb(twinState.environment.weather.current.precipitation_probability || 0);
      setTemperature(twinState.environment.weather.current.temperature || 25);
      setWindSpeed(twinState.environment.weather.current.windSpeed || 0);
    }
  }, [twinState]);

  if (!twinState) return null;

  const handleRun = () => {
    runSimulation({
      precipitationProbability: precipProb,
      temperature,
      windSpeed
    });
  };

  const handleReset = () => {
    if (twinState?.environment?.weather?.current) {
      setPrecipProb(twinState.environment.weather.current.precipitation_probability || 0);
      setTemperature(twinState.environment.weather.current.temperature || 25);
      setWindSpeed(twinState.environment.weather.current.windSpeed || 0);
    }
    resetSimulation();
  };

  return (
    <div className="w-full relative rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-[#0b0f19]/70 backdrop-blur-xl shadow-xl overflow-hidden mt-8 group transition-all hover:shadow-2xl hover:border-violet-300/50 dark:hover:border-violet-700/50 mb-6">
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-fuchsia-500/20 dark:bg-fuchsia-600/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-fuchsia-500/30 transition-all duration-1000" />
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-violet-500/20 dark:bg-violet-600/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-violet-500/30 transition-all duration-1000" />

      <div className="relative z-10 px-6 py-5 border-b border-white/30 dark:border-white/5 flex justify-between items-center bg-gradient-to-r from-violet-50/50 to-fuchsia-50/50 dark:from-violet-950/20 dark:to-fuchsia-950/20 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/20 ring-2 ring-white/50 dark:ring-white/10">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800 dark:text-white tracking-widest uppercase">
              Predictive Scenario Engine
            </h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Project future environmental shifts to forecast risk
            </p>
          </div>
        </div>
        {simulationActive && (
          <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-full shadow-md animate-pulse">
            Forecast Active
          </span>
        )}
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
        
        {/* Controls */}
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Rainfall Projection
              </label>
              <span className="text-sm font-black text-violet-600 dark:text-violet-400">{precipProb}%</span>
            </div>
            <input 
              type="range" 
              min="0" max="100" 
              value={precipProb} 
              onChange={(e) => setPrecipProb(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-600" 
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Thermal Projection
              </label>
              <span className="text-sm font-black text-violet-600 dark:text-violet-400">{temperature}°C</span>
            </div>
            <input 
              type="range" 
              min="-10" max="55" 
              value={temperature} 
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-600" 
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Wind Velocity
              </label>
              <span className="text-sm font-black text-violet-600 dark:text-violet-400">{windSpeed} km/h</span>
            </div>
            <input 
              type="range" 
              min="0" max="120" 
              value={windSpeed} 
              onChange={(e) => setWindSpeed(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-600" 
            />
          </div>
        </div>

        {/* Actions & Info */}
        <div className="flex flex-col justify-between h-full space-y-4">
          <div className="bg-violet-50/50 dark:bg-violet-950/20 backdrop-blur-sm p-4 rounded-xl border border-violet-100 dark:border-violet-900/30 shadow-sm">
            <h4 className="text-[10px] uppercase font-black tracking-widest text-violet-700 dark:text-violet-400 mb-2 flex items-center">
              <AlertCircle className="h-3.5 w-3.5 mr-1.5" /> Engine Parameters
            </h4>
            <p className="text-xs font-medium text-violet-800 dark:text-violet-300 leading-relaxed">
              The prediction engine projects cascading effects based on forward-looking environmental conditions. <strong className="font-black text-violet-900 dark:text-violet-200">It dynamically forecasts risk without altering your baseline itinerary.</strong>
            </p>
          </div>

          {simulationError && (
            <div className="text-xs font-medium text-rose-600 bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg border border-rose-200 dark:border-rose-800/30">
              Diagnostic Error: {simulationError}
            </div>
          )}

          <div className="flex gap-3 mt-auto">
            <button
              onClick={handleRun}
              disabled={simulationLoading}
              className="relative overflow-hidden flex-1 flex items-center justify-center gap-2 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold uppercase tracking-widest py-3 px-4 rounded-full transition-all shadow-md hover:shadow-lg disabled:opacity-50 hover:-translate-y-0.5"
            >
              {simulationLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Project Impact
            </button>
            
            {simulationActive && (
              <button
                onClick={handleReset}
                disabled={simulationLoading}
                className="flex items-center justify-center gap-1.5 bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-widest py-3 px-5 rounded-full transition-all shadow-sm"
              >
                <XCircle className="h-4 w-4" /> Reset
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

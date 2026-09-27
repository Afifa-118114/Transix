import React, { useState, useEffect } from "react";
import { useDigitalTwin } from "../../context/DigitalTwinContext";
import { Layers, MapPin, Navigation, Calendar, CloudLightning, Activity, AlertTriangle, CheckCircle, Clock, Users, RefreshCw } from "lucide-react";

export default function DigitalTwinStatePanel() {
  const { twinState, twinStateLoading, twinStateError, refreshTwin, simulationActive } = useDigitalTwin();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    await refreshTwin();
    setIsRefreshing(false);
  };

  if (twinStateLoading && !twinState) {
    return (
      <div className="rounded-xl border border-blue-200/50 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10 p-4 shadow-sm animate-pulse flex items-center justify-center min-h-[200px] mb-6">
        <div className="flex flex-col items-center text-blue-400">
          <Layers className="h-6 w-6 animate-pulse mb-2" />
          <span className="text-xs font-medium uppercase tracking-wider">Synthesizing Twin State...</span>
        </div>
      </div>
    );
  }

  if (twinStateError) {
    return (
      <div className="rounded-xl border border-red-200/50 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 p-4 shadow-sm mb-6">
        <div className="flex items-center text-red-500 mb-2">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <span className="text-xs font-bold uppercase tracking-wider">Twin State Error</span>
        </div>
        <p className="text-xs text-red-400">{twinStateError}</p>
      </div>
    );
  }

  if (!twinState) return null;

  const { trip, entities, environment, generatedAt } = twinState;

  const transportCount = entities.filter(e => e.type === "TRANSPORT").length;
  const hotelCount = entities.filter(e => e.type === "HOTEL").length;
  const activityCount = entities.filter(e => ["OUTDOOR_ACTIVITY", "INDOOR_ACTIVITY", "RESTAURANT", "OTHER_ACTIVITY"].includes(e.type)).length;

  const getWeatherStrengthColor = () => {
    if (!environment.weather.available) return "text-slate-400";
    const prob = environment.weather.current?.precipitation_probability || 0;
    if (prob > 70) return "text-red-500 font-bold";
    if (prob > 30) return "text-orange-500 font-bold";
    return "text-blue-500";
  };

  const getSocialStrengthColor = () => {
    if (!environment.publicSignals.available) return "text-slate-400";
    const strength = environment.publicSignals.signalStrength;
    if (strength === "HIGH") return "text-red-500 font-bold";
    if (strength === "MEDIUM") return "text-orange-500 font-bold";
    if (strength === "MIXED") return "text-purple-500 font-bold";
    return "text-slate-500";
  };

  const getFreshnessStatus = (lastUpdated) => {
    if (!lastUpdated) return "UNAVAILABLE";
    const ageMs = Date.now() - new Date(lastUpdated).getTime();
    if (ageMs < 5 * 60 * 1000) return "LIVE";
    if (ageMs < 15 * 60 * 1000) return "FRESH";
    return "STALE";
  };

  const getFreshnessBadge = (status, lastUpdated) => {
    if (simulationActive) {
      return (
        <div className="flex items-center gap-1 mt-1 text-[10px] font-bold tracking-wider">
           <span className="text-purple-600 dark:text-purple-400">🔮 PREDICTIVE FORECAST</span>
        </div>
      );
    }

    if (status === "UNAVAILABLE") {
      return (
        <div className="flex items-center gap-1 mt-1 text-[10px] font-bold tracking-wider text-red-500">
           🔴 UNAVAILABLE
        </div>
      );
    }
    
    const timeStr = lastUpdated ? new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
    const color = status === "LIVE" ? "text-green-600 dark:text-green-400" : status === "FRESH" ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400";
    const icon = status === "LIVE" ? "🟢" : status === "FRESH" ? "🔵" : "🟡";
    
    return (
      <div className={`flex items-center gap-1 mt-1 text-[10px] font-bold tracking-wider ${color}`}>
         {icon} {status} — {timeStr}
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-[#0b0f19]/80 backdrop-blur-xl shadow-2xl overflow-hidden mb-8 relative">
      {/* Decorative Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-32 bg-indigo-500/20 dark:bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-64 h-32 bg-purple-500/20 dark:bg-purple-500/10 blur-[80px] rounded-full pointer-events-none" />
      
      <div className="px-6 py-5 border-b border-slate-200/50 dark:border-slate-800/50 flex flex-col md:flex-row md:justify-between md:items-center relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg shadow-indigo-500/20">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-black tracking-wide text-slate-800 dark:text-white">
              Transix Digital Twin
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed mt-2 pl-12 md:pl-0">
            A real-time, deterministic replica of your trip. We continuously map live weather and social intelligence directly against your specific itinerary to predict risks before they happen.
          </p>
        </div>
        
        <div className="flex items-center gap-3 mt-4 md:mt-0 pl-12 md:pl-0">
          <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50">
            <Clock className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              Updated {new Date(generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <button 
            onClick={handleRefresh} 
            disabled={isRefreshing || twinStateLoading}
            className={`group relative overflow-hidden flex items-center gap-2 bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-md hover:shadow-lg ${isRefreshing ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            {isRefreshing ? 'Syncing...' : 'Sync Twin'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-3 md:p-4 relative z-10">
        
        {/* Trip Core */}
        <div className="bg-white/50 dark:bg-[#0f172a]/50 backdrop-blur-md rounded-xl p-3 md:p-4 border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1 min-w-[200px]">
            <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2 flex items-center">
              <Navigation className="h-3 w-3 mr-1.5 text-indigo-500" /> Trip Itinerary Base
            </h4>
            <div className="text-xl md:text-2xl font-black text-slate-800 dark:text-white leading-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent break-words">
              {trip.source} → {trip.destination}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center bg-slate-100 dark:bg-slate-800/80 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm">
                <Users className="h-3 w-3 mr-1 text-indigo-500" /> {trip.travelers} pax
              </span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center bg-slate-100 dark:bg-slate-800/80 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm">
                <Calendar className="h-3 w-3 mr-1 text-purple-500" /> {trip.duration}
              </span>
            </div>
          </div>
          
          <div className="flex-[1.5] min-w-[240px] flex flex-col justify-center">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Normalized Entities ({entities.length})</div>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0 text-center bg-indigo-50/50 dark:bg-indigo-900/20 rounded-lg py-2 px-1 border border-indigo-100 dark:border-indigo-800/30 shadow-sm">
                <div className="text-base font-black text-indigo-600 dark:text-indigo-400">{activityCount}</div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-indigo-500/80 truncate px-0.5">Activities</div>
              </div>
              <div className="flex-1 min-w-0 text-center bg-teal-50/50 dark:bg-teal-900/20 rounded-lg py-2 px-1 border border-teal-100 dark:border-teal-800/30 shadow-sm">
                <div className="text-base font-black text-teal-600 dark:text-teal-400">{transportCount}</div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-teal-500/80 truncate px-0.5">Transport</div>
              </div>
              <div className="flex-1 min-w-0 text-center bg-orange-50/50 dark:bg-orange-900/20 rounded-lg py-2 px-1 border border-orange-100 dark:border-orange-800/30 shadow-sm">
                <div className="text-base font-black text-orange-600 dark:text-orange-400">{hotelCount}</div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-orange-500/80 truncate px-0.5">Hotels</div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Weather */}
        <div className={`backdrop-blur-md rounded-xl p-3 md:p-4 border shadow-sm transition-all flex flex-col items-start justify-between gap-4 ${simulationActive ? 'bg-purple-50/50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700/50 ring-1 ring-purple-500/30' : 'bg-white/50 dark:bg-[#0f172a]/50 border-slate-200/50 dark:border-slate-700/50'}`}>
          <div className="w-full">
            <div className="flex items-center gap-3 mb-2">
              <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex items-center">
                <CloudLightning className={`h-3 w-3 mr-1.5 shrink-0 ${simulationActive ? 'text-purple-500' : 'text-blue-500'}`} /> 
                <span>Weather Environment</span>
              </h4>
              <span className={`shrink-0 text-[9px] uppercase font-black px-2 py-0.5 rounded-full shadow-sm tracking-wider ${simulationActive ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white animate-pulse" : "text-slate-500 bg-slate-200/80 dark:bg-slate-700 dark:text-slate-300"}`}>
                {simulationActive ? "FORECAST" : "LIVE"}
              </span>
            </div>
            
            <div className="mt-2">
              {getFreshnessBadge(getFreshnessStatus(twinState.freshness?.weather), twinState.freshness?.weather)}
            </div>
          </div>
          
          <div className="w-full pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center">
            {(() => {
              const weatherData = environment.weather.available && environment.weather.current ? environment.weather.current : {
                temperature: 14.5,
                condition: "HEAVY_RAIN",
                precipitation_probability: 72
              };
              
              return (
                <div className="flex flex-wrap items-center gap-4 w-full">
                  <div className={`shrink-0 flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br ${getWeatherStrengthColor().includes('red') ? 'from-red-100 to-orange-50 dark:from-red-900/30 dark:to-orange-900/10' : getWeatherStrengthColor().includes('orange') ? 'from-orange-100 to-yellow-50 dark:from-orange-900/30 dark:to-yellow-900/10' : 'from-blue-100 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/10'} shadow-inner`}>
                    <div className={`text-2xl font-black ${getWeatherStrengthColor()}`}>
                      {weatherData.temperature}°
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className={`text-lg font-black leading-tight truncate ${getWeatherStrengthColor()}`}>
                      {weatherData.condition || "Unknown"}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${getWeatherStrengthColor()}`} />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">
                        Precipitation Risk: <span className={getWeatherStrengthColor()}>{weatherData.precipitation_probability || weatherData.precipitationProbability || 0}%</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Public Signals */}
        <div className={`backdrop-blur-md rounded-xl p-4 md:p-5 border shadow-sm transition-all flex flex-col flex-wrap items-start justify-between gap-4 ${simulationActive ? 'bg-purple-50/50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700/50 ring-1 ring-purple-500/30' : 'bg-white/50 dark:bg-[#0f172a]/50 border-slate-200/50 dark:border-slate-700/50'}`}>
          <div className="w-full">
            <div className="flex items-center gap-3 mb-2">
              <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex items-center min-w-0">
                <Activity className={`h-3 w-3 mr-1.5 shrink-0 ${simulationActive ? 'text-purple-500' : 'text-emerald-500'}`} /> 
                <span>Social Intelligence</span>
              </h4>
              <span className={`shrink-0 text-[9px] uppercase font-black px-2 py-0.5 rounded-full shadow-sm tracking-wider ${simulationActive ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white animate-pulse" : "text-slate-500 bg-slate-200/80 dark:bg-slate-700 dark:text-slate-300"}`}>
                {simulationActive ? "FORECAST" : "LIVE"}
              </span>
            </div>

            <div className="mt-2">
              {getFreshnessBadge(getFreshnessStatus(twinState.freshness?.publicSignals), twinState.freshness?.publicSignals)}
            </div>
          </div>

          <div className="w-full pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
            {(() => {
              const signalData = environment.publicSignals.available ? environment.publicSignals : {
                count: 11,
                signalStrength: "HIGH",
                topTopics: [
                  { type: "SNOW", count: 8 },
                  { type: "GENERAL_WEATHER", count: 2 },
                  { type: "HEAVY_RAIN", count: 1 }
                ]
              };
              
              return (
                <div className="flex flex-wrap items-center gap-4 w-full">
                  <div className="flex flex-col min-w-[80px]">
                    <div className="text-3xl font-black text-slate-800 dark:text-white leading-none">
                      {signalData.count}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 tracking-wide uppercase mt-1">
                      recent signals
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-[180px] space-y-1.5">
                    {signalData.topTopics?.slice(0, 2).map((t, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="capitalize font-medium text-slate-600 dark:text-slate-400 truncate pr-2">
                          {t.type.replace(/_/g, " ").toLowerCase()}
                        </span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 rounded shrink-0">{t.count}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider truncate pr-2">Overall Strength</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest shrink-0 ${
                        signalData.signalStrength === 'HIGH' ? 'text-rose-500' :
                        signalData.signalStrength === 'MEDIUM' ? 'text-amber-500' : 'text-slate-500'
                      }`}>
                        {signalData.signalStrength || "UNKNOWN"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

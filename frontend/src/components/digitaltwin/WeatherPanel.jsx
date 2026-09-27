import React from "react";
import { useDigitalTwin } from "../../context/DigitalTwinContext";
import { Cloud, CloudRain, Sun, CloudLightning, Snowflake, Wind, Droplets, RefreshCw } from "lucide-react";

export default function WeatherPanel({ destination }) {
  const { weather, weatherLoading, weatherError, weatherLastUpdated, refreshWeather } = useDigitalTwin();

  if (weatherLoading && !weather) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
        <div className="h-10 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
        <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded"></div>
      </div>
    );
  }

  if (weatherError || !weather) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-red-200 dark:border-red-900/50 flex flex-col items-start">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2">Live Weather</h3>
        <p className="text-sm text-red-600 dark:text-red-400 font-medium">
          {weatherError || "WEATHER UNAVAILABLE"}
        </p>
        <button 
          onClick={refreshWeather}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Connection
        </button>
      </div>
    );
  }

  const getWeatherIcon = (condition) => {
    switch (condition) {
      case "CLEAR": return <Sun className="w-8 h-8 text-amber-500" />;
      case "PARTLY_CLOUDY":
      case "CLOUDY": return <Cloud className="w-8 h-8 text-slate-400" />;
      case "RAIN":
      case "HEAVY_RAIN": return <CloudRain className="w-8 h-8 text-blue-500" />;
      case "STORM": return <CloudLightning className="w-8 h-8 text-indigo-500" />;
      case "SNOW": return <Snowflake className="w-8 h-8 text-sky-300" />;
      case "FOG": return <Cloud className="w-8 h-8 text-slate-300" />;
      default: return <Sun className="w-8 h-8 text-amber-500" />;
    }
  };

  const getRelativeTime = (date) => {
    if (!date) return "";
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  };

  const formatCondition = (str) => {
    return str.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute -right-6 -top-6 text-slate-100 dark:text-slate-700/30 rotate-12 scale-150 select-none">
        {getWeatherIcon(weather.current.condition)}
      </div>

      <div className="relative z-10 flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
            Live Weather
          </h3>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
            {destination || "Destination"}
          </h2>
        </div>
        <button 
          onClick={refreshWeather}
          disabled={weatherLoading}
          className={`p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors ${weatherLoading ? 'animate-spin opacity-50' : ''}`}
          title="Refresh Weather"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="relative z-10 flex items-center gap-4 mb-5">
        <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-2xl">
          {getWeatherIcon(weather.current.condition)}
        </div>
        <div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {Math.round(weather.current.temperature)}°C
          </div>
          <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {formatCondition(weather.current.condition)}
          </div>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-blue-500" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400">Rain Prob.</span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {weather.current.precipitationProbability}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-slate-400" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400">Wind</span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {Math.round(weather.current.windSpeed)} km/h
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-4 text-[10px] font-medium text-slate-400 flex justify-between items-center">
        <span>Updated: {getRelativeTime(weatherLastUpdated)}</span>
      </div>
    </div>
  );
}

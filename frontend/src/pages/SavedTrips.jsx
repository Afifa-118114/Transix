import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiCalendar, FiMapPin, FiClock, FiArrowRight, FiUsers, FiDollarSign } from "react-icons/fi";
import DashboardLayout from "../layouts/DashboardLayout";
import { getUserTrips, getTripDetails } from "../api/tripApi";
import { useTripBuilder } from "../context/TripBuilderContext";
import { formatDate } from "../utils/formatTrip";

export default function SavedTrips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { setTrip } = useTripBuilder();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }
        
        const res = await getUserTrips(token);
        if (res.success) {
          // Sort by newest first
          const sortedTrips = res.trips.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setTrips(sortedTrips);
        }
      } catch (err) {
        console.error("Failed to fetch saved trips:", err);
        setError("Failed to load your trips. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrips();
  }, [navigate]);

  const handleOpenTrip = async (tripId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await getTripDetails(tripId, token);
      if (res.success && res.trip) {
        setTrip(res.trip); // This will update the context and normalize the trip
        navigate("/planner"); // Redirect to planner/dashboard
      }
    } catch (err) {
      console.error("Failed to open trip details:", err);
      alert("Failed to open the trip. Please try again.");
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Draft': return 'bg-slate-800 text-slate-300 border-slate-700';
      case 'Generated': return 'bg-indigo-900/50 text-indigo-300 border-indigo-500/30';
      case 'Booked': return 'bg-blue-900/50 text-blue-300 border-blue-500/30';
      case 'Finalized': return 'bg-emerald-900/50 text-emerald-300 border-emerald-500/30';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full max-w-7xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Saved Trips</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Access and manage all your generated itineraries and active plans.</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-2xl border border-red-200 dark:border-red-800/30 text-center font-medium">
            {error}
          </div>
        ) : trips.length === 0 ? (
          <div className="bg-white dark:bg-[#131b2e] rounded-3xl border border-slate-200 dark:border-slate-800/80 p-12 text-center shadow-xs">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiMapPin className="text-3xl text-indigo-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Saved Trips Yet</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">
              You haven't generated any itineraries yet. Start planning your next adventure to see it here!
            </p>
            <Link 
              to="/home" 
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md shadow-indigo-500/20"
            >
              Start Planning <FiArrowRight />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <div 
                key={trip._id}
                onClick={() => handleOpenTrip(trip._id)}
                className="group cursor-pointer bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800/80 overflow-hidden shadow-xs hover:shadow-xl hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all duration-300 flex flex-col"
              >
                {/* Image Header */}
                <div className="h-40 relative bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  {trip.heroImage ? (
                    <img 
                      src={trip.heroImage} 
                      alt={trip.destination} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <FiMapPin size={32} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  
                  {/* Tags */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded border backdrop-blur-md ${getStatusBadge(trip.status)}`}>
                      {trip.status}
                    </span>
                    {trip.operatorAccess?.enabled && (
                      <span className="px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded border border-emerald-500/50 bg-emerald-900/50 text-emerald-300 backdrop-blur-md">
                        Shared
                      </span>
                    )}
                  </div>
                  
                  {/* Title & Dest overlay */}
                  <div className="absolute bottom-3 left-4 right-4">
                    <h3 className="text-xl font-black text-white leading-tight mb-1 truncate">
                      {trip.destination}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                      <span>{trip.source}</span>
                      <FiArrowRight size={10} />
                      <span>{trip.destination}</span>
                    </div>
                  </div>
                </div>

                {/* Body details */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
                      <FiCalendar className="text-indigo-500" />
                      <span className="truncate">{formatDate(trip.startDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
                      <FiClock className="text-indigo-500" />
                      <span>{trip.duration || `${trip.itinerary?.length || 0} Days`}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
                      <FiUsers className="text-indigo-500" />
                      <span>{trip.travelers} Travelers</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
                      <FiDollarSign className="text-indigo-500" />
                      <span>{trip.currency || 'INR'} {trip.budget?.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Created {new Date(trip.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Open Trip <FiArrowRight />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

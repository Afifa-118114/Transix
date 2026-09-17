import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiUsers, FiPlus, FiLogOut, FiArrowRight, FiShield } from "react-icons/fi";
import DashboardLayout from "../layouts/DashboardLayout";

export default function CampusLanding() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState(null);
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    
    setIsJoining(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/campus-trips/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ joinCode: joinCode.trim() })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        navigate(`/campus/${data.tripId}/participant`);
      } else {
        setError(data.message || "Failed to join IV");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <DashboardLayout trip={null} setTrip={() => {}}>
      <div className="flex flex-col gap-8 pb-12 max-w-4xl mx-auto mt-4">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Campus Trip</h1>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400 max-w-xl">
            Join an existing Industrial Visit using your unique IV Code, or organize a new one for your college.
          </p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Organize Card */}
          <div className="group relative flex flex-col justify-between p-8 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] overflow-hidden hover:border-indigo-500 hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
            
            <div>
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6">
                <FiPlus className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Organize an IV</h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                Create and manage a college/group trip. Build the itinerary, configure registrations, and manage students. You will automatically become the Coordinator.
              </p>
            </div>
            
            <button 
              onClick={() => navigate("/campus/create")}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:scale-[1.02] transition-transform"
            >
              Start Planning <FiArrowRight />
            </button>
          </div>

          {/* Join Card */}
          <div className="group relative flex flex-col justify-between p-8 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] overflow-hidden hover:border-emerald-500 hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
            
            <div>
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6">
                <FiLogOut className="w-6 h-6 rotate-180" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Join an IV</h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                Join an existing IV using the unique IV Code provided by your coordinator.
              </p>
              
              <form onSubmit={handleJoin} className="relative mb-4">
                <input 
                  type="text" 
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. MHSSCE-MANALI-A1B2" 
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  required
                />
                <button 
                  type="submit"
                  disabled={isJoining}
                  className="absolute right-2 top-2 bottom-2 px-4 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {isJoining ? "Joining..." : "Join"}
                </button>
              </form>
              
              {error && (
                <div className="text-xs font-semibold text-red-500 mt-2 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg border border-red-100 dark:border-red-900/50">
                  {error}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-6 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              <FiShield /> <span>Verified College Network</span>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}

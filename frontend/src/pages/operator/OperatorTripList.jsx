import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getOperatorTrips } from "../../api/operatorApi";
import { formatDate } from "../../utils/formatTrip";
import { FiArrowRight, FiUsers, FiAlertCircle } from "react-icons/fi";

export default function OperatorTripList() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const token = localStorage.getItem("token");
        const data = await getOperatorTrips(token);
        if (data.success) {
          setTrips(data.trips);
        }
      } catch (err) {
        console.error("Failed to load trips", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Trips...</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">Active Trips</h1>
            <p className="text-slate-500 font-medium mt-1">Operational view of all journeys</p>
          </div>
          <Link to="/operator/dashboard" className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider text-slate-500 font-bold">
                  <th className="p-4">Traveler</th>
                  <th className="p-4">Route & Dates</th>
                  <th className="p-4">Details</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Booking Progress</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {trips.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-500">No trips found.</td>
                  </tr>
                ) : (
                  trips.map((trip) => (
                    <tr key={trip._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-white">{trip.user?.name || 'Unknown'}</div>
                        <div className="text-xs text-slate-500">{trip.user?.email}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 font-bold">
                          {trip.source} <FiArrowRight className="text-slate-400" /> {trip.destination}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-sm font-semibold">
                          <FiUsers className="text-slate-400" /> {trip.travelers}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {trip.staySegments?.length || 0} Stay Segments
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-xs font-bold rounded">
                          {trip.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-bold">
                          {trip.bookingProgress?.confirmed || 0} / {trip.bookingProgress?.total || 0} confirmed
                        </div>
                        {trip.bookingProgress?.actionRequired > 0 && (
                          <div className="flex items-center gap-1 mt-1 text-xs font-bold text-amber-600 dark:text-amber-500">
                            <FiAlertCircle /> {trip.bookingProgress.actionRequired} action required
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <Link 
                          to={`/operator/trips/${trip._id}`}
                          className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-bold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

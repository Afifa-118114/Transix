import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getOperatorTripDetails, updateBookingStatus } from "../../api/operatorApi";
import { formatDate } from "../../utils/formatTrip";
import { FiArrowLeft, FiMapPin, FiCalendar, FiExternalLink, FiClock } from "react-icons/fi";

export default function OperatorTripDetails() {
  const { tripId } = useParams();
  const [trip, setTrip] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const token = localStorage.getItem("token");
        const data = await getOperatorTripDetails(tripId, token);
        if (data.success) {
          setTrip(data.trip);
          setBookings(data.bookings);
        }
      } catch (err) {
        console.error("Failed to load trip details", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrip();
  }, [tripId]);

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      const res = await updateBookingStatus(bookingId, { status: newStatus }, token);
      if (res.success) {
        setBookings(bookings.map(b => b._id === bookingId ? res.booking : b));
      }
    } catch (err) {
      alert("Failed to update status: " + (err.response?.data?.message || err.message));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'ACTION_REQUIRED': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'PROCESSING': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Loading Trip Details...</div>;
  if (!trip) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Trip not found</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        <div className="mb-6">
          <Link to="/operator/trips" className="flex items-center gap-2 text-sm font-bold text-indigo-400 hover:text-indigo-300">
            <FiArrowLeft /> Back to Trips
          </Link>
        </div>

        {/* Header */}
        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 mb-8 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-1 bg-indigo-900/50 text-indigo-300 text-xs font-bold rounded uppercase tracking-wider border border-indigo-500/30">
                {trip.status}
              </span>
              <span className="px-2 py-1 bg-emerald-900/50 text-emerald-300 text-xs font-bold rounded uppercase tracking-wider border border-emerald-500/30 flex items-center gap-1">
                <FiCheckCircle size={10}/> Shared with Operator
              </span>
              <span className="text-xs font-bold text-slate-500">ID: {trip._id}</span>
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight">
              {trip.source} → {trip.destination}
            </h1>
            <div className="text-slate-500 mt-2 text-sm font-semibold flex gap-4">
              <span className="flex items-center gap-1.5"><FiCalendar /> {formatDate(trip.startDate)} - {formatDate(trip.endDate)}</span>
              <span>{trip.travelers} Travelers</span>
              <span>Budget: {trip.currency} {trip.budget}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold">{trip.user?.name}</div>
            <div className="text-sm text-slate-500">{trip.user?.email}</div>
          </div>
        </div>

        {/* Booking Requirements Section */}
        <h2 className="text-lg font-black mb-4 uppercase tracking-wider text-white">Booking Requirements</h2>
        
        <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden mb-8">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400 font-black">
                <th className="p-4">Requirement</th>
                <th className="p-4">Type / Vendor</th>
                <th className="p-4">External Link</th>
                <th className="p-4">Status</th>
                <th className="p-4">Update Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500">No booking requirements mapped yet.</td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking._id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4">
                      <div className="font-bold text-white">{booking.title}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                        <FiMapPin /> {booking.location}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-[10px] font-black uppercase tracking-wider mb-1 text-slate-500">{booking.type}</div>
                      <div className="text-sm text-slate-300">{booking.vendorName || 'No Vendor'}</div>
                    </td>
                    <td className="p-4">
                      {booking.externalUrl ? (
                        <a href={booking.externalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300">
                          Open Link <FiExternalLink />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Not available</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-[10px] uppercase font-black tracking-wider rounded border ${getStatusColor(booking.status)}`}>
                        {booking.status.replace("_", " ")}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
                        <FiClock /> Updated: {new Date(booking.updatedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <select 
                        className="text-xs border border-slate-700 rounded px-2 py-1.5 bg-slate-800 font-semibold text-slate-200 outline-none focus:border-indigo-500"
                        value={booking.status}
                        onChange={(e) => handleStatusChange(booking._id, e.target.value)}
                      >
                        <option value="NOT_BOOKED">Not Booked</option>
                        <option value="PROCESSING">Processing</option>
                        <option value="ACTION_REQUIRED">Action Required</option>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Travel Legs Section (Read Only) */}
        <h2 className="text-lg font-black mb-4 uppercase tracking-wider text-white">Travel Legs</h2>
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          {trip.travelLegs && trip.travelLegs.length > 0 ? (
            trip.travelLegs.map((leg, i) => (
              <div key={i} className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm flex justify-between items-center">
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    {leg.from} <FiArrowRight className="text-slate-500"/> {leg.to}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-semibold">
                    {leg.date} | {leg.startTime} - {leg.endTime}
                  </div>
                </div>
                <div className="px-2 py-1 bg-slate-800 text-slate-300 text-[10px] font-black rounded uppercase tracking-wider border border-slate-700">
                  {leg.mode}
                </div>
              </div>
            ))
          ) : (
            <div className="text-slate-500 text-sm">No travel legs defined.</div>
          )}
        </div>

      </div>
    </div>
  );
}

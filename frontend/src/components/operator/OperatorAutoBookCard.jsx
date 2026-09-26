import { useState } from "react";
import { FiCheckCircle, FiShield, FiDownload, FiExternalLink, FiClock } from "react-icons/fi";
import { FaPlane, FaTrain, FaHotel } from "react-icons/fa6";
import toast from "react-hot-toast";
import { operatorAutoBookTour } from "../../api/bookingApi";

export default function OperatorAutoBookCard({ trip, bookings = [], onBookingSuccess }) {
  const [loading, setLoading] = useState(false);
  const isBooked = trip?.isBooked || trip?.status === "BOOKED";

  const handleExecuteAutoBook = async () => {
    if (!window.confirm("Execute automated booking for this tour? This will confirm all LiteAPI stay segments and issue live Travelport/Railway PNRs.")) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await operatorAutoBookTour({ tripId: trip._id }, token);

      if (res.success) {
        toast.success(res.message || "All tour components booked & confirmed automatically!");
        if (onBookingSuccess) {
          onBookingSuccess(res.data);
        }
      } else {
        toast.error(res.message || "Failed to automate bookings");
      }
    } catch (err) {
      console.error("Operator auto-book error:", err);
      toast.error(err.response?.data?.message || err.message || "Automated booking failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/50 via-white to-violet-50/40 dark:from-[#131b2e] dark:via-[#0f172a] dark:to-[#1a1c36] p-5 shadow-xs transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-black text-xs shadow-xs">
              ⚡
            </span>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Automated Booking Engine
            </h3>
            {isBooked ? (
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                ✓ Confirmed on System
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                Pending Execution
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {isBooked
              ? "All traveler accommodations and travel legs are confirmed. Vouchers and live PNRs issued."
              : "Instantly lock LiteAPI hotel rates and generate Travelport / Indian Railway tickets in 1 click."}
          </p>
        </div>

        <div>
          {isBooked ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                Ref: {trip.bookingSummary?.confirmedBookings?.transport?.pnr || `TRX-${trip._id?.toString().slice(-6).toUpperCase()}`}
              </span>
            </div>
          ) : (
            <button
              onClick={handleExecuteAutoBook}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 px-4 py-2 text-xs font-bold text-white shadow-sm transition active:scale-98 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Auto-Booking via LiteAPI & Rail...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>One-Click Auto-Book All</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Confirmed booking details pills */}
      {isBooked && trip?.bookingSummary?.confirmedBookings && (
        <div className="mt-4 pt-3.5 border-t border-slate-200/60 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {trip.bookingSummary.confirmedBookings.hotels?.map((h, i) => (
            <div key={i} className="flex items-center justify-between bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs">
              <div className="flex items-center gap-2 truncate">
                <FaHotel className="text-indigo-600 shrink-0" />
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{h.hotelName}</span>
              </div>
              <a
                href={h.voucherUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline shrink-0 ml-2"
              >
                <FiDownload /> PDF
              </a>
            </div>
          ))}

          {trip.bookingSummary.confirmedBookings.transport && (
            <div className="flex items-center justify-between bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs">
              <div className="flex items-center gap-2 truncate">
                {trip.bookingSummary.confirmedBookings.transport.mode === 'FLIGHT' ? (
                  <FaPlane className="text-blue-500 shrink-0" />
                ) : (
                  <FaTrain className="text-emerald-500 shrink-0" />
                )}
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                  {trip.bookingSummary.confirmedBookings.transport.airline || trip.bookingSummary.confirmedBookings.transport.trainName}
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">
                PNR: {trip.bookingSummary.confirmedBookings.transport.pnr}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

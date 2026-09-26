import { useState, useEffect, useCallback } from "react";
import {
  FiX,
  FiCheckCircle,
  FiShield,
  FiArrowRight,
  FiAlertTriangle,
  FiExternalLink,
  FiClock,
  FiUser,
  FiMail,
  FiPhone,
} from "react-icons/fi";
import { FaHotel } from "react-icons/fa6";
import toast from "react-hot-toast";
import { prebookHotel, confirmHotel } from "../../api/bookingApi";

// ─── Razorpay Script Loader ───────────────────────────────────────────────────
const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

// ─── Countdown Timer Hook ─────────────────────────────────────────────────────
function useCountdown(seconds) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(id);
  }, [remaining]);
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  return { remaining, formatted: `${mm}:${ss}` };
}

// ─── Stage Indicator ──────────────────────────────────────────────────────────
function StageIndicator({ stage }) {
  const stages = ["Review", "Guest", "Payment", "Confirmed"];
  return (
    <div className="flex items-center gap-1 mb-6">
      {stages.map((label, i) => {
        const idx = i + 1;
        const done = stage > idx;
        const active = stage === idx;
        return (
          <div key={label} className="flex items-center gap-1 flex-1 last:flex-none">
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black transition-all
                ${done ? "bg-emerald-500 text-white" : active ? "bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900/40" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}
            >
              {done ? "✓" : idx}
            </div>
            <span className={`hidden sm:block text-[10px] font-bold tracking-wide transition-colors ${active ? "text-indigo-600 dark:text-indigo-400" : done ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
              {label}
            </span>
            {i < stages.length - 1 && (
              <div className={`flex-1 h-px mx-1 ${done ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-700"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function HotelBookingModal({
  isOpen,
  onClose,
  hotel,           // full hotel object with hotel.nuitee.offerId
  stayContext,     // { tripId, staySegmentId, checkIn, checkOut, location, nights, travelers }
  token,
  user,
  onBookingSuccess,
}) {
  const [stage, setStage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Prebook result
  const [prebookData, setPrebookData] = useState(null); // { prebookId, razorpayOrderId, razorpayKeyId, amountInPaise, hotelDetails }

  // Confirmed result
  const [confirmedData, setConfirmedData] = useState(null); // { bookingId, hotelConfirmationCode, voucherUrl, ... }

  // Error
  const [error, setError] = useState(null);

  // Guest form — pre-fill from auth user
  const [guest, setGuest] = useState({
    firstName: user?.name?.split(" ")[0] || "",
    lastName: user?.name?.split(" ").slice(1).join(" ") || "",
    email: user?.email || "",
    phone: "",
  });

  const countdown = useCountdown(prebookData ? 14 * 60 : 0); // 14-min hold

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStage(1);
      setPrebookData(null);
      setConfirmedData(null);
      setError(null);
    }
  }, [isOpen]);

  const offerId = hotel?.nuitee?.offerId;
  const totalPrice = hotel?.nuitee?.totalPrice;
  const currency = hotel?.nuitee?.currency || "INR";
  const roomType = hotel?.nuitee?.roomType || "Standard Room";
  const mealPlan = hotel?.nuitee?.mealPlan || "Room Only";
  const cancelPolicy = hotel?.nuitee?.cancellationPolicy;

  // ── Stage 1 → 2: Proceed to guest form ──────────────────────────────────────
  const handleProceedToGuest = () => {
    setError(null);
    setStage(2);
  };

  // ── Stage 2 → 3: Prebook + open Razorpay ────────────────────────────────────
  const handleInitiatePayment = useCallback(async () => {
    // Validate guest
    if (!guest.firstName.trim() || !guest.lastName.trim() || !guest.email.trim()) {
      toast.error("Please fill in all required guest details.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Failed to load Razorpay. Check your internet connection.");
      }

      // 2. Prebook with backend → get razorpayOrderId + prebookId
      const prebookRes = await prebookHotel(
        {
          tripId: stayContext?.tripId,
          staySegmentId: stayContext?.staySegmentId,
          offerId,
          hotelName: hotel?.name,
          roomType,
          totalAmount: totalPrice,
          currency,
          guest: {
            firstName: guest.firstName,
            lastName: guest.lastName,
            email: guest.email,
            phone: guest.phone || undefined,
          },
        },
        token
      );

      if (!prebookRes?.success) {
        throw new Error(prebookRes?.message || "Prebook failed — room may no longer be available.");
      }

      const pd = prebookRes.data;
      setPrebookData(pd);
      setStage(3);

      // 3. Open Razorpay checkout
      const options = {
        key: pd.razorpayKeyId,
        amount: pd.amountInPaise,
        currency: pd.currency || "INR",
        name: "Transix Hotels",
        description: `${hotel?.name} — ${roomType}`,
        order_id: pd.razorpayOrderId,
        prefill: {
          name: `${guest.firstName} ${guest.lastName}`,
          email: guest.email,
          contact: guest.phone || undefined,
        },
        theme: { color: "#4F46E5" },
        modal: {
          ondismiss: () => {
            toast("Payment cancelled. Your room hold is still active.", { icon: "⏳" });
            setLoading(false);
          },
        },
        handler: async (response) => {
          // 4. Verify + confirm booking with backend
          try {
            setLoading(true);
            const confirmRes = await confirmHotel(
              {
                prebookId: pd.prebookId,
                tripId: stayContext?.tripId,
                staySegmentId: stayContext?.staySegmentId,
                guest: {
                  firstName: guest.firstName,
                  lastName: guest.lastName,
                  email: guest.email,
                  phone: guest.phone || undefined,
                },
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              },
              token
            );

            if (!confirmRes?.success) {
              throw new Error(confirmRes?.message || "Booking confirmation failed.");
            }

            setConfirmedData(confirmRes.data);
            setStage(4);
            toast.success("Hotel booked successfully! 🎉");
            onBookingSuccess?.(confirmRes.data);
          } catch (err) {
            setError(err.message);
            setStage(3); // Stay on payment stage, show error
            toast.error(err.message);
          } finally {
            setLoading(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp) => {
        const msg = resp.error?.description || "Payment failed. Please try again.";
        setError(msg);
        toast.error(msg);
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      setStage(2); // Back to guest form on prebook failure
    } finally {
      setLoading(false);
    }
  }, [guest, offerId, totalPrice, currency, roomType, hotel, stayContext, token, onBookingSuccess]);

  if (!isOpen || !hotel) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={stage !== 3 ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-[#131b2e] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40">
              <FaHotel className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">Book Your Stay</h2>
              <p className="text-[11px] font-medium text-slate-500 line-clamp-1">{hotel.name}</p>
            </div>
          </div>
          {stage !== 3 && (
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <FiX />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <StageIndicator stage={stage} />

          {/* ── Stage 1: Room Review ─────────────────────────────────────── */}
          {stage === 1 && (
            <div className="space-y-4">
              {/* Hotel card */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">{hotel.name}</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">{hotel.address || hotel.vicinity || stayContext?.location}</p>
                  </div>
                  {hotel.rating > 0 && (
                    <span className="shrink-0 flex items-center gap-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 px-2 py-1 text-xs font-black text-amber-700 dark:text-amber-400">
                      ⭐ {hotel.rating}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-xl bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-2.5">
                    <p className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] mb-1">Room Type</p>
                    <p className="font-bold text-slate-800 dark:text-white">{roomType}</p>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-2.5">
                    <p className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] mb-1">Meal Plan</p>
                    <p className="font-bold text-slate-800 dark:text-white">{mealPlan}</p>
                  </div>
                  {stayContext?.checkIn && (
                    <div className="rounded-xl bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-2.5">
                      <p className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] mb-1">Check-in</p>
                      <p className="font-bold text-slate-800 dark:text-white">{new Date(stayContext.checkIn).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                    </div>
                  )}
                  {stayContext?.checkOut && (
                    <div className="rounded-xl bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-2.5">
                      <p className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] mb-1">Check-out</p>
                      <p className="font-bold text-slate-800 dark:text-white">{new Date(stayContext.checkOut).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Price breakdown */}
              <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400 mb-3">Price Breakdown</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>{roomType} × {stayContext?.nights || 1} night{(stayContext?.nights || 1) > 1 ? "s" : ""}</span>
                    <span>₹{hotel?.nuitee?.nightlyPrice ? (hotel.nuitee.nightlyPrice * (stayContext?.nights || 1)).toLocaleString() : totalPrice?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 mt-2 border-t border-indigo-200 dark:border-indigo-800">
                    <span className="text-sm font-black text-slate-900 dark:text-white">Total</span>
                    <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">₹{totalPrice?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Cancellation policy */}
              {cancelPolicy && (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
                  <FiShield className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">Cancellation Policy</p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-500 mt-0.5">
                      {cancelPolicy.cancelTime
                        ? `Free cancellation until ${new Date(cancelPolicy.cancelTime).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                        : "Cancellation policy applies — see hotel for details"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Stage 2: Guest Details ───────────────────────────────────── */}
          {stage === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white mb-1">Guest Details</h3>
                <p className="text-[11px] text-slate-500">These details will appear on your hotel voucher.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[12px]" />
                    <input
                      id="hotel-guest-firstname"
                      type="text"
                      value={guest.firstName}
                      onChange={(e) => setGuest((g) => ({ ...g, firstName: e.target.value }))}
                      placeholder="Arjun"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-8 pr-3 py-2.5 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[12px]" />
                    <input
                      id="hotel-guest-lastname"
                      type="text"
                      value={guest.lastName}
                      onChange={(e) => setGuest((g) => ({ ...g, lastName: e.target.value }))}
                      placeholder="Sharma"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-8 pr-3 py-2.5 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[12px]" />
                  <input
                    id="hotel-guest-email"
                    type="email"
                    value={guest.email}
                    onChange={(e) => setGuest((g) => ({ ...g, email: e.target.value }))}
                    placeholder="arjun@example.com"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-8 pr-3 py-2.5 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-400">Booking confirmation will be sent to this email.</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  Phone (optional)
                </label>
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[12px]" />
                  <input
                    id="hotel-guest-phone"
                    type="tel"
                    value={guest.phone}
                    onChange={(e) => setGuest((g) => ({ ...g, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-8 pr-3 py-2.5 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-3">
                  <FiAlertTriangle className="shrink-0 mt-0.5 text-red-500" />
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Stage 3: Processing / Awaiting Payment ───────────────────── */}
          {stage === 3 && (
            <div className="flex flex-col items-center text-center gap-5 py-4">
              {loading ? (
                <>
                  <div className="relative h-16 w-16">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-900/40" />
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Connecting to Payment Gateway</h3>
                    <p className="text-xs text-slate-500 mt-1">Locking your room with LiteAPI…</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
                    <FiClock className="text-2xl text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">Room Hold Active</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{countdown.formatted}</p>
                    <p className="text-xs text-slate-500 mt-1">Complete your payment before the hold expires</p>
                  </div>
                  {prebookData && (
                    <div className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 text-left space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-500">Hotel</span>
                        <span className="text-slate-900 dark:text-white">{prebookData.hotelDetails?.hotelName || hotel.name}</span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-500">Room</span>
                        <span className="text-slate-900 dark:text-white">{prebookData.hotelDetails?.roomType || roomType}</span>
                      </div>
                      <div className="flex justify-between text-xs font-black">
                        <span className="text-slate-500">Amount</span>
                        <span className="text-indigo-600 dark:text-indigo-400">₹{(prebookData.amountInPaise / 100).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                  {error && (
                    <div className="w-full flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-3 text-left">
                      <FiAlertTriangle className="shrink-0 mt-0.5 text-red-500" />
                      <p className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Stage 4: Confirmed ───────────────────────────────────────── */}
          {stage === 4 && confirmedData && (
            <div className="flex flex-col items-center text-center gap-5 py-2">
              {/* Success animation */}
              <div className="relative">
                <div className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center animate-[scale-in_0.3s_ease-out]">
                  <FiCheckCircle className="text-4xl text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center">
                  <span className="text-white text-[9px] font-black">✓</span>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">Booking Confirmed!</p>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">{hotel.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{roomType} · {mealPlan}</p>
              </div>

              {/* Confirmation details */}
              <div className="w-full rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 text-left space-y-2.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-500">Booking ID</span>
                  <span className="font-black text-slate-900 dark:text-white font-mono">{confirmedData.bookingId}</span>
                </div>
                {confirmedData.hotelConfirmationCode && (
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-500">Hotel Confirmation</span>
                    <span className="font-black text-emerald-700 dark:text-emerald-400 font-mono">{confirmedData.hotelConfirmationCode}</span>
                  </div>
                )}
                {confirmedData.checkIn && (
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-500">Check-in</span>
                    <span className="font-bold text-slate-900 dark:text-white">{new Date(confirmedData.checkIn).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</span>
                  </div>
                )}
                {confirmedData.checkOut && (
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-500">Check-out</span>
                    <span className="font-bold text-slate-900 dark:text-white">{new Date(confirmedData.checkOut).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs pt-2 mt-2 border-t border-emerald-200 dark:border-emerald-800">
                  <span className="font-semibold text-slate-500">Total Paid</span>
                  <span className="font-black text-slate-900 dark:text-white">₹{confirmedData.totalAmount?.toLocaleString() || (prebookData?.amountInPaise / 100).toLocaleString()}</span>
                </div>
              </div>

              {/* Voucher download */}
              {confirmedData.voucherUrl && (
                <a
                  href={confirmedData.voucherUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 px-4 py-2.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition"
                >
                  <FiExternalLink />
                  Download Hotel Voucher
                </a>
              )}

              <p className="text-[10px] text-slate-400">Confirmation sent to <strong className="text-slate-600 dark:text-slate-300">{guest.email}</strong></p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 pb-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          {stage === 1 && (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                id="hotel-reserve-proceed"
                onClick={handleProceedToGuest}
                disabled={!offerId}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-black text-white shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 hover:bg-indigo-700 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reserve This Room
                <FiArrowRight />
              </button>
            </div>
          )}

          {stage === 2 && (
            <div className="flex gap-3">
              <button
                onClick={() => setStage(1)}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                ← Back
              </button>
              <button
                id="hotel-pay-button"
                onClick={handleInitiatePayment}
                disabled={loading}
                className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-black text-white shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 hover:bg-indigo-700 active:scale-[0.98] transition disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    Pay ₹{totalPrice?.toLocaleString()}
                    <FiShield className="text-white/80" />
                  </>
                )}
              </button>
            </div>
          )}

          {stage === 3 && !loading && error && (
            <div className="flex gap-3">
              <button
                onClick={() => setStage(2)}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                ← Try Again
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-red-200 dark:border-red-900/50 py-3 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
              >
                Close
              </button>
            </div>
          )}

          {stage === 4 && (
            <button
              onClick={onClose}
              id="hotel-booking-done"
              className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-black text-white shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30 hover:bg-emerald-700 active:scale-[0.98] transition"
            >
              Done ✓
            </button>
          )}

          {/* Security badge */}
          {(stage === 1 || stage === 2) && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-400">
              <FiShield className="text-emerald-500" />
              Secured by Razorpay · Powered by LiteAPI
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

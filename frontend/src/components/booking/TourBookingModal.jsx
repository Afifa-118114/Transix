import { useState } from "react";
import { FiX, FiCheckCircle, FiShield, FiSend, FiDownload, FiArrowRight, FiInfo } from "react-icons/fi";
import { FaPlane, FaTrain, FaHotel } from "react-icons/fa6";
import toast from "react-hot-toast";
import { prebookTour, confirmTourBooking } from "../../api/bookingApi";

export default function TourBookingModal({ isOpen, onClose, trip, token, user, onBookingSuccess }) {
  if (!isOpen || !trip) return null;

  const [step, setStep] = useState(1); // 1: Review & Transport, 2: Passengers, 3: Processing, 4: Confirmed
  const [transportMode, setTransportMode] = useState(trip.travelPreferences?.mode === 'FLIGHT' ? 'FLIGHT' : 'TRAIN');
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [confirmedData, setConfirmedData] = useState(null);

  // Passenger form
  const [passenger, setPassenger] = useState({
    firstName: user?.name?.split(" ")[0] || "Traveler",
    lastName: user?.name?.split(" ")[1] || "Sharma",
    age: "26",
    gender: "M",
    email: user?.email || "traveler@transix.in",
    phone: "9876543210"
  });

  // Calculate pricing estimates
  const staySegments = trip.staySegments || [];
  const hotelTotal = staySegments.reduce((sum, s) => {
    const rate = s.selectedHotel?.nightlyPrice || s.selectedHotel?.price || 2800;
    return sum + rate * (s.nights || 2);
  }, 0) || 4500;

  const flightPrice = 4250;
  const trainPrice = 1850;
  const transportPrice = transportMode === 'FLIGHT' ? flightPrice : trainPrice;
  const grandTotal = hotelTotal + transportPrice;

  // Load Razorpay script dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Step 1 -> 2
  const handleProceedToPassengers = () => {
    setStep(2);
  };

  // Step 2 -> Launch Payment
  const handleInitiatePayment = async () => {
    setLoading(true);
    try {
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        toast.error("Failed to load Razorpay payment gateway. Please check your internet.");
        setLoading(false);
        return;
      }

      // 1. Call Backend Prebook
      const res = await prebookTour(
        {
          tripId: trip._id,
          passengers: [passenger],
          transportPreference: {
            type: transportMode,
            price: transportPrice,
            airline: transportMode === 'FLIGHT' ? 'Air India' : undefined,
            flightNumber: transportMode === 'FLIGHT' ? 'AI-502' : undefined,
            trainName: transportMode === 'TRAIN' ? 'Mumbai Rajdhani Express' : undefined,
            trainNumber: transportMode === 'TRAIN' ? '12952' : undefined,
            travelClass: '3A'
          }
        },
        token
      );

      if (!res.success) {
        throw new Error(res.message || "Failed to initialize booking");
      }

      setOrderData(res.data);

      // 2. Launch Razorpay Modal
      const options = {
        key: res.data.razorpayKeyId,
        amount: res.data.amountInPaise,
        currency: res.data.currency || "INR",
        name: "Transix Tour Operations",
        description: `All-Inclusive Tour Booking: ${trip.destination}`,
        order_id: res.data.razorpayOrderId,
        prefill: {
          name: `${passenger.firstName} ${passenger.lastName}`,
          email: passenger.email,
          contact: passenger.phone
        },
        theme: {
          color: "#4f46e5"
        },
        handler: async function (response) {
          // 3. Payment Success -> Confirm Bookings
          setStep(3); // Processing animation
          try {
            const confirmRes = await confirmTourBooking(
              {
                tripId: trip._id,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                passengers: [passenger],
                transportPreference: {
                  type: transportMode,
                  price: transportPrice
                }
              },
              token
            );

            if (confirmRes.success) {
              setConfirmedData(confirmRes.data);
              setStep(4); // Confirmed screen
              toast.success("All tour components booked & confirmed!");
              if (onBookingSuccess) onBookingSuccess(confirmRes.data);
            } else {
              toast.error(confirmRes.message || "Booking execution failed");
              setStep(2);
            }
          } catch (err) {
            console.error("Booking confirmation error:", err);
            const msg = err.response?.data?.message || err.message || "Failed to confirm booking";
            toast.error("Payment received, but error finalizing confirmation: " + msg);
            setStep(2);
          }
        },
        modal: {
          ondismiss: function () {
            toast("Payment cancelled");
            setLoading(false);
          }
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err) {
      console.error("Prebook Error:", err);
      toast.error(err.response?.data?.message || err.message || "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-2xl transition-all">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs font-bold text-sm">
              ⚡
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Automated Tour Checkout
              </h2>
              <p className="text-xs text-slate-500">
                1-Click Unified Booking for {trip.destination}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 transition"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6">
          
          {/* STEP 1: REVIEW & SELECT TRANSPORT */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 p-4">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-semibold text-xs">
                  <FiShield /> Transix Single-Click Operations Engine
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  We coordinate with <strong>LiteAPI</strong> for instant hotel rate locks and <strong>Travelport / RapidAPI Rail</strong> for verified ticket generation in a single unified payment.
                </p>
              </div>

              {/* Hotel Leg Summary */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <FaHotel className="text-indigo-600" /> Accommodation Leg
                  </span>
                  <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-200 dark:border-emerald-800">
                    Instant LiteAPI Hold
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {staySegments[0]?.selectedHotel?.name || `${trip.destination} Premium Stay`}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {staySegments[0]?.nights || 2} Nights · Deluxe Room · Free Cancellation
                    </p>
                  </div>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    ₹{hotelTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Transport Choice */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    {transportMode === 'FLIGHT' ? <FaPlane className="text-blue-500" /> : <FaTrain className="text-emerald-500" />} Transport Leg
                  </span>
                  <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5">
                    <button
                      onClick={() => setTransportMode('TRAIN')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition ${transportMode === 'TRAIN' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
                    >
                      🚆 Train (RapidAPI)
                    </button>
                    <button
                      onClick={() => setTransportMode('FLIGHT')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition ${transportMode === 'FLIGHT' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
                    >
                      ✈️ Flight (Travelport)
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {transportMode === 'FLIGHT' ? 'Air India (AI-502)' : 'Mumbai Rajdhani Express (12952)'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {trip.origin || 'Origin'} ➔ {trip.destination} · {transportMode === 'FLIGHT' ? 'Economy Class' : 'AC 3 Tier (3A)'}
                    </p>
                  </div>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    ₹{transportPrice.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Cost Summary Box */}
              <div className="rounded-2xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800 p-4 space-y-2">
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Hotel Accommodations ({staySegments[0]?.nights || 2} nights)</span>
                  <span>₹{hotelTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Transport Leg ({transportMode})</span>
                  <span>₹{transportPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Taxes & Transix Service Coordination</span>
                  <span className="text-emerald-600 font-semibold">FREE (Sandbox)</span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">Total Package Amount</span>
                  <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                    ₹{grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                onClick={handleProceedToPassengers}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition"
              >
                Proceed to Passenger Details <FiArrowRight />
              </button>
            </div>
          )}

          {/* STEP 2: PASSENGER DETAILS */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Primary Passenger & Contact Information
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500">First Name</label>
                  <input
                    type="text"
                    value={passenger.firstName}
                    onChange={(e) => setPassenger({ ...passenger, firstName: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Last Name</label>
                  <input
                    type="text"
                    value={passenger.lastName}
                    onChange={(e) => setPassenger({ ...passenger, lastName: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Email Address (for Vouchers)</label>
                  <input
                    type="email"
                    value={passenger.email}
                    onChange={(e) => setPassenger({ ...passenger, email: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Phone Number</label>
                  <input
                    type="text"
                    value={passenger.phone}
                    onChange={(e) => setPassenger({ ...passenger, phone: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Age</label>
                  <input
                    type="number"
                    value={passenger.age}
                    onChange={(e) => setPassenger({ ...passenger, age: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Gender</label>
                  <select
                    value={passenger.gender}
                    onChange={(e) => setPassenger({ ...passenger, gender: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  onClick={() => setStep(1)}
                  className="w-1/3 rounded-xl border border-slate-200 dark:border-slate-700 py-3 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Back
                </button>
                <button
                  disabled={loading}
                  onClick={handleInitiatePayment}
                  className="w-2/3 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {loading ? "Preparing Razorpay..." : `Pay ₹${grandTotal.toLocaleString()} & Confirm All`}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PROCESSING ANIMATION */}
          {step === 3 && (
            <div className="py-10 text-center space-y-4">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Finalizing Your Automated Tour Booking...
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Payment verified. Reserving hotel via LiteAPI and booking {transportMode === 'FLIGHT' ? 'Travelport Air' : 'Indian Railways'} tickets...
              </p>
            </div>
          )}

          {/* STEP 4: CONFIRMED SCREEN */}
          {step === 4 && confirmedData && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center space-y-2">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-2xl">
                  ✓
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Tour Successfully Booked!
                </h3>
                <p className="text-xs text-slate-500">
                  Master Tour Code: <span className="font-mono font-bold text-indigo-600">{confirmedData.masterTripCode}</span>
                </p>
              </div>

              {/* Ticket Cards */}
              <div className="space-y-3">
                {/* Hotel Card */}
                {confirmedData.confirmedBookings?.hotels?.map((h, i) => (
                  <div key={i} className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 bg-slate-50 dark:bg-slate-900/60">
                    <div className="flex items-center gap-3">
                      <FaHotel className="text-indigo-600" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{h.hotelName}</p>
                        <p className="text-[11px] text-slate-500">Conf ID: {h.bookingReference}</p>
                      </div>
                    </div>
                    <a
                      href={h.voucherUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition"
                    >
                      <FiDownload /> Voucher
                    </a>
                  </div>
                ))}

                {/* Transport Card */}
                {confirmedData.confirmedBookings?.transport && (
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 bg-slate-50 dark:bg-slate-900/60">
                    <div className="flex items-center gap-3">
                      {confirmedData.confirmedBookings.transport.mode === 'FLIGHT' ? <FaPlane className="text-blue-500" /> : <FaTrain className="text-emerald-500" />}
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {confirmedData.confirmedBookings.transport.airline || confirmedData.confirmedBookings.transport.trainName}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          PNR: <strong className="font-mono text-emerald-600">{confirmedData.confirmedBookings.transport.pnr}</strong> · Status: Confirmed
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                      ✓ Confirmed
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={onClose}
                className="w-full rounded-xl bg-slate-900 dark:bg-white py-3 text-xs font-bold text-white dark:text-slate-900 transition"
              >
                Back to Itinerary
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

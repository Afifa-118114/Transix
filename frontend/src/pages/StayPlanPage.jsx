import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useTripBuilder } from "../context/TripBuilderContext";
import DashboardLayout from "../layouts/DashboardLayout";
import { FiArrowLeft, FiMapPin, FiCalendar, FiMoon, FiStar, FiInfo, FiCheck } from "react-icons/fi";
import { getHotelsForStaySegment } from "../services/inventoryService";
import { calculatePriceIntelligence } from "../utils/priceIntelligence";
import { formatDate } from "../utils/formatTrip";
import { getTripBookings } from "../api/tripApi";

export default function StayPlanPage() {
  const navigate = useNavigate();
  const { trip, setTrip, budgetStats } = useTripBuilder();

  // If no trip is found, redirect to planner
  if (!trip) {
    return <Navigate to="/planner" replace />;
  }

  const staySegments = trip.staySegments || [];

  // Local state for fetching status and results
  const [segmentData, setSegmentData] = useState({});
  const [loadingMap, setLoadingMap] = useState({});
  const [errorMap, setErrorMap] = useState({});
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await getTripBookings(trip._id, token);
        if (res.success) {
          setBookings(res.bookings);
        }
      } catch (err) {
        console.error("Failed to load bookings:", err);
      }
    };
    if (trip._id) {
      fetchBookings();
    }
  }, [trip._id]);

  useEffect(() => {
    // Fetch hotels for each segment independently
    staySegments.forEach((segment) => {
      const segmentKey = segment.id || segment.location;
      
      // Skip if already fetched or loading
      if (segmentData[segmentKey] || loadingMap[segmentKey] || segment.selectedHotel) {
        return;
      }

      setLoadingMap((prev) => ({ ...prev, [segmentKey]: true }));
      setErrorMap((prev) => ({ ...prev, [segmentKey]: null }));

      const fetchSegmentHotels = async () => {
        try {
          const token = localStorage.getItem("token");
          const hotels = await getHotelsForStaySegment(segment, trip, token);
          setSegmentData((prev) => ({ ...prev, [segmentKey]: hotels }));
        } catch (err) {
          console.error(`Failed to load hotels for ${segment.location}:`, err);
          setErrorMap((prev) => ({ ...prev, [segmentKey]: true }));
        } finally {
          setLoadingMap((prev) => ({ ...prev, [segmentKey]: false }));
        }
      };

      fetchSegmentHotels();
    });
  }, [staySegments, trip, segmentData, loadingMap]);

  // Handle viewing all hotels for a segment
  const handleExploreHotels = (segment, hotels) => {
    navigate("/hotel-details", {
      state: {
        hotels: hotels,
        activeIndex: 0,
        stayContext: {
          staySegmentId: segment.id || segment.location,
          location: segment.location,
          checkIn: segment.checkIn,
          checkOut: segment.checkOut,
          nights: segment.nights,
          travelers: trip.travelers || 2
        }
      }
    });
  };

  // Handle viewing a specific hotel
  const handleViewHotel = (segment, hotels, hotelIndex) => {
    navigate("/hotel-details", {
      state: {
        hotels: hotels,
        activeIndex: hotelIndex,
        stayContext: {
          staySegmentId: segment.id || segment.location,
          location: segment.location,
          checkIn: segment.checkIn,
          checkOut: segment.checkOut,
          nights: segment.nights,
          travelers: trip.travelers || 2
        }
      }
    });
  };

  // Calculate Summary
  const accommodationSummary = useMemo(() => {
    let totalSelectedPrice = 0;
    let selectedCount = 0;
    const items = staySegments.map((segment) => {
      if (segment.selectedHotel) {
        selectedCount++;
        totalSelectedPrice += segment.selectedHotel.price || 0;
        return {
          location: segment.location,
          nights: segment.nights,
          price: segment.selectedHotel.price,
          name: segment.selectedHotel.name
        };
      }
      return {
        location: segment.location,
        nights: segment.nights,
        price: null,
        name: null
      };
    });

    return { totalSelectedPrice, selectedCount, items };
  }, [staySegments]);

  // Overall Trip total nights calculation
  const totalNights = useMemo(() => {
    return staySegments.reduce((acc, seg) => acc + (seg.nights || 0), 0);
  }, [staySegments]);

  return (
    <DashboardLayout trip={trip} setTrip={setTrip}>
      <div className="flex flex-col gap-6 pb-12 max-w-5xl mx-auto mt-4">
        
        {/* Page Header */}
        <div>
          <button
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 transition hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <FiArrowLeft className="text-xs" />
            <span>Back to Itinerary</span>
          </button>

          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Stay Plan</h1>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            Find the right stay for every stop in your journey.
          </p>
          
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
            {staySegments.length > 0 && (
              <span className="rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1">
                {staySegments.map(s => s.location).join(" → ")}
              </span>
            )}
            <span className="rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1">
              {staySegments.length} stay segment{staySegments.length !== 1 ? 's' : ''}
            </span>
            <span className="rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1">
              {totalNights} night{totalNights !== 1 ? 's' : ''}
            </span>
            <span className="rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1">
              {trip?.travelers || 2} traveler{trip?.travelers !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Timeline representation */}
        {staySegments.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] shadow-xs">
            {staySegments.map((segment, idx) => (
              <React.Fragment key={idx}>
                <div className="flex-1 flex flex-col justify-center items-center text-center p-2 rounded-xl bg-slate-50 dark:bg-[#1a233a] border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1">Stay {idx + 1}</span>
                  <span className="text-sm font-black text-slate-800 dark:text-white">{segment.location}</span>
                  <span className="text-xs font-semibold text-slate-500 mt-1">{segment.nights} night{segment.nights !== 1 ? 's' : ''}</span>
                </div>
                {idx < staySegments.length - 1 && (
                  <div className="hidden sm:flex flex-col justify-center items-center text-slate-300 dark:text-slate-700">
                    <FiArrowLeft className="rotate-180 text-xl" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Segments */}
        <div className="flex flex-col gap-8">
          {staySegments.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e]">
              <p className="text-sm font-semibold text-slate-500">No stay segments found for this trip.</p>
            </div>
          ) : (
            staySegments.map((segment, index) => {
              const segmentKey = segment.id || segment.location;
              const isLoading = loadingMap[segmentKey];
              const isError = errorMap[segmentKey];
              const hotels = segmentData[segmentKey] || [];
              const hasPricedHotels = hotels.some(h => h.nuitee?.livePriceAvailable);
              const pricedCount = hotels.filter(h => h.nuitee?.livePriceAvailable).length;
              
              const { recommendations, metadata } = calculatePriceIntelligence(hotels, trip);
              
              return (
                <section key={segmentKey} id={`segment-${index}`} className="flex flex-col gap-4">
                  {/* Segment Header */}
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b-2 border-slate-200 dark:border-slate-800 pb-4">
                    <div>
                      <div className="text-[10px] font-black text-indigo-500 tracking-widest uppercase mb-1">0{index + 1}</div>
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase">{segment.location}</h2>
                      
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <FiCalendar className="text-indigo-500" />
                          <span>Check-in: {formatDate(segment.checkIn)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FiCalendar className="text-indigo-500" />
                          <span>Check-out: {formatDate(segment.checkOut)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FiMoon className="text-indigo-500" />
                          <span>{segment.nights} night{segment.nights !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Selected Hotel for this Segment */}
                  {segment.selectedHotel ? (
                    <div className="relative overflow-hidden rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-900/10 p-5 shadow-xs">
                      {bookings.find(b => b.staySegmentId === segment.id) && (
                        <div className="absolute top-0 right-10 p-2 bg-slate-800 text-white text-xs font-bold rounded-bl-xl shadow-sm z-10">
                          Status: {bookings.find(b => b.staySegmentId === segment.id).status.replace("_", " ")}
                        </div>
                      )}
                      <div className="absolute top-0 right-0 p-3 bg-emerald-500 rounded-bl-xl shadow-sm z-10">
                        <FiCheck className="text-white font-bold" />
                      </div>
                      <div className="mb-3 text-[10px] font-black tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">
                        ✓ Your Selected Stay
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="w-full sm:w-32 h-24 rounded-lg overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-800">
                          {segment.selectedHotel.image && <img src={segment.selectedHotel.image} alt={segment.selectedHotel.name} className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">{segment.selectedHotel.name}</h3>
                            <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                              <span>{formatDate(segment.checkIn)} → {formatDate(segment.checkOut)}</span>
                              <span>•</span>
                              <span>{segment.nights} nights</span>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                            <div>
                              {segment.selectedHotel.price > 0 ? (
                                <div className="text-lg font-black text-slate-900 dark:text-white">₹{segment.selectedHotel.price.toLocaleString()} <span className="text-xs font-semibold text-slate-500">total</span></div>
                              ) : (
                                <span className="text-sm font-bold text-slate-500">Price unavailable</span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {(() => {
                                const booking = bookings.find(b => b.staySegmentId === segment.id);
                                if (booking && booking.externalUrl) {
                                  return (
                                    <a
                                      href={booking.externalUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3 py-1.5 rounded-lg border border-indigo-600 bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 transition flex items-center justify-center whitespace-nowrap"
                                    >
                                      Book Externally ↗
                                    </a>
                                  );
                                }
                                return null;
                              })()}
                              <button 
                                onClick={() => handleViewHotel(segment, [segment.selectedHotel], 0)}
                                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition whitespace-nowrap"
                              >
                                View Details
                              </button>
                              <button 
                                onClick={() => {
                                  // Clear selection to change hotel
                                  const newSegments = [...staySegments];
                                  newSegments[index].selectedHotel = null;
                                  setTrip({ ...trip, staySegments: newSegments });
                                }}
                                className="px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-900/30 text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition whitespace-nowrap"
                              >
                                Change Hotel
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Hotel Discovery & Intelligence
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] p-6 shadow-xs">
                      {isLoading ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
                          <p className="text-sm font-semibold text-slate-500">Finding stays in {segment.location}...</p>
                        </div>
                      ) : isError ? (
                        <div className="py-8 text-center bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                          <p className="text-sm font-bold text-red-600 dark:text-red-400">Couldn't load hotel rates right now.</p>
                          <button onClick={() => window.location.reload()} className="mt-3 text-xs font-bold text-red-600 underline">Try again</button>
                        </div>
                      ) : hotels.length === 0 ? (
                        <div className="py-8 text-center rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                          <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No hotel options found for {segment.location}.</p>
                        </div>
                      ) : (
                        <>
                          {/* Price Intelligence context */}
                          <div className="mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                            <div>
                              <h3 className="text-base font-black text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                                <span className="text-indigo-600 dark:text-indigo-400">✦</span> Price Intelligence
                              </h3>
                              <p className="mt-1 text-xs font-medium text-slate-500">
                                {pricedCount > 0 
                                  ? `Based on ${pricedCount} hotels with verified live prices.` 
                                  : "Hotels found, but live rates are currently unavailable."}
                              </p>
                            </div>
                            {pricedCount > 0 && (
                              <div className="px-2 py-1 rounded border border-indigo-100 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/20 text-[9px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                                {metadata?.isDemoMode ? "Demo pricing · simulated data" : "Verified live provider rate"}
                              </div>
                            )}
                          </div>

                          {/* Recommendation Cards */}
                          <div className="grid gap-4 md:grid-cols-3 mb-6">
                            {recommendations.length > 0 ? recommendations.map((rec, i) => (
                              <div key={rec.id || i} className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 transition-transform hover:border-indigo-300 dark:hover:border-indigo-600">
                                <div className="mb-3 flex items-center justify-between">
                                  <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${i === 0 ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'}`}>
                                    <span>{rec.icon}</span> {rec.category}
                                  </span>
                                </div>
                                <div className="flex gap-3 mb-3">
                                  <div className="w-12 h-12 rounded bg-slate-200 shrink-0 overflow-hidden">
                                    {rec.image && <img src={rec.image} alt={rec.name} className="w-full h-full object-cover" />}
                                  </div>
                                  <div>
                                    <h4 className="line-clamp-1 text-sm font-bold text-slate-900 dark:text-white" title={rec.name}>{rec.name}</h4>
                                    {rec.rating > 0 && (
                                      <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500 mt-0.5">
                                        <FiStar className="fill-amber-500" />
                                        {rec.rating} {rec.reviews && `· ${rec.reviews} reviews`}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="mb-3">
                                  {rec.nuitee?.livePriceAvailable ? (
                                    <>
                                      <div className="text-base font-black text-slate-900 dark:text-white">₹{rec.nuitee.totalPrice.toLocaleString()} <span className="text-[10px] font-semibold text-slate-500">total</span></div>
                                      {rec.nuitee.nightlyPrice && <div className="text-[10px] font-semibold text-slate-500">₹{rec.nuitee.nightlyPrice.toLocaleString()}/night</div>}
                                    </>
                                  ) : (
                                    <div className="text-xs font-bold text-slate-500">Live price unavailable</div>
                                  )}
                                </div>
                                
                                {rec.reasons && rec.reasons.length > 0 && (
                                  <div className="mb-3">
                                    {rec.reasons.map((r, idx) => (
                                      <p key={idx} className="flex items-start gap-1 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                                        <span className="mt-0.5 text-indigo-500">✓</span>
                                        <span className="line-clamp-1">{r}</span>
                                      </p>
                                    ))}
                                  </div>
                                )}

                                <div className="mt-auto pt-3 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                                  <button onClick={() => handleViewHotel(segment, hotels, rec.originalIndex)} className="flex-1 py-1.5 rounded border border-slate-300 dark:border-slate-600 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition">View Details</button>
                                  <button onClick={() => handleViewHotel(segment, hotels, rec.originalIndex)} className="flex-1 py-1.5 rounded bg-indigo-600 text-[10px] font-bold text-white hover:bg-indigo-700 transition">Select for Stay</button>
                                </div>
                              </div>
                            )) : (
                              // Limited comparison view
                              hotels.slice(0, 3).map((hotel, i) => (
                                <div key={hotel.id || i} className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
                                  <h4 className="line-clamp-1 text-sm font-bold text-slate-900 dark:text-white mb-1" title={hotel.name}>{hotel.name}</h4>
                                  <div className="mb-3">
                                    {hotel.nuitee?.livePriceAvailable ? (
                                      <div className="text-base font-black text-slate-900 dark:text-white">₹{hotel.nuitee.totalPrice.toLocaleString()} <span className="text-[10px] font-semibold text-slate-500">total</span></div>
                                    ) : (
                                      <div className="text-xs font-bold text-slate-500">Live price unavailable</div>
                                    )}
                                  </div>
                                  <div className="mt-auto flex gap-2">
                                    <button onClick={() => handleViewHotel(segment, hotels, i)} className="flex-1 py-1.5 rounded border border-slate-300 dark:border-slate-600 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition">View Details</button>
                                    <button onClick={() => handleViewHotel(segment, hotels, i)} className="flex-1 py-1.5 rounded bg-indigo-600 text-[10px] font-bold text-white hover:bg-indigo-700 transition">Select for Stay</button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          <div className="text-center border-t border-slate-100 dark:border-slate-800 pt-5 mt-2">
                            <button 
                              onClick={() => handleExploreHotels(segment, hotels)}
                              className="px-6 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                            >
                              Explore all {hotels.length} hotels in {segment.location}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>

        {/* Overall Accommodation Summary */}
        {staySegments.length > 0 && (
          <section className="mt-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-white dark:bg-[#131b2e] shadow-md p-6">
            <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase mb-4">
              Accommodation Summary
            </h2>
            
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1 space-y-3">
                {accommodationSummary.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{item.location}</span>
                      <span className="text-slate-500 ml-2 text-xs">{item.nights} nights</span>
                      {item.name && <div className="text-[10px] font-medium text-slate-400 mt-0.5">{item.name}</div>}
                    </div>
                    <div className="font-semibold text-slate-700 dark:text-slate-300">
                      {item.price ? `₹${item.price.toLocaleString()}` : <span className="text-xs text-slate-400 italic">Not selected</span>}
                    </div>
                  </div>
                ))}
                
                <div className="border-t border-slate-200 dark:border-slate-800 pt-3 mt-4 flex justify-between items-end">
                  <div className="text-base font-black text-slate-900 dark:text-white">Total</div>
                  <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                    {accommodationSummary.selectedCount === staySegments.length ? (
                      `₹${accommodationSummary.totalSelectedPrice.toLocaleString()}`
                    ) : (
                      <div className="text-right">
                        <div>₹{accommodationSummary.totalSelectedPrice.toLocaleString()}</div>
                        <div className="text-[10px] font-semibold text-slate-500">{accommodationSummary.selectedCount} of {staySegments.length} selected</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="w-full md:w-64 shrink-0 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Trip Budget Impact</div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Overall Budget</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">₹{budgetStats?.totalBudget?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between items-baseline mb-3">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Selected Stays</span>
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">₹{accommodationSummary.totalSelectedPrice.toLocaleString()}</span>
                </div>
                
                {(budgetStats?.totalBudget && accommodationSummary.totalSelectedPrice > budgetStats.totalBudget) ? (
                  <div className="mt-2 p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 text-[10px] font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                    <FiInfo className="shrink-0" />
                    <span>Accommodation exceeds overall trip budget.</span>
                  </div>
                ) : null}
                <div className="mt-2 text-[9px] text-slate-400 italic leading-tight">
                  Budget reflects the total trip budget for all travelers. Stay total is dynamically updated based on your selections.
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}

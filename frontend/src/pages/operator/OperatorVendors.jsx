import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { getAllVendors, getDashboardStats } from "../../api/operatorApi";
import OperatorSidebar from "../../components/operator/OperatorSidebar";
import {
  FiBriefcase,
  FiSearch,
  FiFilter,
  FiCheckCircle,
  FiX,
  FiMenu,
  FiArrowLeft,
  FiMapPin,
  FiTruck,
  FiShield,
  FiCheck,
} from "react-icons/fi";
import { FaBus, FaUsers } from "react-icons/fa";

export default function OperatorVendors() {
  const [vendors, setVendors] = useState([]);
  const [filterMeta, setFilterMeta] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filter states
  const [search, setSearch] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedComfort, setSelectedComfort] = useState("");
  const [selectedCapability, setSelectedCapability] = useState("");

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const [vendorData, statsData] = await Promise.all([
        getAllVendors(
          {
            search: search.trim() || undefined,
            state: selectedState || undefined,
            category: selectedCategory || undefined,
            comfort: selectedComfort || undefined,
            capability: selectedCapability || undefined,
          },
          token
        ),
        getDashboardStats(token),
      ]);

      if (vendorData?.success) {
        setVendors(vendorData.vendors || []);
        if (vendorData.filterMeta) {
          setFilterMeta(vendorData.filterMeta);
        }
      }
      if (statsData?.success) {
        setStats(statsData.stats);
      }
    } catch (err) {
      console.error("Failed to fetch vendors", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedState, selectedCategory, selectedComfort, selectedCapability]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleResetFilters = () => {
    setSearch("");
    setSelectedState("");
    setSelectedCategory("");
    setSelectedComfort("");
    setSelectedCapability("");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans dark">
      {/* Desktop Sidebar */}
      <aside className="w-64 flex-shrink-0 hidden lg:block h-screen sticky top-0">
        <OperatorSidebar
          personalCount={stats?.personalTrips}
          campusCount={stats?.campusTrips}
          pendingCount={stats?.pendingBookings}
        />
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/80" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative w-64 max-w-[80%] h-full z-10 flex flex-col">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white z-20"
            >
              <FiX size={20} />
            </button>
            <OperatorSidebar
              personalCount={stats?.personalTrips}
              campusCount={stats?.campusTrips}
              pendingCount={stats?.pendingBookings}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 text-slate-400 hover:text-white"
              >
                <FiMenu size={20} />
              </button>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Link
                    to="/operator/dashboard"
                    className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <FiArrowLeft size={10} /> Dashboard
                  </Link>
                  <span className="text-slate-600 text-xs">/</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Network
                  </span>
                </div>
                <h1 className="text-lg font-black text-white flex items-center gap-2">
                  <FiBriefcase className="text-indigo-400" /> Connected Fleet Vendors Directory
                </h1>
                <p className="text-xs text-slate-400">
                  Transix Onboarded Demo Vendor Network ({vendors.length} connected operators)
                </p>
              </div>
            </div>

            {/* Link to Demo Vendor Portal */}
            <div className="flex items-center gap-3">
              <Link
                to="/vendor/requests"
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <span>Demo Vendor Portal</span>
                <span className="text-[9px] bg-indigo-500/30 px-1.5 py-0.5 rounded text-white font-mono">
                  Live
                </span>
              </Link>
            </div>
          </div>

          {/* Search & Filters Bar */}
          <div className="px-6 py-3 bg-slate-950/60 border-t border-slate-800/80 flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px]">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input
                type="text"
                placeholder="Search vendor by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </form>

            {/* State Filter */}
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="">All States ({filterMeta?.states?.length || 0})</option>
              {filterMeta?.states?.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="">All Fleet Categories</option>
              {filterMeta?.categories?.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, " ")}
                </option>
              ))}
            </select>

            {/* Comfort Filter */}
            <select
              value={selectedComfort}
              onChange={(e) => setSelectedComfort(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="">All Comfort Levels</option>
              <option value="STANDARD">Standard</option>
              <option value="COMFORT">Comfort</option>
              <option value="LUXURY">Luxury</option>
            </select>

            {/* Capability Filter */}
            <select
              value={selectedCapability}
              onChange={(e) => setSelectedCapability(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="">All Capabilities</option>
              <option value="intercity">Intercity Transit</option>
              <option value="multiDay">Multi-Day Tour</option>
              <option value="groupTransport">Group Operations</option>
              <option value="driverIncluded">Driver Included</option>
            </select>

            {(search || selectedState || selectedCategory || selectedComfort || selectedCapability) && (
              <button
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1"
              >
                <FiX size={12} /> Clear
              </button>
            )}
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Loading Vendor Directory...
              </div>
            </div>
          ) : vendors.length === 0 ? (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-12 text-center">
              <FiBriefcase className="mx-auto text-slate-700 mb-3" size={36} />
              <h2 className="text-sm font-bold text-white mb-1">No vendors match current criteria</h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Try clearing filters or adjusting search parameters to browse all 100 onboarded vendors.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {vendors.map((vendor) => (
                <div
                  key={vendor._id}
                  className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-slate-700 transition"
                >
                  <div className="space-y-3">
                    {/* Top Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-extrabold text-white">{vendor.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            {vendor.status}
                          </span>
                          <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                            {vendor.source}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Coverage */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                        <FiMapPin size={11} className="text-indigo-400" />
                        <span>Service Coverage ({vendor.serviceStates?.length || 0} States)</span>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto custom-scrollbar p-1 bg-slate-950/50 rounded-xl border border-slate-800/60">
                        {vendor.serviceStates?.map((st) => (
                          <span
                            key={st}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                              selectedState && st.toLowerCase() === selectedState.toLowerCase()
                                ? "bg-indigo-600 text-white font-bold"
                                : "bg-slate-900 text-slate-400 border border-slate-800"
                            }`}
                          >
                            {st}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Fleet Options */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                        <FaBus size={10} className="text-indigo-400" />
                        <span>Fleet Inventory ({vendor.fleet?.length || 0} categories)</span>
                      </div>
                      <div className="space-y-1">
                        {vendor.fleet?.map((f, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-800/40"
                          >
                            <span className="font-bold text-slate-300 text-[11px]">
                              {f.category.replace(/_/g, " ")}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400">
                              <span>{f.capacity} seats</span>
                              <span className="text-slate-600">•</span>
                              <span className={f.ac ? "text-cyan-400 font-bold" : "text-slate-400"}>
                                {f.ac ? "AC" : "Non-AC"}
                              </span>
                              <span className="text-slate-600">•</span>
                              <span className="text-indigo-300">{f.comfort}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Capabilities Badges */}
                  <div className="pt-3 border-t border-slate-800/80 flex flex-wrap gap-1.5 text-[9px]">
                    <span className={`px-2 py-0.5 rounded font-bold border ${vendor.capabilities?.intercity ? "bg-indigo-950 text-indigo-300 border-indigo-800/60" : "bg-slate-950 text-slate-600 border-slate-900"}`}>
                      ✓ Intercity
                    </span>
                    <span className={`px-2 py-0.5 rounded font-bold border ${vendor.capabilities?.multiDay ? "bg-indigo-950 text-indigo-300 border-indigo-800/60" : "bg-slate-950 text-slate-600 border-slate-900"}`}>
                      ✓ Multi-Day
                    </span>
                    <span className={`px-2 py-0.5 rounded font-bold border ${vendor.capabilities?.groupTransport ? "bg-indigo-950 text-indigo-300 border-indigo-800/60" : "bg-slate-950 text-slate-600 border-slate-900"}`}>
                      ✓ Group Transport
                    </span>
                    <span className={`px-2 py-0.5 rounded font-bold border ${vendor.capabilities?.driverIncluded ? "bg-indigo-950 text-indigo-300 border-indigo-800/60" : "bg-slate-950 text-slate-600 border-slate-900"}`}>
                      ✓ Driver Included
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

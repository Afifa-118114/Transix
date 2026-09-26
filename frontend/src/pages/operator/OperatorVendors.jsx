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
    <div className="min-h-screen bg-[#F5F7FA] text-[#1A1A1A] flex font-sans">
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
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)}></div>
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
        <header className="bg-white border-b border-[#EBEBEB] sticky top-0 z-20">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg border border-[#EBEBEB] text-[#1A1A1A] hover:bg-[#F5F7FA]"
              >
                <FiMenu size={18} />
              </button>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Link
                    to="/operator/dashboard"
                    className="text-[10px] font-bold uppercase tracking-wider text-[#006CE4] hover:underline flex items-center gap-1"
                  >
                    <FiArrowLeft size={10} /> Dashboard
                  </Link>
                  <span className="text-[#A0AEC0] text-xs">/</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">
                    Network
                  </span>
                </div>
                <h1 className="text-lg font-bold text-[#1A1A1A] flex items-center gap-2">
                  <FiBriefcase className="text-[#006CE4]" /> Connected Fleet Vendors Directory
                </h1>
                <p className="text-xs text-[#666666]">
                  Transix Onboarded Demo Vendor Network ({vendors.length} connected operators)
                </p>
              </div>
            </div>

            {/* Link to Demo Vendor Portal */}
            <div className="flex items-center gap-3">
              <Link
                to="/vendor/requests"
                className="px-3.5 py-1.5 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#0064D2] border border-[#BFDBFE] text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
              >
                <span>Demo Vendor Portal</span>
                <span className="text-[9px] bg-[#0064D2] text-white px-1.5 py-0.5 rounded font-mono font-bold">
                  Live
                </span>
              </Link>
            </div>
          </div>

          {/* Search & Filters Bar */}
          <div className="px-6 py-3 bg-white border-t border-[#EBEBEB] flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px]">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={14} />
              <input
                type="text"
                placeholder="Search vendor by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#1A1A1A] placeholder-[#94A3B8] focus:outline-none focus:border-[#006CE4] focus:bg-white transition"
              />
            </form>

            {/* State Filter */}
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#1A1A1A] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#006CE4] transition"
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
              className="bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#1A1A1A] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#006CE4] transition"
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
              className="bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#1A1A1A] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#006CE4] transition"
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
              className="bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#1A1A1A] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#006CE4] transition"
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
                className="px-2.5 py-1.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#475569] rounded-lg text-xs font-semibold transition flex items-center gap-1"
              >
                <FiX size={12} /> Clear
              </button>
            )}
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4 custom-scrollbar max-w-7xl w-full mx-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-[#666666] gap-3">
              <div className="w-8 h-8 border-2 border-[#0064D2] border-t-transparent rounded-full animate-spin"></div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#999999]">
                Loading Vendor Directory...
              </div>
            </div>
          ) : vendors.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#EBEBEB] p-12 text-center shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
              <FiBriefcase className="mx-auto text-[#A0AEC0] mb-3" size={36} />
              <h2 className="text-sm font-bold text-[#1A1A1A] mb-1">No vendors match current criteria</h2>
              <p className="text-xs text-[#666666] max-w-sm mx-auto">
                Try clearing filters or adjusting search parameters to browse all 100 onboarded vendors.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 bg-[#0064D2] hover:bg-[#0052B4] text-white rounded-lg text-xs font-semibold transition"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {vendors.map((vendor) => (
                <div
                  key={vendor._id}
                  className="bg-white rounded-xl border border-[#EBEBEB] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex flex-col justify-between gap-4 hover:border-[#0064D2]/40 hover:-translate-y-0.5 transition-all duration-150"
                >
                  <div className="space-y-3">
                    {/* Top Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-[#1A1A1A]">{vendor.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#E6F7EF] text-[#00A65E] border border-[#A3E9C7] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00A65E]"></span>
                            {vendor.status}
                          </span>
                          <span className="text-[9px] font-mono font-medium text-[#666666] bg-[#F1F5F9] px-1.5 py-0.5 rounded">
                            {vendor.source}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Coverage */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#666666] mb-1 flex items-center gap-1">
                        <FiMapPin size={11} className="text-[#006CE4]" />
                        <span>Service Coverage ({vendor.serviceStates?.length || 0} States)</span>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto custom-scrollbar p-1.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                        {vendor.serviceStates?.map((st) => (
                          <span
                            key={st}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                              selectedState && st.toLowerCase() === selectedState.toLowerCase()
                                ? "bg-[#006CE4] text-white font-bold"
                                : "bg-white text-[#475569] border border-[#E2E8F0]"
                            }`}
                          >
                            {st}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Fleet Options */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#666666] mb-1 flex items-center gap-1">
                        <FaBus size={10} className="text-[#006CE4]" />
                        <span>Fleet Inventory ({vendor.fleet?.length || 0} categories)</span>
                      </div>
                      <div className="space-y-1">
                        {vendor.fleet?.map((f, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs bg-[#F8FAFC] px-2.5 py-1.5 rounded-lg border border-[#E2E8F0]"
                          >
                            <span className="font-semibold text-[#1A1A1A] text-[11px]">
                              {f.category.replace(/_/g, " ")}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-[#666666]">
                              <span>{f.capacity} seats</span>
                              <span>•</span>
                              <span className={f.ac ? "text-[#006CE4] font-semibold" : "text-[#666666]"}>
                                {f.ac ? "AC" : "Non-AC"}
                              </span>
                              <span>•</span>
                              <span className="text-[#475569] font-medium">{f.comfort}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Capabilities Badges */}
                  <div className="pt-3 border-t border-[#EBEBEB] flex flex-wrap gap-1.5 text-[9.5px]">
                    <span className={`px-2 py-0.5 rounded-full font-medium border ${vendor.capabilities?.intercity ? "bg-[#EFF6FF] text-[#0064D2] border-[#BFDBFE]" : "bg-[#F8FAFC] text-[#94A3B8] border-[#E2E8F0]"}`}>
                      ✓ Intercity
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-medium border ${vendor.capabilities?.multiDay ? "bg-[#EFF6FF] text-[#0064D2] border-[#BFDBFE]" : "bg-[#F8FAFC] text-[#94A3B8] border-[#E2E8F0]"}`}>
                      ✓ Multi-Day
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-medium border ${vendor.capabilities?.groupTransport ? "bg-[#EFF6FF] text-[#0064D2] border-[#BFDBFE]" : "bg-[#F8FAFC] text-[#94A3B8] border-[#E2E8F0]"}`}>
                      ✓ Group Transport
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-medium border ${vendor.capabilities?.driverIncluded ? "bg-[#EFF6FF] text-[#0064D2] border-[#BFDBFE]" : "bg-[#F8FAFC] text-[#94A3B8] border-[#E2E8F0]"}`}>
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

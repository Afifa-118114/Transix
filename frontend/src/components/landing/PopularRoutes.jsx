import { Link } from "react-router-dom";
import { FiArrowRight, FiClock, FiMapPin } from "react-icons/fi";
import { FaTrain } from "react-icons/fa6";

export default function PopularRoutes() {
  const routes = [
    {
      title: "Spiritual Ganges Corridor",
      cities: "Delhi → Varanasi → Prayagraj",
      days: "5 Days • 4 Nights",
      train: "Vande Bharat Express (22436)",
      duration: "8h 00m Rail Time",
      source: "New Delhi",
      destination: "Varanasi",
      tag: "Most Popular",
      desc: "Sunrise boat aarti in Kashi, ancient silk weaver lanes, and luxury ghat stay.",
    },
    {
      title: "The Royal Heritage Circuit",
      cities: "Delhi → Agra → Jaipur",
      days: "4 Days • 3 Nights",
      train: "Gatimaan & Vande Bharat",
      duration: "1h 40m High Speed",
      source: "New Delhi",
      destination: "Agra",
      tag: "Scenic Heritage",
      desc: "Taj Mahal sunrise viewing, Amber Fort private jeep ascent, and royal haveli dining.",
    },
    {
      title: "Konkan Coastal Rail Journey",
      cities: "Mumbai CSMT → Madgaon (Goa)",
      days: "4 Days • 3 Nights",
      train: "Tejas & Vistadome Express",
      duration: "7h 45m Scenic Track",
      source: "Mumbai",
      destination: "Goa",
      tag: "Scenic Nature",
      desc: "Waterfalls, Western Ghats mist, viaduct bridges, and pristine South Goa shores.",
    },
  ];

  return (
    <section className="border-t border-[#e7e5e4] bg-[#ffffff] py-24 sm:py-32 font-sans antialiased text-[#1A1A1A]">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[1.4px] text-[#034F46]">
              Curated Expeditions
            </span>
            <h2
              style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
              className="mt-3 text-4xl sm:text-5xl font-[300] tracking-[-1px] text-[#0c0a09]"
            >
              Iconic rail journeys,
              <br />
              <em className="font-normal italic text-[#0c0a09]">ready to customize in one click.</em>
            </h2>
          </div>

          <Link
            to="/travel-options"
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-[#0c0a09] hover:underline"
          >
            <span>View all railway routes</span>
            <FiArrowRight className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Route Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {routes.map((route, i) => (
            <div
              key={i}
              className="group flex flex-col justify-between rounded-2xl border border-[#e7e5e4] bg-[#faf9f5] p-6 transition-all hover:border-[#1A1A1A] hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-[#034F46]/20 bg-[#034F46]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#034F46]">
                    {route.tag}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-[#777169]">
                    <FiClock className="text-xs" /> {route.days}
                  </span>
                </div>

                <h3 className="mt-4 text-xl font-bold text-[#0c0a09] group-hover:text-[#034F46] transition-colors">
                  {route.title}
                </h3>

                <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-[#777169]">
                  <FiMapPin className="text-xs text-[#034F46]" /> {route.cities}
                </p>

                <p className="mt-4 text-xs text-[#4e4e4e] leading-relaxed">
                  {route.desc}
                </p>

                <div className="mt-5 rounded-xl border border-[#e7e5e4] bg-white p-3 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-[#0c0a09]">
                    <FaTrain className="text-[#034F46]" />
                    <span>{route.train}</span>
                  </div>
                  <span className="text-[11px] text-[#777169] mt-0.5 block">{route.duration}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#e7e5e4]">
                <Link
                  to={`/travel-options?source=${encodeURIComponent(route.source)}&destination=${encodeURIComponent(route.destination)}`}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1A1A1A] py-2.5 text-xs font-semibold text-white transition hover:bg-black"
                >
                  <span>Customize Itinerary</span>
                  <FiArrowRight />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

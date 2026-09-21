export default function PartnerTicker() {
  const partners = [
    "Indian Railways",
    "IRCTC Network",
    "Google Places API",
    "Pexels Visuals",
    "OpenStreetMap",
    "Booking.com",
    "Razorpay",
    "Airbnb Experiences",
  ];

  return (
    <section className="border-y border-[#e7e5e4] bg-[#ffffff] py-10 font-sans antialiased">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#777169]">
          Integrated with national rail networks & global travel intelligence
        </p>
      </div>

      {/* Infinite Marquee Ticker */}
      <div className="relative mt-6 flex overflow-x-hidden">
        <div className="animate-marquee flex whitespace-nowrap gap-12 items-center text-sm font-semibold tracking-wider text-[#777169]/80 uppercase">
          {partners.concat(partners).map((item, index) => (
            <div key={index} className="flex items-center gap-12">
              <span className="hover:text-[#0c0a09] transition-colors cursor-default">
                {item}
              </span>
              <span className="text-[#d6d3d1]">•</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

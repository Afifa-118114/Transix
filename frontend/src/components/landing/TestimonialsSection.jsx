import { FiStar } from "react-icons/fi";

export default function TestimonialsSection() {
  const reviews = [
    {
      quote:
        "Transix is the first travel AI that actually understands Indian Railways. It warned us that an 18-minute connection at Kanpur was risky and auto-routed us to a 55-minute buffer train instead. Absolute lifesaver.",
      author: "Devika Sharma",
      role: "Travel Journalist & Solo Explorer",
      origin: "New Delhi",
      stat: "Saved 4h 30m of delays",
    },
    {
      quote:
        "We planned a 7-day multi-city expedition for a family of 5 across Varanasi, Prayagraj, and Ayodhya. The timeline kept everyone on the same page with platform numbers, cabs, and hotels right on our phones.",
      author: "Rohan Malhotra",
      role: "Engineering Director",
      origin: "Bengaluru",
      stat: "Planned 7-day trip in 4 mins",
    },
    {
      quote:
        "The drag-and-drop tour builder is effortlessly intuitive. Being able to swap Vande Bharat timings, adjust our boutique ghat hotel, and see the total cost update in real-time made trip planning joyful again.",
      author: "Ananya Kulkarni",
      role: "Architect & Photographer",
      origin: "Mumbai",
      stat: "3 trips completed with Transix",
    },
  ];

  return (
    <section className="bg-[#faf9f5] py-24 sm:py-32 font-sans antialiased text-[#1A1A1A] border-t border-[#e7e5e4]">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <span className="text-[11px] font-bold uppercase tracking-[1.4px] text-[#034F46]">
          Loved by Explorers
        </span>

        <h2
          style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
          className="mt-4 text-4xl sm:text-6xl font-[300] tracking-[-1px] text-[#0c0a09]"
        >
          Travelers who traded chaos
          <br />
          <em className="font-normal italic text-[#0c0a09]">for effortless rail journeys.</em>
        </h2>

        {/* Testimonial Cards Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {reviews.map((r, i) => (
            <div
              key={i}
              className="flex flex-col justify-between rounded-2xl border border-[#e7e5e4] bg-white p-7 shadow-xs transition hover:shadow-md hover:border-[#1A1A1A]"
            >
              <div>
                {/* 5 Stars */}
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, idx) => (
                    <FiStar key={idx} className="fill-amber-400 text-xs" />
                  ))}
                </div>

                <p className="mt-4 text-sm leading-relaxed text-[#292524]">
                  "{r.quote}"
                </p>
              </div>

              <div className="mt-6 pt-5 border-t border-[#f0efed] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#0c0a09]">{r.author}</h4>
                  <p className="text-[11px] text-[#777169]">{r.role}</p>
                </div>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  {r.stat}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

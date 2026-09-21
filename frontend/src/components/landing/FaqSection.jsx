import { useState } from "react";
import { FiPlus, FiMinus } from "react-icons/fi";

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      q: "How does Transix calculate realistic rail transfer buffers?",
      a: "Unlike generic trip planners that assume instant teleportation between platforms, Transix integrates historical station delay models and minimum connection thresholds (45 to 60 minutes for major junctions like NDLS, BSB, or CNB). If a connection is too tight, Transix alerts you and recommends a safer alternative.",
    },
    {
      q: "Can I customize, add stops, or swap hotels in the itinerary?",
      a: "Yes! The Tour Builder allows full drag-and-drop customization. You can re-order itinerary days, swap train classes (Executive Chair, 2A, 3A), choose different station-proximity hotels, or add curated cultural experiences directly from the catalog.",
    },
    {
      q: "How does Transix differ from IRCTC or travel aggregators?",
      a: "IRCTC only sells you an isolated train ticket without context for your hotels, local cabs, or what to do when you step onto the platform. Aggregators sell hotels without understanding your train arrival time. Transix unifies the entire multi-modal chain into one synchronized timeline.",
    },
    {
      q: "Is it completely free to generate AI itineraries?",
      a: "Yes, exploring railway routes, generating AI day-by-day plans, and customizing itineraries on the Tour Board is 100% free with no credit card required.",
    },
    {
      q: "How does the final checkout and booking work?",
      a: "Once you finalize your customized itinerary on the Tour Board, Transix summarizes all legs, hotels, and experiences with transparent pricing and initiates secure instant checkout powered by Razorpay.",
    },
  ];

  const toggle = (i) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <section className="bg-white py-24 sm:py-32 font-sans antialiased text-[#1A1A1A] border-t border-[#e7e5e4]">
      <div className="mx-auto max-w-4xl px-4">
        <div className="text-center">
          <span className="text-[11px] font-bold uppercase tracking-[1.4px] text-[#034F46]">
            Questions & Answers
          </span>
          <h2
            style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
            className="mt-3 text-4xl sm:text-5xl font-[300] tracking-[-1px] text-[#0c0a09]"
          >
            Everything you need to know
            <br />
            <em className="font-normal italic text-[#0c0a09]">about traveling with Transix.</em>
          </h2>
        </div>

        {/* Accordion Items */}
        <div className="mt-14 space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-[#e7e5e4] bg-[#faf9f5] transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="flex w-full items-center justify-between p-6 text-left"
                >
                  <span className="text-base font-semibold text-[#0c0a09]">{faq.q}</span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white border border-[#e7e5e4] text-[#1A1A1A]">
                    {isOpen ? <FiMinus className="text-xs" /> : <FiPlus className="text-xs" />}
                  </span>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-sm text-[#4e4e4e] leading-relaxed border-t border-[#e7e5e4]/60">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

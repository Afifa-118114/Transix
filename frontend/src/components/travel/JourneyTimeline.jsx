import { FiMapPin, FiClock } from "react-icons/fi";

export default function JourneyTimeline({ transport }) {
  if (!transport) return null;

  const stops = transport.timeline || [];

  return (
    <section className="rounded-3xl bg-white p-8 shadow-xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Journey Route</h2>

          <p className="mt-2 text-gray-500">Complete travel timeline</p>
        </div>

        <div className="rounded-full bg-indigo-100 px-5 py-2 text-indigo-700 font-semibold">
          {transport.duration}
        </div>
      </div>

      {/* Timeline */}

      <div className="overflow-x-auto">
        <div className="flex min-w-max items-center px-4 py-10">
          {stops.map((stop, index) => (
            <div key={index} className="flex items-center">
              {/* Station */}

              <div className="flex flex-col items-center">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-full shadow-lg

                  ${
                    index === 0
                      ? "bg-green-500 text-white"
                      : index === stops.length - 1
                        ? "bg-indigo-600 text-white"
                        : "bg-indigo-100 text-indigo-700"
                  }`}
                >
                  <FiMapPin size={28} />
                </div>

                <p className="mt-4 w-32 text-center font-semibold text-gray-800">
                  {stop}
                </p>

                <p className="mt-1 text-sm text-gray-500">Stop {index + 1}</p>
              </div>

              {/* Connector */}

              {index !== stops.length - 1 && (
                <div className="mx-4 flex w-36 items-center">
                  <div className="h-[3px] flex-1 rounded-full bg-indigo-200" />

                  <FiClock className="mx-2 text-indigo-500" />

                  <div className="h-[3px] flex-1 rounded-full bg-indigo-200" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <SummaryCard title="Departure" value={transport.departure} />

        <SummaryCard title="Arrival" value={transport.arrival} />

        <SummaryCard title="Duration" value={transport.duration} />
      </div>
    </section>
  );
}

function SummaryCard({ title, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
      <p className="text-sm text-gray-500">{title}</p>

      <h3 className="mt-2 text-xl font-bold text-gray-900">{value}</h3>
    </div>
  );
}

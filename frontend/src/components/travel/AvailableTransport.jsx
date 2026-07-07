import TransportCard from "./TransportCard";

export default function AvailableOptions({
  transports,
  mode,
  activeTransport,
  setActiveTransport,
}) {
  if (!transports?.length) return null;

  return (
    <section className="rounded-3xl bg-white p-8 shadow-xl">
      {/* Heading */}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Available</h2>

          <p className="mt-2 text-gray-500">
            Compare all available options and choose the best one.
          </p>
        </div>

        <div className="rounded-full bg-indigo-100 px-5 py-2 font-semibold text-indigo-700">
          {transports.length} Options
        </div>
      </div>

      {/* Cards */}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {transports.map((transport, index) => (
          <TransportCard
            key={index}
            transport={transport}
            mode={mode}
            active={index === activeTransport}
            onSelect={() => setActiveTransport(index)}
          />
        ))}
      </div>
    </section>
  );
}

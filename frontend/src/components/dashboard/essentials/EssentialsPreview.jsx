import { useNavigate } from "react-router-dom";

export default function EssentialsPreview({ trip }) {
  const navigate = useNavigate();

  if (!trip) return null;

  const items = [
    { icon: "🏥", name: "Hospitals" },
    { icon: "💊", name: "Pharmacy" },
    { icon: "🏧", name: "ATM" },
    { icon: "⛽", name: "Petrol Pump" },
    { icon: "👮", name: "Police" },
    { icon: "🔧", name: "Mechanic" },
  ];

  return (
    <section className="rounded-3xl bg-white p-6 shadow-lg">
      {/* Header */}
      <div className="mb-6">
        <h2 className="translate-x-3 text-xl font-bold">Essentials Nearby</h2>

        <p className="translate-x-3 text-gray-500">
          Find important places around {trip.destination}
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {items.map((item) => (
          <button
            key={item.name}
            onClick={() =>
              navigate("/essentials", {
                state: {
                  destination: trip.destination,
                  category: item.name,
                },
              })
            }
            className="rounded-2xl border bg-gray-50 p-5 text-center transition hover:-translate-y-1 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md"
          >
            <div className="text-4xl">{item.icon}</div>

            <p className="mt-3 font-semibold">{item.name}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

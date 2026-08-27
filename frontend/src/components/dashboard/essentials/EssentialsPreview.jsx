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
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900">Essentials & Emergency Services</h2>
        <p className="text-xs text-slate-500">
          Emergency contacts, medical, ATMs & fuel stations in {trip.destination}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
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
            className="flex flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 text-center transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow-xs"
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="mt-2 text-xs font-bold text-slate-800">{item.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

import { useNavigate } from "react-router-dom";

export default function FoodPreview({ trip }) {
  const navigate = useNavigate();

  if (!trip) return null;

  const items = [
    { icon: "🍽️", name: "Restaurants" },
    { icon: "☕", name: "Cafe" },
    { icon: "🍔", name: "Fast Food" },
    { icon: "🥐", name: "Bakery" },
    { icon: "🍕", name: "Pizza" },
    { icon: "🍜", name: "Street Food" },
  ];

  return (
    <section className="overflow-x-hidden rounded-3xl bg-white p-6 shadow-lg">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold translate-x-3">Food & Dining</h2>
          <p className="text-gray-500 translate-x-3">
            Discover places to eat near {trip.destination}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {items.map((item) => (
          <button
            key={item.name}
            onClick={() =>
              navigate("/food", {
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

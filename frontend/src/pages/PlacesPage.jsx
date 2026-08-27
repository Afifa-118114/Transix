import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getPlaces } from "../api/placeApi";
import PlaceGrid from "../components/Places/PlaceGrid";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../layouts/DashboardLayout";

export default function PlacesPage({ destination, title, categories }) {
  const { token } = useAuth();
  const location = useLocation();

  const selectedCategory = location.state?.category;

  const [activeCategory, setActiveCategory] = useState(() => {
    return (
      categories.find((c) => c.value === selectedCategory) || categories[0]
    );
  });

  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedCategory) return;

    const category = categories.find((c) => c.value === selectedCategory);

    if (category) {
      setActiveCategory(category);
    }
  }, [selectedCategory, categories]);

  useEffect(() => {
    fetchPlaces();
  }, [activeCategory, destination]);

  async function fetchPlaces() {
    try {
      setLoading(true);

      const data = await getPlaces(destination, activeCategory.value, token);

      setPlaces(data);
    } catch (err) {
      console.error(err);
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">{title}</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Discover the best nearby places in {destination || "your destination"}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => setActiveCategory(category)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeCategory.value === category.value
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#131b2e] text-slate-700 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-600/50 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <span>{category.icon}</span>
              <span>{category.label}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">Loading places...</div>
        ) : places.length > 0 ? (
          <PlaceGrid places={places} />
        ) : (
          <div className="py-20 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">No places found.</div>
        )}
      </div>
    </DashboardLayout>
  );
}

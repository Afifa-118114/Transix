import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getPlaces } from "../api/placeApi";
import PlaceGrid from "../components/Places/PlaceGrid";
import { useAuth } from "../context/AuthContext";

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
    <div className="mx-auto w-full max-w-[1700px] space-y-5 px-6 py-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>

        <p className="mt-1 text-sm text-gray-500">
          Discover the best nearby places.
        </p>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category.value}
            onClick={() => setActiveCategory(category)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              activeCategory.value === category.value
                ? "bg-gradient-to-br from-indigo-400 via-white to-blue-700 text-black shadow-md"
                : "border border-gray-200 bg-white hover:bg-indigo-50"
            }`}
          >
            <span className="mr-2">{category.icon}</span>
            {category.label}
          </button>
        ))}
      </div>

      {/* Places */}
      {loading ? (
        <div className="py-20 text-center text-gray-500">Loading places...</div>
      ) : places.length > 0 ? (
        <PlaceGrid places={places} />
      ) : (
        <div className="py-20 text-center text-gray-500">No places found.</div>
      )}
    </div>
  );
}

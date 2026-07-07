import { useLocation } from "react-router-dom";
import PlacesPage from "./PlacesPage";

export default function FoodDining() {
  const { state } = useLocation();

  const destination = state?.destination;

  const categories = [
    {
      label: "Restaurants",
      value: "restaurant",
      icon: "🍽️",
    },
    {
      label: "Cafe",
      value: "cafe",
      icon: "☕",
    },
    {
      label: "Fast Food",
      value: "fast food",
      icon: "🍔",
    },
    {
      label: "Bakery",
      value: "bakery",
      icon: "🥐",
    },
  ];

  return (
    <PlacesPage
      destination={destination}
      title="Food & Dining"
      categories={categories}
    />
  );
}

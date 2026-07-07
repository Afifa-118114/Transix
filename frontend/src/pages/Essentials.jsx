import { useLocation } from "react-router-dom";
import PlacesPage from "./PlacesPage";

export default function Essentials() {
  const { state } = useLocation();

  const destination = state?.destination;

  const categories = [
    {
      label: "Hospital",
      value: "hospital",
      icon: "🏥",
    },
    {
      label: "Pharmacy",
      value: "pharmacy",
      icon: "💊",
    },
    {
      label: "ATM",
      value: "ATM",
      icon: "🏧",
    },
    {
      label: "Petrol Pump",
      value: "petrol pump",
      icon: "⛽",
    },
    {
      label: "Police",
      value: "police station",
      icon: "👮",
    },
    {
      label: "Mechanic",
      value: "car repair",
      icon: "🔧",
    },
  ];

  return (
    <PlacesPage
      destination={destination}
      title="Essentials"
      categories={categories}
    />
  );
}

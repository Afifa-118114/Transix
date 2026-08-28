import { useEffect, useState } from "react";
import HeroBanner from "../dashboard/hero/HeroBanner";
import TravelOptions from "../dashboard/travel/TravelOptions";
import ItineraryPreview from "../dashboard/itinerary/ItineraryPreview";
import ExperiencesPreview from "../dashboard/experiences/ExperiencesPreview";
import HotelsPreview from "../dashboard/hotels/HotelsPreview";
import FoodPreview from "../dashboard/food/FoodPreview";
import EssentialsPreview from "../dashboard/essentials/EssentialsPreview";
import { getDestinationInventory } from "../../services/inventoryService";

// MapPreview is intentionally removed — Map is now accessed via the Sidebar Map modal overlay.

const TripDashboard = ({ trip, setTrip }) => {
  const [hotels, setHotels] = useState([]);
  const [loadingHotels, setLoadingHotels] = useState(true);

  useEffect(() => {
    if (!trip) return;

    let isMounted = true;
    const loadInventory = async () => {
      try {
        setLoadingHotels(true);
        const inventory = await getDestinationInventory(trip.destination, trip);
        if (isMounted) {
          setHotels(inventory.hotels || []);
        }
      } catch (err) {
        console.error("Failed to load inventory in TripDashboard:", err);
        if (isMounted) setHotels([]);
      } finally {
        if (isMounted) setLoadingHotels(false);
      }
    };

    loadInventory();
    return () => {
      isMounted = false;
    };
  }, [trip?.destination, trip]);

  if (!trip) return null;

  return (
    <div className="flex flex-col gap-6 pb-12">
      <HeroBanner trip={trip} />
      <TravelOptions trip={trip} />
      <ItineraryPreview trip={trip} />
      <HotelsPreview hotels={hotels} loading={loadingHotels} />
      <ExperiencesPreview trip={trip} />
      <FoodPreview trip={trip} />
      <EssentialsPreview trip={trip} />
    </div>
  );
};

export default TripDashboard;

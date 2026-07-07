import HeroBanner from "../dashboard/hero/HeroBanner";
import TravelOptions from "../dashboard/travel/TravelOptions";
import MapPreview from "../dashboard/map/MapPreview";
import ItineraryPreview from "../dashboard/itinerary/ItineraryPreview";
import ExperiencesPreview from "../dashboard/experiences/ExperiencesPreview";
import HotelsPreview from "../dashboard/hotels/HotelsPreview";
import { useEffect, useState } from "react";
import { getHotels } from "../../api/placeApi";
import FoodPreview from "../dashboard/food/FoodPreview";
import EssentialsPreview from "../dashboard/essentials/EssentialsPreview";

const TripDashboard = ({ trip, setTrip }) => {
  const [hotels, setHotels] = useState([]);
  const [loadingHotels, setLoadingHotels] = useState(true);
  useEffect(() => {
    if (!trip) return;

    const loadHotels = async () => {
      try {
        setLoadingHotels(true);

        const token = localStorage.getItem("token");

        const data = await getHotels(trip.destination, token);

        console.log("Hotels API returned:", data);

        setHotels(data);
      } catch (err) {
        console.error(err);
        setHotels([]);
      } finally {
        setLoadingHotels(false);
      }
    };

    loadHotels();
  }, [trip]);
  if (!trip) return null;
  console.log(trip.itinerary[0]);

  <div className="flex justify-end mb-6">
    <button
      onClick={() => setTrip(null)}
      className="rounded-xl bg-indigo-600 px-5 py-2 text-white"
    >
      Plan Another Trip
    </button>
  </div>;
  console.log("Hotels:", hotels);
  console.log("Loading:", loadingHotels);
  console.log("Hotels state:", hotels);

  return (
    <div className=" overflow-x-hidden  flex flex-col gap-6">
      <HeroBanner trip={trip} />
      <TravelOptions trip={trip} />
      <ItineraryPreview trip={trip} />
      <HotelsPreview hotels={hotels} loading={loadingHotels} />

      <ExperiencesPreview trip={trip} />
      <FoodPreview trip={trip} />
      <EssentialsPreview trip={trip} />
      <MapPreview trip={trip} />
    </div>
  );
};

export default TripDashboard;

import { FaTrain, FaPlane, FaBus, FaCar } from "react-icons/fa";

import TravelCard from "./TravelCard";
import generateTransportData from "../../../utils/transportGenerator";

function TravelOptions({ trip }) {
  if (!trip) return null;

  const transports = generateTransportData(trip);

  const firstTransport = transports[0];

  const getIcon = () => {
    switch (trip.travelMode) {
      case "Train":
        return <FaTrain className="text-indigo-600" />;

      case "Flight":
        return <FaPlane className="text-sky-600" />;

      case "Bus":
        return <FaBus className="text-orange-500" />;

      default:
        return <FaCar className="text-green-600" />;
    }
  };

  const dashboardCard = {
    ...firstTransport,

    type: trip.travelMode,

    icon: getIcon(),

    company: firstTransport.operator,

    tag: "Recommended",

    tagColor: "bg-indigo-100 text-indigo-700",

    recommended: true,

    trip,

    transports,
  };

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold translate-x-3">Travel Options</h2>

          <p className="mt-2 text-gray-500">
            Recommended transport for your journey
          </p>
        </div>
      </div>

      <TravelCard option={dashboardCard} />
    </section>
  );
}

export default TravelOptions;

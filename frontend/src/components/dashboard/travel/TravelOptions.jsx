import { useEffect, useState } from "react";
import { FaTrain, FaPlane, FaBus, FaCar } from "react-icons/fa";
import TravelCard from "./TravelCard";
import generateTransportData from "../../../utils/transportGenerator";
import { searchTrains } from "../../../services/trainService";

export default function TravelOptions({ trip }) {
  const [transports, setTransports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!trip) return;

    let isMounted = true;
    const fetchTransports = async () => {
      setLoading(true);
      try {
        const baseTransports = generateTransportData(trip);
        const otherTransports = baseTransports.filter((t) => t.type !== "Train");

        let trainOption = null;
        if (trip.source && trip.destination) {
          // Fetch real trains from Kaggle dataset API
          const trainData = await searchTrains(trip.source, trip.destination);
          const realTrains = trainData?.trains || (Array.isArray(trainData) ? trainData : []);

          if (realTrains.length > 0) {
            const bestTrain = realTrains[0];
            trainOption = {
              id: `train-${bestTrain.trainNumber}`,
              type: "Train",
              operator: `${bestTrain.trainName} (#${bestTrain.trainNumber})`,
              trainName: bestTrain.trainName,
              trainNumber: bestTrain.trainNumber,
              duration: bestTrain.duration,
              departure: bestTrain.departure,
              arrival: bestTrain.arrival,
              price: bestTrain.price || bestTrain.fare || null,
              rating: 4.8,
              reviews: 1250,
              from: bestTrain.from,
              to: bestTrain.to,
              stops: bestTrain.stops,
              route: bestTrain.route,
              fares: bestTrain.fares,
              runningDays: bestTrain.runningDays,
              recommended: true,
            };
          }
        }

        const combined = trainOption ? [trainOption, ...otherTransports] : otherTransports;

        if (isMounted) {
          setTransports(combined);
        }
      } catch (err) {
        console.warn("Could not load real trains for dashboard:", err.message);
        if (isMounted) {
          setTransports(generateTransportData(trip).filter((t) => t.type !== "Train"));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTransports();
    return () => {
      isMounted = false;
    };
  }, [trip?.source, trip?.destination, trip]);

  if (!trip) return null;

  const getIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "train":
        return <FaTrain className="text-indigo-600" />;
      case "flight":
        return <FaPlane className="text-sky-600" />;
      case "bus":
        return <FaBus className="text-amber-600" />;
      default:
        return <FaCar className="text-emerald-600" />;
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] p-5 shadow-xs transition-colors">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Transit & Travel Options</h2>
          <p className="text-xs text-slate-500">
            Recommended routes between {trip.source} and {trip.destination}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {transports.slice(0, 3).map((item, idx) => (
          <TravelCard
            key={item.id || idx}
            option={{
              ...item,
              icon: getIcon(item.type),
              recommended: idx === 0,
            }}
            source={trip.source}
            destination={trip.destination}
          />
        ))}
      </div>
    </section>
  );
}

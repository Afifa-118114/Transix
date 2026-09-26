import { useEffect, useState } from "react";
import TravelCard from "./TravelCard";
import { searchTrains } from "../../../services/trainService";
import { searchFlights } from "../../../services/flightService";

export default function TravelOptions({ trip }) {
  const [trainOption, setTrainOption] = useState(null);
  const [flightOption, setFlightOption] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!trip || !trip.source || !trip.destination) return;

    let isMounted = true;
    const loadTransportCards = async () => {
      setLoading(true);
      try {
        // 1. Check if trip already has selected travel legs in itinerary
        const legs = Array.isArray(trip.travelLegs) ? trip.travelLegs : [];
        const selectedTrainLeg = legs.find(l => l.mode?.toLowerCase() === "train");
        const selectedFlightLeg = legs.find(l => l.mode?.toLowerCase() === "flight");

        // 2. Prepare or fetch Train data
        let trainDataObj = null;
        if (selectedTrainLeg) {
          trainDataObj = {
            type: "Train",
            name: selectedTrainLeg.trainName || `Train #${selectedTrainLeg.trainNumber}`,
            operator: selectedTrainLeg.trainName ? `${selectedTrainLeg.trainName} (#${selectedTrainLeg.trainNumber})` : `Train #${selectedTrainLeg.trainNumber}`,
            trainNumber: selectedTrainLeg.trainNumber,
            duration: selectedTrainLeg.duration || "Scheduled",
            departure: selectedTrainLeg.departure,
            arrival: selectedTrainLeg.arrival,
            frequency: "Runs on Schedule",
            isSelected: true,
          };
        } else {
          try {
            const resTrains = await searchTrains(trip.source, trip.destination);
            const trainList = resTrains?.trains || (Array.isArray(resTrains) ? resTrains : []);
            if (trainList.length > 0) {
              const bestTrain = trainList[0];
              trainDataObj = {
                type: "Train",
                name: bestTrain.trainName || `Train #${bestTrain.trainNumber}`,
                operator: `${bestTrain.trainName} (#${bestTrain.trainNumber})`,
                trainNumber: bestTrain.trainNumber,
                duration: bestTrain.duration || "Scheduled",
                departure: bestTrain.departure,
                arrival: bestTrain.arrival,
                runningDays: bestTrain.runningDays,
                frequency: bestTrain.runningDays ? "Regular Schedule" : "Scheduled",
                isSelected: trip.travelMode?.toLowerCase() === "train",
              };
            }
          } catch (e) {
            console.warn("Could not load train schedule for dashboard:", e);
          }
        }

        // Fallback Train Card if query returned empty
        if (!trainDataObj) {
          trainDataObj = {
            type: "Train",
            name: `Direct Rail Route (${trip.source} → ${trip.destination})`,
            operator: `Indian Railways Network`,
            duration: "Schedule on request",
            frequency: "Regular Schedule",
            isSelected: trip.travelMode?.toLowerCase() === "train",
          };
        }

        // 3. Prepare or fetch Flight data
        let flightDataObj = null;
        if (selectedFlightLeg) {
          flightDataObj = {
            type: "Flight",
            name: `${selectedFlightLeg.airline || "Scheduled Flight"} #${selectedFlightLeg.flightNumber || ""}`.trim(),
            operator: `${selectedFlightLeg.airline || "Scheduled Carrier"} #${selectedFlightLeg.flightNumber || ""}`.trim(),
            flightNumber: selectedFlightLeg.flightNumber,
            duration: selectedFlightLeg.duration || "~2h 30m",
            departure: selectedFlightLeg.departure,
            arrival: selectedFlightLeg.arrival,
            frequency: "Daily",
            isSelected: true,
          };
        } else {
          try {
            const resFlights = await searchFlights(trip.source, trip.destination, trip.startDate);
            const flightList = resFlights?.flights || (Array.isArray(resFlights) ? resFlights : []);
            if (flightList.length > 0) {
              const bestFlight = flightList[0];
              flightDataObj = {
                type: "Flight",
                name: `${bestFlight.airline} #${bestFlight.flightNumber}`,
                operator: `${bestFlight.airline} #${bestFlight.flightNumber}`,
                flightNumber: bestFlight.flightNumber,
                duration: "~2h 30m",
                departure: bestFlight.departureTime,
                arrival: bestFlight.arrivalTime,
                operatingDays: bestFlight.operatingDays,
                frequency: "Daily",
                isSelected: trip.travelMode?.toLowerCase() === "flight",
              };
            }
          } catch (e) {
            console.warn("Could not load flight schedule for dashboard:", e);
          }
        }

        // Fallback Flight Card if query returned empty
        if (!flightDataObj) {
          flightDataObj = {
            type: "Flight",
            name: `Domestic Flight Route (${trip.source} → ${trip.destination})`,
            operator: `DGCA Domestic Airline Dataset`,
            duration: "~2h 30m",
            frequency: "Scheduled Flights",
            isSelected: trip.travelMode?.toLowerCase() === "flight",
          };
        }

        if (isMounted) {
          setTrainOption(trainDataObj);
          setFlightOption(flightDataObj);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadTransportCards();
    return () => {
      isMounted = false;
    };
  }, [trip?.source, trip?.destination, trip?.startDate, trip?.travelLegs, trip?.travelMode]);

  if (!trip) return null;

  return (
    <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] p-5 shadow-xs transition-colors">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Transit &amp; Travel Options</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Official transport schedule datasets for {trip.source} → {trip.destination}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {trainOption && (
          <TravelCard
            option={trainOption}
            source={trip.source}
            destination={trip.destination}
            tripId={trip._id}
            startDate={trip.startDate}
            endDate={trip.endDate}
          />
        )}

        {flightOption && (
          <TravelCard
            option={flightOption}
            source={trip.source}
            destination={trip.destination}
            tripId={trip._id}
            startDate={trip.startDate}
            endDate={trip.endDate}
          />
        )}
      </div>
    </section>
  );
}

import { FiBell, FiMenu } from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";

function Navbar({ trip, setTrip }) {
  const { user } = useAuth();
  return (
    <header className="flex h-16 items-center justify-between rounded-3xl bg-white px-6 shadow-sm">
      {/* Left */}
      <div className="flex items-center gap-5">
        <button className="text-2xl text-gray-700">
          <FiMenu />
        </button>

        <div>
          <h2 className="text-2xl font-semibold text-gray-800">
            {trip
              ? `${trip.source} → ${trip.destination}`
              : "Plan Your AI Journey"}
          </h2>

          {trip ? (
            <p className="mt-1 flex items-center gap-3 text-sm text-gray-500">
              <span>{trip.itinerary?.length || 0} Days</span>

              <span>•</span>

              <span>
                {new Date(trip.startDate).toLocaleDateString()}
                <span className="mx-2">–</span>
                {new Date(trip.endDate).toLocaleDateString()}
              </span>

              <span>•</span>

              <span>
                {trip.currency} {trip.budget}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-gray-500">
              Generate a personalized itinerary using AI
            </p>
          )}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        {trip && (
          <button
            onClick={() => {
              localStorage.removeItem("currentTrip");
              setTrip(null);
            }}
            className="rounded-xl bg-gradient-to-br from-indigo-400 via-white to-blue-700 text-black shadow-md px-5 py-2.5 text-sm font-semibold text-black"
          >
            Plan Another Trip
          </button>
        )}

        <button className="text-2xl text-gray-600 hover:text-indigo-600">
          <FiBell />
        </button>

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-700 via-white to-purple-600 text-lg font-semibold text-black">
          {user?.name?.charAt(0).toUpperCase() || "U"}
        </div>
      </div>
    </header>
  );
}

export default Navbar;

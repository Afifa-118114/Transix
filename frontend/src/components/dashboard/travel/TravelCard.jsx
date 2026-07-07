import { FaArrowRight, FaStar } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

function TravelCard({ option }) {
  const navigate = useNavigate();

  return (
    <div className=" h-[160px] w-[400px] group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      {option.recommended && (
        <span className="absolute right-6 top-6 rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-white">
          Recommended
        </span>
      )}

      {/* Header */}

      <div className="flex items-center gap-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 text-5xl">
          {option.icon}
        </div>

        <div>
          <h3 className="text-2xl font-bold">{option.type}</h3>

          <p className="mt-1 text-gray-500">{option.company}</p>
        </div>
      </div>

      {/* Details */}

      <div className="mt-8 grid grid-cols-3 gap-6">
        <div>
          <p className="text-sm text-gray-500">Duration</p>

          <p className="mt-2 font-semibold">{option.duration}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Estimated Fare</p>

          <p className="mt-2 text-lg font-bold text-indigo-600">
            {option.price}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Rating</p>

          <div className="mt-2 flex items-center gap-2">
            <FaStar className="text-yellow-500" />

            <span className="font-semibold">{option.rating}</span>
          </div>
        </div>
      </div>

      {/* Footer */}

      <div className="mt-8 flex items-center justify-between border-t pt-6">
        <span
          className={`rounded-full px-4 py-2 text-sm font-semibold ${option.tagColor}`}
        >
          {option.tag}
        </span>

        <button
          onClick={() =>
            navigate("/travel-details", {
              state: {
                transports: option.transports,
                mode: option.type,
                activeIndex: 0,
              },
            })
          }
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2c296f] via-[#6a2478] to-[#a939ef] px-6 py-3 font-semibold text-white transition hover:scale-105"
        >
          Explore More
          <FaArrowRight />
        </button>
      </div>
    </div>
  );
}

export default TravelCard;

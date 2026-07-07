import { useNavigate } from "react-router-dom";
import HotelCard from "./HotelCard";

function HotelsPreview(props) {
  console.log("HotelsPreview props:", props);

  const { hotels = [], loading } = props;
  const navigate = useNavigate();
  const handleHotelClick = (hotel) => {
    navigate("/hotel-details", {
      state: { hotel },
    });
  };

  if (loading) {
    return (
      <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm overflow-x-hidden">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">🏨 Stays & Hotels</h2>
          <p className="mt-2 text-gray-500">
            Recommended accommodations near your destination
          </p>
        </div>

        <div className="flex gap-6 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[360px] w-[300px] animate-pulse rounded-3xl bg-gray-200"
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm ">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold translate-x-3">Stays & Hotels</h2>

          <p className="mt-2 text-gray-500 translate-x-3">
            Recommended accommodations near your destination
          </p>
        </div>
      </div>

      {hotels.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          No hotel recommendations available.
        </div>
      ) : (
        <div className="flex gap-6 overflow-x-hidden pb-2">
          {hotels.map((hotel) => (
            <HotelCard
              key={hotel.id}
              hotel={hotel}
              onClick={() =>
                navigate("/hotel-details", {
                  state: {
                    hotels,
                    activeIndex: hotels.findIndex((h) => h.id === hotel.id),
                  },
                })
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default HotelsPreview;

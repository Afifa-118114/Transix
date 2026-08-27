import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import HotelTabs from "../components/hotels/HotelTabs.jsx";
import HotelGallery from "../components/hotels/HotelGallery";
import HotelInfo from "../components/hotels/HotelInfo";
import HotelActionButtons from "../components/hotels/HotelActionButtons";
import { FiArrowLeft } from "react-icons/fi";

export default function HotelDetails() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const hotelsList = state?.hotels?.length
    ? state.hotels
    : state?.hotel
    ? [state.hotel]
    : [];

  const initialIndex = state?.activeIndex !== undefined
    ? state.activeIndex
    : state?.hotelId
    ? Math.max(0, hotelsList.findIndex((h) => h.id === state.hotelId))
    : 0;

  const [activeHotel, setActiveHotel] = useState(initialIndex);
  const [activePhoto, setActivePhoto] = useState(0);

  if (hotelsList.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-[#f8faff] text-slate-600">
        <p className="text-sm font-semibold">No hotel information selected.</p>
        <button
          onClick={() => navigate(-1)}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const hotel = hotelsList[activeHotel] || hotelsList[0];

  return (
    <div className="min-h-screen bg-[#f8faff] text-slate-800 pb-12">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition hover:text-indigo-600"
        >
          <FiArrowLeft className="text-xs" />
          <span>Back to Dashboard</span>
        </button>

        {hotelsList.length > 1 && (
          <HotelTabs
            hotels={hotelsList}
            activeHotel={activeHotel}
            setActiveHotel={setActiveHotel}
            setActivePhoto={setActivePhoto}
          />
        )}

        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <HotelGallery
            hotel={hotel}
            activePhoto={activePhoto}
            setActivePhoto={setActivePhoto}
          />
          <HotelInfo hotel={hotel} />
        </div>

        <div className="mt-6">
          <HotelActionButtons hotel={hotel} />
        </div>
      </div>
    </div>
  );
}

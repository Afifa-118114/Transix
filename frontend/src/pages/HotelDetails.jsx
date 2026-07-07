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

  if (!state?.hotels) {
    return (
      <div className="flex h-screen items-center justify-center">
        No hotel data found.
      </div>
    );
  }

  const { hotels } = state;

  const [activeHotel, setActiveHotel] = useState(state.activeIndex || 0);
  const [activePhoto, setActivePhoto] = useState(0);

  const hotel = hotels[activeHotel];

  return (
    <div className="overflow-x-hidden min-h-screen bg-gradient-to-br from-[#f8faff] via-white to-[#eef2ff]">
      <div className="mx-auto max-w-[1500px] px-8 py-8">
        {" "}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 font-medium text-indigo-600 hover:underline translate-x-4 translate-y-2 "
        >
          <FiArrowLeft />
          Back to Dashboard
        </button>
        <HotelTabs
          hotels={hotels}
          activeHotel={activeHotel}
          setActiveHotel={setActiveHotel}
          setActivePhoto={setActivePhoto}
        />
        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <HotelGallery
            hotel={hotel}
            activePhoto={activePhoto}
            setActivePhoto={setActivePhoto}
          />

          <HotelInfo hotel={hotel} />
        </div>
        <HotelActionButtons hotel={hotel} />
      </div>
    </div>
  );
}

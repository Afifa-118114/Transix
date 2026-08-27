import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

export default function HotelGallery({ hotel, activePhoto, setActivePhoto }) {
  const photos =
    hotel.photos?.length > 0 ? hotel.photos : [{ url: hotel.image }];

  return (
    <div className="flex flex-col gap-3">
      {/* Main Image View */}
      <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-slate-900 shadow-xs border border-slate-200">
        <img
          src={photos[activePhoto]?.url || hotel.image}
          alt={hotel.name}
          className="h-full w-full object-cover"
        />

        <button
          onClick={() =>
            setActivePhoto(
              activePhoto === 0 ? photos.length - 1 : activePhoto - 1,
            )
          }
          className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md backdrop-blur-xs hover:bg-white transition"
        >
          <FiChevronLeft className="text-sm" />
        </button>

        <button
          onClick={() =>
            setActivePhoto(
              activePhoto === photos.length - 1 ? 0 : activePhoto + 1,
            )
          }
          className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md backdrop-blur-xs hover:bg-white transition"
        >
          <FiChevronRight className="text-sm" />
        </button>
      </div>

      {/* Thumbnails Row */}
      <div className="grid grid-cols-6 gap-2">
        {photos.slice(0, 6).map((photo, index) => (
          <img
            key={index}
            src={photo.url}
            alt=""
            onClick={() => setActivePhoto(index)}
            className={`h-16 w-full cursor-pointer rounded-xl object-cover transition border ${
              activePhoto === index
                ? "border-indigo-600 ring-2 ring-indigo-500"
                : "border-slate-200 opacity-70 hover:opacity-100"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

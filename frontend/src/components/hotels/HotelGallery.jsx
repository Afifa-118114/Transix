import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

function HotelGallery({ hotel, activePhoto, setActivePhoto }) {
  const photos =
    hotel.photos?.length > 0 ? hotel.photos : [{ url: hotel.image }];

  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl translate-x-4 translate-y-8">
        <img
          src={photos[activePhoto].url}
          alt=""
          className="h-[320px] w-full object-cover"
        />

        <button
          onClick={() =>
            setActivePhoto(
              activePhoto === 0 ? photos.length - 1 : activePhoto - 1,
            )
          }
          className="absolute left-4 top-1/2 rounded-full bg-white p-3 shadow-lg"
        >
          <FiChevronLeft />
        </button>

        <button
          onClick={() =>
            setActivePhoto(
              activePhoto === photos.length - 1 ? 0 : activePhoto + 1,
            )
          }
          className="absolute right-4 top-1/2 rounded-full bg-white p-3 shadow-lg"
        >
          <FiChevronRight />
        </button>
      </div>

      <div className="translate-x-4 translate-y-10 mt-4 grid grid-cols-6 gap-3">
        {photos.map((photo, index) => (
          <img
            key={index}
            src={photo.url}
            onClick={() => setActivePhoto(index)}
            className={`h-24 w-full cursor-pointer rounded-xl object-cover transition

            ${activePhoto === index ? "ring-4 ring-indigo-500" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}

export default HotelGallery;

const API_KEY = import.meta.env.VITE_PEXELS_API_KEY;

export async function getPlaceImage(place) {
  try {
    const query = `${place} India`;

    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(
        query,
      )}&per_page=1`,
      {
        headers: {
          Authorization: API_KEY,
        },
      },
    );

    const data = await res.json();

    if (data.photos?.length > 0) {
      return data.photos[0].src.large;
    }

    return "https://picsum.photos/800/500";
  } catch (err) {
    console.error(err);
    return "https://picsum.photos/800/500";
  }
}

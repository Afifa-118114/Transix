import { getPlaceImage as fetchPlaceImageApi } from "../api/placeApi";

export async function getPlaceImage(place) {
  try {
    const imageUrl = await fetchPlaceImageApi(place);
    if (imageUrl) {
      return imageUrl;
    }
    return "https://picsum.photos/800/500";
  } catch (err) {
    console.error("Failed to fetch image via API:", err);
    return "https://picsum.photos/800/500";
  }
}


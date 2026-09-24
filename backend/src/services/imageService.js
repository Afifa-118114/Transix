const axios = require("axios");
const cloudinary = require("cloudinary").v2;

if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Generate a destination hero image using Cloudflare Workers AI (FLUX.1 Schnell).
 * Uploads generated image to Cloudinary for persistence.
 * Falls back to Pexels if Cloudflare or Cloudinary is unavailable or fails.
 */
const generateHeroImage = async (destination) => {
  if (!destination) return null;

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (accountId && apiToken) {
    try {
      const prompt = `Realistic, high-quality travel photograph of ${destination}, India, showing visually distinctive natural and cultural scenery associated with the destination. Wide cinematic composition suitable for a travel website dashboard hero banner, natural lighting, realistic colors, premium travel photography, no text, no logos, no watermark, no people as the primary subject.`;

      const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;

      const response = await axios.post(
        cfUrl,
        { prompt },
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          timeout: 25000,
        }
      );

      const base64Image = response.data?.result?.image;
      if (base64Image) {
        // Upload base64 image to Cloudinary for permanent hosting
        if (
          process.env.CLOUDINARY_CLOUD_NAME &&
          process.env.CLOUDINARY_API_KEY &&
          process.env.CLOUDINARY_API_SECRET
        ) {
          const uploadRes = await cloudinary.uploader.upload(
            `data:image/jpeg;base64,${base64Image}`,
            {
              folder: "transix/hero_images",
              resource_type: "image",
            }
          );

          if (uploadRes?.secure_url) {
            return uploadRes.secure_url;
          }
        }

        // Direct data URI fallback if Cloudinary is not configured
        return `data:image/jpeg;base64,${base64Image}`;
      }
    } catch (cfError) {
      console.error(
        "[ImageService] Cloudflare Workers AI Hero Generation failed:",
        cfError.response?.data?.errors?.[0]?.message || cfError.message
      );
    }
  }

  // Graceful fallback to existing Pexels search
  console.log(`[ImageService] Falling back to Pexels for hero image: ${destination}`);
  return getDestinationImage(destination);
};

const getDestinationImage = async (destination) => {
  try {
    const response = await axios.get("https://api.pexels.com/v1/search", {
      headers: {
        Authorization: process.env.PEXELS_API_KEY,
      },
      params: {
        query: `${destination} city`,
        per_page: 1,
        orientation: "landscape",
      },
    });

    if (response.data?.photos?.length > 0) {
      return response.data.photos[0].src.landscape;
    }

    return null;
  } catch (error) {
    console.error("Pexels Error:", error.message);
    return null;
  }
};

const getPlaceImage = async (place) => {
  try {
    const query = `${place} India`;
    const response = await axios.get("https://api.pexels.com/v1/search", {
      headers: {
        Authorization: process.env.PEXELS_API_KEY,
      },
      params: {
        query,
        per_page: 1,
      },
    });

    if (response.data?.photos?.length > 0) {
      return response.data.photos[0].src.large || response.data.photos[0].src.medium;
    }

    return null;
  } catch (error) {
    console.error("Pexels Place Image Error:", error.message);
    return null;
  }
};

module.exports = {
  generateHeroImage,
  getDestinationImage,
  getPlaceImage,
};


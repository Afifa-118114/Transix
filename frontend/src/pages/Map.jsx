import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTripBuilder } from "../context/TripBuilderContext";

// /map route — redirects to /home while opening the map modal overlay.
// The premium map is accessed via the left sidebar button, not direct navigation.
export default function Map() {
  const navigate = useNavigate();
  const { openMapModal } = useTripBuilder();

  useEffect(() => {
    navigate("/home", { replace: true });
    openMapModal();
  }, [navigate, openMapModal]);

  return null;
}

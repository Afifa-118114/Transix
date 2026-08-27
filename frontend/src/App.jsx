import AppRoutes from "./routes/AppRoutes";
import { Toaster } from "react-hot-toast";
import { TripBuilderProvider } from "./context/TripBuilderContext";

function App() {
  return (
    <TripBuilderProvider>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <AppRoutes />
    </TripBuilderProvider>
  );
}

export default App;

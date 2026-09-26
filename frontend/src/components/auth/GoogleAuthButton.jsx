import { GoogleLogin } from "@react-oauth/google";
import { useTheme } from "../../context/ThemeContext";
import toast from "react-hot-toast";

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function GoogleAuthButton({ onGoogleSuccess, onError, loading = false }) {
  const { isDark } = useTheme();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  console.log("GOOGLE CLIENT ID:", clientId);
  const isConfigured = Boolean(clientId && !clientId.includes("your-google-client-id"));

  const handleCredentialSuccess = (credentialResponse) => {
    if (!credentialResponse?.credential) {
      if (onError) onError("Failed to retrieve Google credentials.");
      return;
    }
    onGoogleSuccess(credentialResponse.credential);
  };

  const handleCredentialError = () => {
    const errorMsg = "Google authentication was cancelled or failed.";
    if (onError) onError(errorMsg);
  };

  if (!isConfigured) {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={() => {
          toast.error(
            "Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID in your frontend .env file.",
            { id: "google-cfg-warning", duration: 4500 }
          );
        }}
        className="w-full flex items-center justify-center gap-3 rounded-[14px] border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#131b2e] hover:bg-slate-50 dark:hover:bg-slate-800/80 py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-all shadow-sm active:scale-[0.98] disabled:opacity-60 cursor-pointer"
        title="Requires Google Client ID configuration"
      >
        <GoogleIcon />
        <span>Continue with Google</span>
      </button>
    );
  }

  return (
    <div className="w-full flex justify-center [&>div]:w-full [&>div>iframe]:!mx-auto [&>div]:flex [&>div]:justify-center">
      <GoogleLogin
        onSuccess={handleCredentialSuccess}
        onError={handleCredentialError}
        useOneTap={false}
        theme={isDark ? "filled_black" : "outline"}
        size="large"
        text="continue_with"
        shape="rectangular"
        width="380"
      />
    </div>
  );
}

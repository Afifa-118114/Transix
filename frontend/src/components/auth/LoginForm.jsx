import { useState } from "react";
import { loginUser, googleAuthUser } from "../../api/authApi";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import AuthLayout from "./AuthLayout";
import GoogleAuthButton from "./GoogleAuthButton";

export default function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "traveler", // role selection on frontend
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    setErrorMsg("");
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");

      const data = await loginUser({ email: form.email, password: form.password });

      if (data.token && data.user) {
        // Backend returns the definitive role. Let's verify it matches frontend selection.
        const actualRole = data.user.role || "traveler";
        if (actualRole !== form.role) {
          setErrorMsg(`Role mismatch. This account is registered as ${actualRole === 'operator' ? 'an Operator' : 'a Traveler'}.`);
          return;
        }

        login(data.user, data.token);
        toast.success(`Welcome back, ${data.user.name}!`, { icon: "👋" });
        if (actualRole === "operator") {
          navigate("/operator/dashboard");
        } else {
          navigate("/home");
        }
      } else {
        setErrorMsg("Invalid response from server.");
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.code === "ERR_NETWORK"
          ? "Cannot connect to server. Please ensure backend is running."
          : "Login Failed. Please check your credentials.");
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential) => {
    try {
      setLoading(true);
      setErrorMsg("");

      const data = await googleAuthUser({
        credential,
        role: form.role,
      });

      if (data.token && data.user) {
        const actualRole = data.user.role || "traveler";
        if (actualRole !== form.role) {
          setErrorMsg(
            `Role mismatch. This account is registered as ${
              actualRole === "operator" ? "an Operator" : "a Traveler"
            }.`
          );
          return;
        }

        login(data.user, data.token);
        toast.success(`Welcome back, ${data.user.name}!`, { icon: "👋" });
        if (actualRole === "operator") {
          navigate("/operator/dashboard");
        } else {
          navigate("/home");
        }
      } else {
        setErrorMsg("Invalid response from server.");
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.code === "ERR_NETWORK"
          ? "Cannot connect to server. Please ensure backend is running."
          : "Google Sign-In failed. Please try again.");
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = (msg) => {
    setErrorMsg(msg);
    toast.error(msg);
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="w-full flex flex-col">
        
        <div className="flex flex-col mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Continue where your journey left off.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 p-3 text-sm font-medium text-rose-700 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        <div className="flex flex-col gap-5">
          <div className="mb-2">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Login as
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div 
                onClick={() => setForm({ ...form, role: "traveler" })}
                className={`cursor-pointer rounded-xl border p-3 flex items-start gap-3 transition-all ${
                  form.role === "traveler" 
                    ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 ring-1 ring-blue-600" 
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <div className="text-xl">👤</div>
                <div>
                  <div className={`text-sm font-bold ${form.role === "traveler" ? "text-blue-700 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"}`}>Traveler</div>
                  <div className="text-[10px] font-semibold text-slate-500">Plan and manage journeys.</div>
                </div>
              </div>
              <div 
                onClick={() => setForm({ ...form, role: "operator" })}
                className={`cursor-pointer rounded-xl border p-3 flex items-start gap-3 transition-all ${
                  form.role === "operator" 
                    ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 ring-1 ring-blue-600" 
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <div className="text-xl">⚙️</div>
                <div>
                  <div className={`text-sm font-bold ${form.role === "operator" ? "text-blue-700 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"}`}>Operator</div>
                  <div className="text-[10px] font-semibold text-slate-500">Monitor shared trips.</div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <label
              htmlFor="login-email"
              className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Email Address
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              value={form.email}
              placeholder="Enter your email"
              onChange={handleChange}
              autoComplete="email"
              required
              className="w-full rounded-[14px] border-[1.5px] border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-3.5 text-sm text-slate-900 dark:text-white placeholder-slate-400/80 dark:placeholder-slate-500 outline-none transition-all duration-300 hover:border-blue-300 dark:hover:border-slate-500 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-900/40 focus:bg-white dark:focus:bg-[#131b2e]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="login-password"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Password
              </label>
              <button type="button" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                Forgot password?
              </button>
            </div>
            <input
              id="login-password"
              name="password"
              type="password"
              value={form.password}
              placeholder="Enter your password"
              onChange={handleChange}
              autoComplete="current-password"
              required
              className="w-full rounded-[14px] border-[1.5px] border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-3.5 text-sm text-slate-900 dark:text-white placeholder-slate-400/80 dark:placeholder-slate-500 outline-none transition-all duration-300 hover:border-blue-300 dark:hover:border-slate-500 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-900/40 focus:bg-white dark:focus:bg-[#131b2e]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-[14px] bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-600/20 dark:shadow-blue-900/20 transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center cursor-pointer"
          >
            {loading ? "Signing In..." : "Sign In →"}
          </button>

          <div className="relative my-2 flex items-center justify-center">
            <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
            <span className="bg-[#f8fafc] dark:bg-[#0b0f19] px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              or
            </span>
          </div>

          <GoogleAuthButton
            onGoogleSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            loading={loading}
          />
        </div>

        <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col items-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Create account
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}

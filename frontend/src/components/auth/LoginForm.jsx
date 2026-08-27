import { useState } from "react";
import { loginUser } from "../../api/authApi";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";

export default function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
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

      const data = await loginUser(form);

      if (data.token && data.user) {
        login(data.user, data.token);
        toast.success(`Welcome back, ${data.user.name}!`, { icon: "👋" });
        navigate("/home");
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

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 bg-[#f8faff]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs flex flex-col"
      >
        <h1 className="text-center text-xl font-bold text-slate-900">
          Welcome back to Transix
        </h1>

        <p className="mt-1 text-center text-xs text-slate-500">
          Sign in to access your planned itineraries and trips
        </p>

        {errorMsg && (
          <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-bold text-rose-700 text-center">
            {errorMsg}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3.5">
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              Email Address
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              value={form.email}
              placeholder="e.g. dextro@gmail.com"
              onChange={handleChange}
              autoComplete="email"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              value={form.password}
              placeholder="Enter your password"
              onChange={handleChange}
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 active:scale-98 disabled:opacity-60"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </div>

        <p className="mt-5 text-center text-xs text-slate-500">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-bold text-indigo-600 hover:underline"
          >
            Create account
          </Link>
        </p>
      </form>
    </div>
  );
}

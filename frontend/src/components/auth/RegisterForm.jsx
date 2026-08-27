import { useState } from "react";
import { registerUser } from "../../api/authApi";
import { useNavigate, Link } from "react-router-dom";
import { FiSun, FiMoon } from "react-icons/fi";
import { useTheme } from "../../context/ThemeContext";
import toast from "react-hot-toast";

export default function RegisterForm() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const [form, setForm] = useState({
    name: "",
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
    if (!form.name || !form.email || !form.password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");
      await registerUser(form);
      toast.success("Account created! Please sign in.", { icon: "🎉" });
      navigate("/login");
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed. Please try again.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center px-4 py-8 bg-[#f8faff] dark:bg-[#0b0f19] transition-colors duration-200">
      {/* Top Floating Theme Toggle */}
      <button
        onClick={toggleTheme}
        type="button"
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        className="absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] text-slate-600 dark:text-slate-300 shadow-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition"
      >
        {isDark ? <FiSun className="text-lg text-amber-400" /> : <FiMoon className="text-lg text-slate-700" />}
      </button>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] p-6 sm:p-8 shadow-sm dark:shadow-2xl flex flex-col transition-colors duration-200"
      >
        <div className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800/60 text-xl font-black text-indigo-600 dark:text-indigo-400">
            T
          </div>
          <h1 className="mt-3 text-center text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            Create your Transix account
          </h1>
          <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
            Start planning smarter trips with AI intelligence
          </p>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 p-2.5 text-xs font-bold text-rose-700 dark:text-rose-300 text-center">
            {errorMsg}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Full Name
            </label>
            <input
              name="name"
              type="text"
              value={form.name}
              placeholder="e.g. Alex Johnson"
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-[#1a233a] px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:bg-white dark:focus:bg-[#1f2a45] focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/40"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Email Address
            </label>
            <input
              name="email"
              type="email"
              value={form.email}
              placeholder="e.g. alex@example.com"
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-[#1a233a] px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:bg-white dark:focus:bg-[#1f2a45] focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/40"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              placeholder="Create a password"
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-[#1a233a] px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:bg-white dark:focus:bg-[#1f2a45] focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/40"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-98 disabled:opacity-60"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </div>

        <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}


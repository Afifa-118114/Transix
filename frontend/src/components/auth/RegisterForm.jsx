import { useState } from "react";
import { registerUser } from "../../api/authApi";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import AuthLayout from "./AuthLayout";

export default function RegisterForm() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "traveler", // default role
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
    <AuthLayout>
      <form onSubmit={handleSubmit} className="w-full flex flex-col">

        <div className="flex flex-col mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Start your journey with Transix.
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
              Create account as
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setForm({ ...form, role: "traveler" })}
                className={`cursor-pointer rounded-xl border p-3 flex items-start gap-3 transition-all ${form.role === "traveler"
                    ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 ring-1 ring-blue-600"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
              >
                <div className="text-xl">👤</div>
                <div>
                  <div className={`text-sm font-bold ${form.role === "traveler" ? "text-blue-700 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"}`}>Traveler</div>
                  <div className="text-[10px] font-semibold text-slate-500">Plan and manage your own journeys.</div>
                </div>
              </div>
              <div
                onClick={() => setForm({ ...form, role: "operator" })}
                className={`cursor-pointer rounded-xl border p-3 flex items-start gap-3 transition-all ${form.role === "operator"
                    ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 ring-1 ring-blue-600"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
              >
                <div className="text-xl">⚙️</div>
                <div>
                  <div className={`text-sm font-bold ${form.role === "operator" ? "text-blue-700 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"}`}>Operator</div>
                  <div className="text-[10px] font-semibold text-slate-500">Monitor shared trips & operations.</div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Full Name
            </label>
            <input
              name="name"
              type="text"
              value={form.name}
              placeholder="Enter your full name"
              onChange={handleChange}
              required
              className="w-full rounded-[14px] border-[1.5px] border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-3.5 text-sm text-slate-900 dark:text-white placeholder-slate-400/80 dark:placeholder-slate-500 outline-none transition-all duration-300 hover:border-blue-300 dark:hover:border-slate-500 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-900/40 focus:bg-white dark:focus:bg-[#131b2e]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Email Address
            </label>
            <input
              name="email"
              type="email"
              value={form.email}
              placeholder="Enter your email"
              onChange={handleChange}
              required
              className="w-full rounded-[14px] border-[1.5px] border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-3.5 text-sm text-slate-900 dark:text-white placeholder-slate-400/80 dark:placeholder-slate-500 outline-none transition-all duration-300 hover:border-blue-300 dark:hover:border-slate-500 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-900/40 focus:bg-white dark:focus:bg-[#131b2e]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              placeholder="Create a password"
              onChange={handleChange}
              required
              className="w-full rounded-[14px] border-[1.5px] border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-3.5 text-sm text-slate-900 dark:text-white placeholder-slate-400/80 dark:placeholder-slate-500 outline-none transition-all duration-300 hover:border-blue-300 dark:hover:border-slate-500 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-900/40 focus:bg-white dark:focus:bg-[#131b2e]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-[14px] bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-600/20 dark:shadow-blue-900/20 transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center"
          >
            {loading ? "Creating Account..." : "Create Account →"}
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col items-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}

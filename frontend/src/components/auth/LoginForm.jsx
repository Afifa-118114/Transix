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
        toast.success(`Welcome back, ${data.user.name || "traveler"}!`);
        navigate("/home");
      } else {
        setErrorMsg("Invalid response from server.");
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.code === "ERR_NETWORK"
          ? "Cannot connect to server. Please ensure backend is running."
          : "Sign in failed. Please check your credentials.");
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#f5f5f5] px-4 py-12 font-sans antialiased selection:bg-[#f4c5a8]/40 selection:text-[#0c0a09]">
      {/* Atmospheric Pastel Gradient Orbs (Tokens from design.md: peach, mint, lavender, sky) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 -right-20 h-[400px] w-[400px] rounded-full bg-[#f4c5a8] opacity-45 blur-[110px] transition-all duration-1000"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 -left-28 h-[380px] w-[380px] rounded-full bg-[#c8b8e0] opacity-40 blur-[110px] transition-all duration-1000"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 right-1/4 h-[390px] w-[390px] rounded-full bg-[#a7e5d3] opacity-45 blur-[120px] transition-all duration-1000"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1/3 -right-24 h-[320px] w-[320px] rounded-full bg-[#a8c8e8] opacity-35 blur-[95px] transition-all duration-1000"
      />

      {/* Main Sign In Card */}
      <div className="relative z-10 w-full max-w-[440px] rounded-[16px] border border-[#e7e5e4] bg-[#ffffff] p-8 sm:p-10 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
        {/* Editorial Header */}
        <div className="flex flex-col items-center text-center">

          <h1
            style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
            className="text-[32px] font-[300] leading-[1.13] tracking-[-0.32px] text-[#0c0a09]"
          >
            Welcome back
          </h1>

          <p className="mt-2.5 max-w-[320px] text-[15px] font-[400] leading-[1.47] tracking-[0.16px] text-[#777169]">
            Sign in to access your planned itineraries and intelligent journeys.
          </p>
        </div>

        {/* Validation / Error Banner */}
        {errorMsg && (
          <div className="mt-6 flex items-center rounded-lg border border-[#fca5a5] bg-[#fef2f2] px-3.5 py-2.5 text-[13px] text-[#dc2626]">
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          {/* Email Address */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="login-email"
              className="text-[13px] font-medium tracking-[0.15px] text-[#292524]"
            >
              Email address
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              value={form.email}
              placeholder="alex@domain.com"
              onChange={handleChange}
              autoComplete="email"
              required
              className="h-11 w-full rounded-[8px] border border-[#d6d3d1] bg-[#ffffff] px-4 text-[15px] text-[#0c0a09] placeholder-[#a8a29e] transition-colors focus:border-[#0c0a09] focus:outline-none"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="text-[13px] font-medium tracking-[0.15px] text-[#292524]"
              >
                Password
              </label>
            </div>
            <input
              id="login-password"
              name="password"
              type="password"
              value={form.password}
              placeholder="••••••••••••"
              onChange={handleChange}
              autoComplete="current-password"
              required
              className="h-11 w-full rounded-[8px] border border-[#d6d3d1] bg-[#ffffff] px-4 text-[15px] text-[#0c0a09] placeholder-[#a8a29e] transition-colors focus:border-[#0c0a09] focus:outline-none"
            />
          </div>

          {/* Primary CTA Button (Ink Pill) */}
          <button
            type="submit"
            disabled={loading}
            className="mt-3 flex h-10 w-full items-center justify-center rounded-full bg-[#292524] px-5 text-[15px] font-medium text-[#ffffff] transition-all hover:bg-[#0c0a09] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {/* Secondary Navigation */}
        <div className="mt-8 border-t border-[#f0efed] pt-6 text-center">
          <p className="text-[14px] font-[400] text-[#777169]">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-medium text-[#0c0a09] underline underline-offset-4 transition hover:text-[#292524]"
            >
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

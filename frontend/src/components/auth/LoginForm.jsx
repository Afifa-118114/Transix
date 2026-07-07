import { useState } from "react";
import { loginUser } from "../../api/authApi";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";

function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const data = await loginUser(form);

      login(data.user, data.token);

      navigate("/home");
    } catch (err) {
      alert(err.response?.data?.message || "Login Failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      {" "}
      <form
        onSubmit={handleSubmit}
        className="w-[400px] h-[250px] rounded-3xl border border-white/30 bg-gradient-to-br from-indigo-50 via-white to-blue-200 px-10 py-12 shadow-2xl backdrop-blur-lg flex flex-col gap-2"
      >
        <h1 className="mt-4 text-center text-2xl font-bold text-gray-800">
          Welcome Back to Transix
        </h1>

        <p className="mb-10 text-center text-blue-700">
          {" "}
          Sign in to continue your journey
        </p>

        <div className="flex flex-col items-center gap-3">
          <input
            name="email"
            type="email"
            placeholder="Email Address"
            onChange={handleChange}
            className="w-[300px] rounded-xl border border-gray-300 bg-white px-4 py-3 transition-all outline-none focus:border-[#5B4BFF] focus:ring-4 focus:ring-indigo-100"
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            onChange={handleChange}
            className="w-[300px] rounded-xl border border-gray-300 bg-white px-4 py-3 transition-all outline-none focus:border-[#5B4BFF] focus:ring-4 focus:ring-indigo-100"
          />

          <button className="mt-8 w-[300px] rounded-xl bg-[#5B4BFF] py-3 font-semibold text-white transition duration-300 hover:scale-[1.02] hover:bg-[#4A3EE6]">
            Login
          </button>
        </div>

        <p className="mt-7 text-center text-gray-600">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-semibold text-[#5B4BFF] hover:underline"
          >
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}

export default LoginForm;

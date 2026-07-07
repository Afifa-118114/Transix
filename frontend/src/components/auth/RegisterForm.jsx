import { useState } from "react";
import { registerUser } from "../../api/authApi";
import { useNavigate, Link } from "react-router-dom";

function RegisterForm() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
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
      await registerUser(form);

      alert("Registration Successful");

      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.message || "Registration Failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center  px-6">
      <form
        onSubmit={handleSubmit}
        className="h-[250px] w-[400px] rounded-2xl  border-white/30 bg-gradient-to-br from-indigo-50 via-white to-blue-200 p-10 shadow-2xl backdrop-blur-lg flex flex-col gap-2"
      >
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-800">
          Create your account
        </h1>

        <p className="mb-8 text-center text-blue-700">
          Start planning smarter trips
        </p>

        <div className="flex flex-col items-center gap-3">
          <input
            name="name"
            placeholder="Full Name"
            onChange={handleChange}
            className="w-[300px] rounded-xl border border-gray-300 bg-white px-4 py-3 transition-all outline-none focus:border-[#5B4BFF] focus:ring-4 focus:ring-indigo-100"
          />

          <input
            name="email"
            type="email"
            placeholder="Email Address"
            onChange={handleChange}
            className="w-[300px] rounded-xl border border-gray-300 bg-white px-4 py-3 transition-all outline-none focus:border-[#5B4BFF] focus:ring-4 focus:ring-indigo-100"
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            onChange={handleChange}
            className="w-[300px] rounded-xl border border-gray-300 bg-white px-4 py-3 transition-all outline-none focus:border-[#5B4BFF] focus:ring-4 focus:ring-indigo-100"
          />

          <button className="mt-8 w-[300px] rounded-xl bg-[#5B4BFF] py-3 font-semibold text-white transition duration-300 hover:scale-[1.02] hover:bg-[#4A3EE6]">
            Register
          </button>
        </div>

        <p className="mt-7 text-center text-gray-600">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-[#5B4BFF] hover:underline"
          >
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}

export default RegisterForm;

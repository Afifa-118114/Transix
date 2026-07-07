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
    <form
      onSubmit={handleSubmit}
      className="w-[420px] rounded-3xl bg-white p-8 shadow-xl"
    >
      <h1 className="mb-6 text-3xl font-bold">Create Account</h1>

      <input
        name="name"
        placeholder="Full Name"
        onChange={handleChange}
        className="mb-4 w-full rounded-xl border p-3"
      />

      <input
        name="email"
        placeholder="Email"
        onChange={handleChange}
        className="mb-4 w-full rounded-xl border p-3"
      />

      <input
        type="password"
        name="password"
        placeholder="Password"
        onChange={handleChange}
        className="mb-6 w-full rounded-xl border p-3"
      />

      <button className="w-full rounded-xl bg-[#5B4BFF] py-3 text-white">
        Register
      </button>

      <p className="mt-5 text-center">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-indigo-600">
          Login
        </Link>
      </p>
    </form>
  );
}

export default RegisterForm;

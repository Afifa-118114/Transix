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
    <form
      onSubmit={handleSubmit}
      className="w-[420px] rounded-3xl bg-white p-8 shadow-xl"
    >
      <h1 className="mb-6 text-3xl font-bold">Welcome Back</h1>

      <input
        name="email"
        type="email"
        placeholder="Email"
        onChange={handleChange}
        className="mb-4 w-full rounded-xl border p-3"
      />

      <input
        name="password"
        type="password"
        placeholder="Password"
        onChange={handleChange}
        className="mb-6 w-full rounded-xl border p-3"
      />

      <button className="w-full rounded-xl bg-[#5B4BFF] py-3 text-white">
        Login
      </button>

      <p className="mt-5 text-center">
        Don't have an account?{" "}
        <Link to="/register" className="font-semibold text-indigo-600">
          Register
        </Link>
      </p>
    </form>
  );
}

export default LoginForm;

import LoginForm from "../components/auth/LoginForm";

function Login() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f8faff] dark:bg-[#0b0f19] transition-colors duration-200">
      <LoginForm />
    </div>
  );
}

export default Login;


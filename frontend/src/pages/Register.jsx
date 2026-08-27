import RegisterForm from "../components/auth/RegisterForm";

function Register() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f8faff] dark:bg-[#0b0f19] transition-colors duration-200">
      <RegisterForm />
    </div>
  );
}

export default Register;


import { FiHome, FiBookmark, FiUser, FiMap, FiCompass, FiLayers } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import logo from "../../assets/logo/logo.png";

const menuItems = [
  {
    title: "Home",
    path: "/home",
    icon: <FiHome className="text-xl" />,
  },
  {
    title: "Builder",
    path: "/builder",
    icon: <FiLayers className="text-xl" />,
  },
  {
    title: "Journey",
    path: "/planner",
    icon: <FiCompass className="text-xl" />,
  },
  {
    title: "Map",
    path: "/map",
    icon: <FiMap className="text-xl" />,
  },
  {
    title: "Saved",
    path: "/saved",
    icon: <FiBookmark className="text-xl" />,
  },
  {
    title: "Profile",
    path: "/profile",
    icon: <FiUser className="text-xl" />,
  },
];

export default function Sidebar() {
  return (
    <aside className="sticky top-4 flex h-[calc(100vh-32px)] w-20 shrink-0 flex-col items-center justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] py-5 shadow-xs transition-colors">
      {/* Brand Logo */}
      <div className="flex flex-col items-center">
        <NavLink to="/home" className="flex flex-col items-center transition hover:opacity-80">
          <img src={logo} alt="Transix Logo" className="h-9 w-auto object-contain" />
          <span className="mt-1 text-[11px] font-extrabold tracking-tight text-slate-800 dark:text-slate-200">Transix</span>
        </NavLink>

        {/* Navigation Menu */}
        <nav className="mt-7 flex flex-col items-center gap-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.path}
              className={({ isActive }) =>
                `group relative flex h-13 w-14 flex-col items-center justify-center rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-indigo-50 font-bold text-indigo-600 shadow-xs ring-1 ring-indigo-200/50 dark:bg-indigo-950/70 dark:text-indigo-400 dark:ring-indigo-800/60"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-indigo-600 dark:bg-indigo-400" />
                  )}
                  <span className="transition-transform group-hover:scale-110">{item.icon}</span>
                  <span className="mt-1 text-[10px] font-semibold tracking-tight">{item.title}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom Footer Item */}
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-700 text-xs font-semibold">
        v1.0
      </div>
    </aside>
  );
}

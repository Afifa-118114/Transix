import { FiHome, FiBookmark, FiUser, FiMap, FiCompass } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import logo from "../../assets/logo/logo.png";

const menuItems = [
  {
    title: "Home",
    path: "/",
    icon: <FiHome />,
  },
  {
    title: "Journey",
    path: "/planner",
    icon: <FiCompass />,
  },
  {
    title: "Map",
    path: "/map",
    icon: <FiMap />,
  },
  {
    title: "Saved",
    path: "/saved",
    icon: <FiBookmark />,
  },
  {
    title: "Profile",
    path: "/profile",
    icon: <FiUser />,
  },
];

function Sidebar() {
  return (
    <aside className="m-4 flex h-[calc(100vh-32px)] w-28 flex-col items-center rounded-3xl border border-gray-200 bg-white px-3 py-6 shadow-sm">
      <div className="flex flex-col items-center">
        {/* Logo */}
        <div className="flex flex-col items-center">
          <img src={logo} alt="Logo" className="w-16 h-auto" />
          <h2 className="mt-1 font-bold text-gray-800">Transix</h2>
        </div>

        {/* Menu */}
        <div className="h-5"></div>
        <nav className="mt-8 flex flex-col items-center gap-4">
          {menuItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all duration-300

               ${
                 isActive
                   ? "relative text-[#5B4BFF] bg-[#edebfb]"
                   : "text-gray-500 hover:bg-[#f1eeff] hover:text-[#272751] hover:scale-103"
               }`
              }
            >
              <span className="text-2xl">{item.icon}</span>

              <span className="text-[11px] mt-1">{item.title}</span>
            </NavLink>
          ))}
        </nav>
        {/* Bottom */}
        <div className="mt-auto">
          <div className=" w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-3xl">
            ✈️
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;

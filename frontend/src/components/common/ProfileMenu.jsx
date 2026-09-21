import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { FiUser, FiBookmark, FiSettings, FiLogOut } from "react-icons/fi";

export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowLogoutConfirm(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initial = user?.name?.charAt(0).toUpperCase() || "U";

  return (
    <div className="relative flex w-full flex-col items-center" ref={menuRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setShowLogoutConfirm(false);
        }}
        className={`group flex h-13 w-14 flex-col items-center justify-center rounded-xl transition-all duration-200 ${
          isOpen
            ? "bg-slate-100 font-bold text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white"
        }`}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300 transition-transform group-hover:scale-110">
          {initial}
        </div>
        <span className="mt-1 text-[10px] font-semibold tracking-tight">Profile</span>
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute bottom-0 left-[calc(100%+16px)] z-50 w-56 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-[#131b2e]">
          {showLogoutConfirm ? (
            <div className="flex flex-col p-2">
              <h3 className="mb-1 text-sm font-bold text-slate-900 dark:text-white">
                Log out of Transix?
              </h3>
              <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                You'll need to sign in again to access your trips.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 rounded-xl bg-red-600 py-1.5 text-xs font-bold text-white transition hover:bg-red-700"
                >
                  Log out
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* User Header */}
              <div className="mb-2 flex items-center gap-3 border-b border-slate-100 p-2 pb-3 dark:border-slate-800">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-sm font-bold text-indigo-700 dark:text-indigo-300">
                  {initial}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate text-sm font-bold text-slate-900 dark:text-white">
                    {user?.name || "User"}
                  </span>
                  <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {user?.email || "user@example.com"}
                  </span>
                </div>
              </div>

              {/* Menu Items */}
              <div className="flex flex-col gap-1">
                <Link
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <FiUser className="text-base text-slate-400 dark:text-slate-500" />
                  My Profile
                </Link>
                <Link
                  to="/saved"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <FiBookmark className="text-base text-slate-400 dark:text-slate-500" />
                  My Trips
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <FiSettings className="text-base text-slate-400 dark:text-slate-500" />
                  Settings
                </Link>

                <div className="my-1 h-px w-full bg-slate-100 dark:bg-slate-800" />

                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <FiLogOut className="text-base text-red-500 dark:text-red-400" />
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

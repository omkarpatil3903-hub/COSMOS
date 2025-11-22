import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { Toaster } from "react-hot-toast";
import {
  FaTachometerAlt,
  FaTasks,
  FaProjectDiagram,
  FaCalendarAlt,
  FaChartBar,
  FaSignOutAlt,
  FaChevronLeft,
  FaUserTie,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import { useAuthContext } from "../context/useAuthContext";

// Reusable sidebar link component matching admin panel exactly
const SidebarLink = ({ to, icon, text, isCollapsed, onNavigate }) => {
  const baseClasses =
    `group flex items-center ${
      isCollapsed ? "justify-center px-2" : "gap-3 px-3"
    } rounded-lg border border-transparent py-2 text-sm font-medium transition-colors`;
  const activeClasses =
    "border-indigo-200 bg-indigo-50 text-indigo-700 shadow-soft";
  const inactiveClasses =
    "text-content-secondary hover:bg-surface-subtle hover:text-content-primary";

  return (
    <NavLink
      to={to}
      end={to === "/employee"}
      title={isCollapsed ? text : ""}
      className={({ isActive }) =>
        `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`
      }
      onClick={onNavigate}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 transition-colors duration-200 group-hover:bg-indigo-200">
        {icon}
      </span>
      {!isCollapsed && <span className="truncate">{text}</span>}
    </NavLink>
  );
};

function EmployeeLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useAuthContext();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  // Dynamic page title based on route
  useEffect(() => {
    const pathToTitle = {
      "/employee": "Dashboard - Employee Portal",
      "/employee/tasks": "My Tasks - Employee Portal",
      "/employee/projects": "My Projects - Employee Portal",
      "/employee/calendar": "Calendar - Employee Portal",
      "/employee/reports": "Reports - Employee Portal",
    };

    const title = pathToTitle[location.pathname] || "Employee Portal";
    document.title = title;
  }, [location.pathname]);

  const navigationItems = [
    {
      to: "/employee",
      text: "Dashboard",
      icon: <FaTachometerAlt className="h-4 w-4" aria-hidden="true" />,
    },
    {
      to: "/employee/tasks",
      text: "My Tasks",
      icon: <FaTasks className="h-4 w-4" aria-hidden="true" />,
    },
    {
      to: "/employee/projects",
      text: "Projects",
      icon: <FaProjectDiagram className="h-4 w-4" aria-hidden="true" />,
    },
    {
      to: "/employee/reports",
      text: "Reports",
      icon: <FaChartBar className="h-4 w-4" aria-hidden="true" />,
    },
    {
      to: "/employee/calendar",
      text: "Calendar",
      icon: <FaCalendarAlt className="h-4 w-4" aria-hidden="true" />,
    },
   
  ];

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const handleToggleSidebar = () => {
    setIsCollapsed((prev) => !prev);
  };

  const handleToggleMobileNav = () => {
    setIsMobileNavOpen((prev) => !prev);
  };

  const sidebarWidth = isCollapsed ? "lg:w-24" : "lg:w-72";
  const contentPadding = isCollapsed ? "lg:pl-24" : "lg:pl-72";

  return (
    <div className="flex min-h-screen bg-canvas text-content-primary">
      <a className="sr-only-focusable" href="#main-content">
        Skip to main content
      </a>
      <Toaster position="top-right" />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-surface shadow-card transition-transform duration-300 ease-out lg:inset-y-auto lg:top-0 lg:h-screen lg:translate-x-0 ${
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
        } ${sidebarWidth} ${isCollapsed ? "p-4" : "p-6"}`}
        aria-label="Primary"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 overflow-hidden rounded-full shadow-md ring-1 ring-indigo-500/20">
              {userData?.imageUrl && !avatarError ? (
                <img
                  src={userData.imageUrl}
                  alt="Avatar"
                  className="h-full w-full object-cover object-center transition-transform duration-200 hover:scale-105"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="h-full w-full rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                  {(userData?.name || userData?.clientName || userData?.email || "U")
                    .toString()
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}
            </span>

            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-sm font-medium text-content-tertiary truncate" title={userData?.name || "Employee"}>
                  {userData?.name || "Employee"}
                </p>
                <h2 className="text-lg font-semibold text-content-primary truncate">
                  Employee Portal
                </h2>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleToggleSidebar}
            className="hidden items-center justify-center rounded-full border border-subtle p-2 text-content-secondary transition hover:text-content-primary lg:flex"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <FaChevronLeft
              className={`h-4 w-4 transition-transform duration-300 ${
                isCollapsed ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            onClick={handleToggleMobileNav}
            className="flex items-center justify-center rounded-full border border-subtle p-2 text-content-secondary transition hover:text-content-primary lg:hidden"
            aria-label="Close navigation"
          >
            <FaTimes className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {navigationItems.map((item) => (
            <SidebarLink
              key={item.to}
              to={item.to}
              text={item.text}
              icon={item.icon}
              isCollapsed={isCollapsed}
              onNavigate={() => setIsMobileNavOpen(false)}
            />
          ))}
        </nav>

        <div className="mt-auto pt-8">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            title={isCollapsed ? "Logout" : ""}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <FaSignOutAlt className="h-4 w-4" aria-hidden="true" />
            </span>
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {isMobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={handleToggleMobileNav}
          aria-label="Close menu overlay"
        />
      )}

      <div
        className={`flex min-h-screen flex-1 flex-col transition-all duration-300 ${contentPadding}`}
      >
        <main
          id="main-content"
          className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8"
        >
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <button
              type="button"
              onClick={handleToggleMobileNav}
              className="flex items-center gap-2 rounded-full border border-subtle px-3 py-2 text-sm font-medium text-content-secondary transition hover:text-content-primary"
              aria-label="Open navigation"
            >
              <FaBars className="h-4 w-4" aria-hidden="true" />
              <span>Menu</span>
            </button>
          </div>

          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default EmployeeLayout;

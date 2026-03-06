import React, { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";

export default function Sidebar({ open = true, onClose = () => {} }) {
  const ref = useRef(null);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const v = localStorage.getItem("admin_sidebar_collapsed");
      return v === null ? false : v === "true";
    } catch {
      return false;
    }
  });

  // persist collapsed preference
  useEffect(() => {
    try {
      localStorage.setItem(
        "admin_sidebar_collapsed",
        collapsed ? "true" : "false",
      );
    } catch {
      // ignore storage errors
    }
  }, [collapsed]);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (!open) return;
      if (!ref.current) return;
      if (ref.current.contains(e.target)) return;

      const isDesktop = window.innerWidth >= 768;
      // On mobile close when clicking outside
      if (!isDesktop) onClose();
    }

    function handleKey(e) {
      if (e.key !== "Escape") return;
      const isDesktop = window.innerWidth >= 768;
      if (!isDesktop) onClose();
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose, collapsed]);

  // Handle expanding sidebar on click when collapsed
  const handleSidebarClick = (e) => {
    // Only expand if clicking on the sidebar itself, not on interactive elements
    if (collapsed && e.target === e.currentTarget) {
      setCollapsed(false);
    }
  };

  return (
    <aside
      ref={ref}
      onClick={handleSidebarClick}
      style={{
        pointerEvents: open ? "auto" : "none",
        visibility: open ? "visible" : "hidden",
      }}
      className={`fixed inset-y-0 left-0 bg-gray-800 text-white transform h-screen ${
        open ? "translate-x-0" : "-translate-x-full"
      } md:translate-x-0 md:visible md:pointer-events-auto ${collapsed ? "w-16" : "w-64"} transition-[width,transform] duration-300 z-40 md:z-auto md:static overflow-hidden flex flex-col`}
      aria-label="Sidebar navigation"
      aria-hidden={!open}
    >
      <div className="p-4 flex items-center justify-between">
        <h2
          className={`text-lg font-semibold transition-opacity ${collapsed ? "opacity-0" : "opacity-100"}`}
        >
          Admin
        </h2>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="md:hidden px-2 py-1 rounded hover:bg-gray-700"
          aria-label="Close sidebar"
        >
          ✕
        </button>
      </div>

      <nav className="mt-4 px-2 flex-1 overflow-y-auto">
        {[
          {
            to: "/admin",
            label: "Overview",
            icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
          },
          {
            to: "/admin/students",
            label: "Students",
            icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
          },
          {
            to: "/admin/student",
            label: "Student Detail",
            icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
          },
          {
            to: "/admin/lookups",
            label: "Lookups",
            icon: "M4 6h16M4 12h16M4 18h16",
          },
          {
            to: "/admin/settings",
            label: "Settings",
            icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
          },
        ].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={(e) => e.stopPropagation()}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded mb-1 transition-colors ${
                isActive ? "bg-gray-700" : "hover:bg-gray-700"
              }`
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="w-6 h-6 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d={item.icon}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span
              className={`transition-opacity whitespace-nowrap ${collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}
            >
              {item.label}
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto p-2 border-t border-gray-700">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCollapsed((c) => !c);
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-700 transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="w-6 h-6 flex items-center justify-center flex-shrink-0">
            {collapsed ? "»" : "«"}
          </span>
          <span
            className={`transition-opacity whitespace-nowrap ${collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}
          >
            Collapse
          </span>
        </button>
      </div>
    </aside>
  );
}

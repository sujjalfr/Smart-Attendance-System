import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

/**
 * RequireAdmin - wraps admin pages and ensures only authenticated admins can access.
 * Fast-path: sessionStorage flag "admin_authenticated" === "1"
 * Otherwise validates token stored in localStorage.admin_token against backend.
 */
export default function RequireAdmin({ children }) {
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Fast-path: session flag set by other flows (e.g. AttendancePage after successful PIN)
        if (sessionStorage.getItem("admin_authenticated") === "1") {
          if (mounted) setChecking(false);
          return;
        }

        const token = localStorage.getItem("admin_token");
        if (!token) {
          // no token -> redirect
          navigate("/", { replace: true });
          return;
        }

        const r = await fetch(`${API_BASE}/api/admin/auth/validate/`, {
          method: "GET",
          headers: { "X-Admin-Token": token },
        });

        if (!r.ok) {
          navigate("/", { replace: true });
          return;
        }
        const jd = await r.json();
        if (!jd.valid) {
          navigate("/", { replace: true });
          return;
        }

        // valid
        if (mounted) setChecking(false);
      } catch (e) {
        // treat any error as unauthorized to be safe
        navigate("/", { replace: true });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="p-4 bg-white rounded shadow text-sm">Checking admin access…</div>
      </div>
    );
  }

  return <>{children}</>;
}

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getStudents } from "../api/studentsCache";
import Sidebar from "../components/Admin/Sidebar";
import ChainedSelects from "../components/Admin/StudentManagement/ChainedSelects";
import { formatNPTOrDash, parseHourFromTimeString } from "../utils/helpers";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

const StatusBadge = ({ status }) => {
  const map = {
    absent: { text: "Absent", color: "#ef4444" },
    late: { text: "Late", color: "#f59e0b" },
    on_time: { text: "On time", color: "#10b981" },
  };
  const s = map[status] || { text: status, color: "#6b7280" };
  return (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: 999,
        background: s.color + "22",
        color: s.color,
        fontSize: 12,
      }}
    >
      {s.text}
    </span>
  );
};

const KpiCard = ({ title, value, delta, subtitle }) => (
  <div
    className="bg-white rounded-lg shadow-sm p-4 flex flex-col gap-1"
    style={{ minWidth: 180 }}
  >
    <div className="text-xs text-gray-500">{title}</div>
    <div className="text-2xl font-semibold">{value}</div>
    {delta !== undefined && (
      <div
        className={`text-xs ${delta >= 0 ? "text-green-600" : "text-red-600"}`}
      >
        {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}%
      </div>
    )}
    {subtitle && <div className="text-xs text-gray-400">{subtitle}</div>}
  </div>
);

const Sparkline = ({ points = [], labels = [] }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  if (!points.length) return <div className="h-12 bg-gray-50 rounded" />;
  const max = Math.max(...points, 1);
  const viewBoxWidth = 1000;
  const viewBoxHeight = 100;
  const step = viewBoxWidth / Math.max(1, points.length - 1);
  const pathData = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${i * step} ${viewBoxHeight - (p / max) * (viewBoxHeight * 0.8)}`,
    )
    .join(" ");
  const fillPath = `${pathData} L ${(points.length - 1) * step} ${viewBoxHeight} L 0 ${viewBoxHeight} Z`;
  
  const handleHover = (index, e) => {
    setHoveredIndex(index);
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    const x = (index / Math.max(1, points.length - 1)) * rect.width;
    const y = -10;
    setTooltipPos({ x, y });
  };

  return (
    <div className="w-full" style={{ height: "50px", position: "relative" }}>
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="w-full h-full"
        preserveAspectRatio="none"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id="sparkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#3b82f6", stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: "#3b82f6", stopOpacity: 0.05 }} />
          </linearGradient>
        </defs>
        <path d={fillPath} fill="url(#sparkGradient)" />
        <path
          d={pathData}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => {
          const x = i * step;
          const y = viewBoxHeight - (p / max) * (viewBoxHeight * 0.8);
          return (
            <g
              key={i}
              onMouseEnter={(e) => handleHover(i, e)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={x}
                cy={y}
                r="80"
                fill="transparent"
                style={{ pointerEvents: "auto" }}
              />
              <circle
                cx={x}
                cy={y}
                r={hoveredIndex === i ? "8" : "4"}
                fill={hoveredIndex === i ? "#1e40af" : "#3b82f6"}
                opacity={hoveredIndex === i ? "1" : "0.5"}
                style={{ transition: "all 0.2s ease", pointerEvents: "none" }}
              />
            </g>
          );
        })}
      </svg>
      {hoveredIndex !== null && (
        <div
          className="absolute bg-gray-900 text-white px-2 py-1 rounded text-xs font-semibold pointer-events-none"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            transform: "translate(-50%, -100%)",
            zIndex: 50,
            whiteSpace: "nowrap",
          }}
        >
          {labels[hoveredIndex] && <div className="text-gray-300">{labels[hoveredIndex]}</div>}
          <div>{points[hoveredIndex]} scans</div>
        </div>
      )}
    </div>
  );
};

export default function AdminDashboard() {
  const [range, setRange] = useState("7d");
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [search, setSearch] = useState("");
  const [showAbsentOnly, setShowAbsentOnly] = useState(false);
  const [showLateOnly, setShowLateOnly] = useState(false);
  const [filters, setFilters] = useState({
    deptId: "",
    batchId: "",
    classGroupId: "",
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [page, setPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState("");
  const todayISO = new Date().toISOString().slice(0,10);
  const perPage = 14;
  const navigate = useNavigate();

  // enforce admin auth (accept session flag as fast-path)
  useEffect(() => {
    (async () => {
      try {
        const sessionOk = sessionStorage.getItem("admin_authenticated") === "1";
        if (sessionOk) return;

        const token = localStorage.getItem("admin_token");
        if (!token) return navigate("/");
        const r = await fetch(`${API_BASE}/api/admin/auth/validate/`, {
          method: "GET",
          headers: { "X-Admin-Token": token },
        });
        if (!r.ok) return navigate("/");
        const jd = await r.json();
        if (!jd.valid) return navigate("/");
      } catch (e) {
        return navigate("/");
      }
    })();
  }, [navigate]);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  function logoutAdmin() {
    try {
      sessionStorage.removeItem("admin_authenticated");
      localStorage.removeItem("admin_token");
    } catch (e) {}
    navigate("/");
  }
  function confirmLogout() {
    setShowLogoutConfirm(true);
  }
  function performLogout() {
    logoutAdmin();
    setShowLogoutConfirm(false);
  }

  // Load students
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getStudents();
        if (!mounted) return;
        setStudents((Array.isArray(data) ? data : []).map((d) => ({ ...d, id: String(d.id) })));
      } catch (err) {
        console.error("Failed to load students (cache):", err);
        if (mounted) setStudents([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Load attendance statuses
  useEffect(() => {
    let mounted = true;
    axios
      .get(`${API_BASE}/api/attendanceStatus/list/`, {
        params: selectedDate ? { date: selectedDate } : {},
      })
      .then((r) => {
        if (!mounted) return;
        console.log("AttendanceStatusList response:", r.data);
        const data = (r.data.results || []).map((d) => ({
          ...d,
          id: String(d.id),
        }));
        setAttendance(data);
      })
      .catch((err) => {
        console.error("Failed to load attendance:", err);
        setAttendance([]);
      });
    return () => {
      mounted = false;
    };
  }, [selectedDate]);

  // Derive metrics from attendance
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      // If there's no attendance data, return zeroed metrics so UI shows 0s consistently.
      if (!attendance.length) {
        setMetrics({
          attendancePct: 0,
          attendanceDelta: 0,
          activeStudents: 0,
          absentCount: 0,
          lateCount: 0,
          onTimeCount: 0,
          scansPerHour: Array.from({ length: 24 }, () => 0),
        });
        setLastUpdated(new Date());
        setLoading(false);
        return;
      }

      const presentCount = attendance.filter((s) => s.alreadyMarked).length;
      const absentCount = attendance.filter((s) => !s.alreadyMarked).length;
      const lateCount = attendance.filter((s) => s.status === "late").length;
      const onTimeCount = attendance.filter(
        (s) => s.status === "on_time",
      ).length;
      const total = attendance.length || 1;
      const attendancePct = Math.round((presentCount / total) * 100);

      const scansPerHour = Array.from({ length: 24 }, (_, hour) =>
        attendance.filter((s) => {
          if (!s.time) return false;
          try {
            const h = parseHourFromTimeString(s.time);
            return h === hour;
          } catch {
            return false;
          }
        }).length,
      );

      setMetrics({
        attendancePct,
        attendanceDelta: attendancePct >= 90 ? 2.5 : -1.2,
        activeStudents: presentCount,
        absentCount,
        lateCount,
        onTimeCount,
        scansPerHour,
      });
      setLastUpdated(new Date());
      setLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [attendance, students, range]);

  const handleFilterChange = useCallback((values) => {
    setFilters(values);
  }, []);

  const filteredRows = useMemo(() => {
    // Use a Map for O(1) student lookups
    const studentMap = new Map();
    for (const st of students) {
      try {
        studentMap.set(String(st.roll_no), st);
      } catch (e) {}
    }

    return attendance
      .map((s) => {
        const student = studentMap.get(String(s.roll_no));
        return {
          ...s,
          displayName: student?.name || s.name || s.roll_no,
          roll: student?.roll_no || s.roll_no,
          className:
            student?.class_group?.name || student?.class || s.class || "—",
          departmentId: student?.department?.id,
          batchId: student?.batch?.id,
          classGroupId: student?.class_group?.id,
        };
      })
      .filter((row) => {
        if (showAbsentOnly && row.status !== "absent") return false;
        if (showLateOnly && row.status !== "late") return false;
        if (
          search &&
          !`${row.displayName} ${row.className}`
            .toLowerCase()
            .includes(search.toLowerCase())
        ) {
          return false;
        }
        if (
          filters.deptId &&
          String(row.departmentId || "") !== String(filters.deptId)
        )
          return false;
        if (
          filters.batchId &&
          String(row.batchId || "") !== String(filters.batchId)
        )
          return false;
        if (
          filters.classGroupId &&
          String(row.classGroupId || "") !== String(filters.classGroupId)
        )
          return false;
        return true;
      });
  }, [attendance, students, showAbsentOnly, showLateOnly, search, filters]);

  const totalPages = Math.max(1, Math.ceil((filteredRows.length || 0) / perPage));
  const pageData = filteredRows.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages, filteredRows.length]);

  const refresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      setLoading(false);
    }, 300);
  };

  return (
    <div className="flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Admin Dashboard</h1>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 px-4 py-2">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border rounded px-2 py-1"
                  placeholder={todayISO}
                />
                <button
                  onClick={() => setSelectedDate("")}
                  title="Clear date"
                  className="px-6 py-3 border rounded text-sm"
                >
                  Clear
                </button>
              </div>
              <button
                onClick={() => navigate("/home")}
                className="bg-gray-100 px-3 py-2 rounded border"
              >
                Admin HomePage
              </button>
              <button
                onClick={confirmLogout}
                className="bg-red-100 text-red-700 px-3 py-2 rounded border"
                title="Logout admin session"
              >
                Logout
              </button>
              {showLogoutConfirm && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                  <div className="bg-white p-4 rounded shadow w-80">
                    <div className="mb-3 font-medium">Confirm logout?</div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowLogoutConfirm(false)} className="px-3 py-1 border rounded">Cancel</button>
                      <button onClick={performLogout} className="px-3 py-1 bg-red-600 text-white rounded">Logout</button>
                    </div>
                  </div>
                </div>
              )}
              {/* <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="border rounded px-2 py-1"
              >
                <option value="24h">Last 24h</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
              <button onClick={refresh} className="px-3 py-2 border rounded">
                {loading ? "Refreshing…" : "Refresh"}
              </button> */}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-stretch">
            <KpiCard
              title="Attendance %"
              value={metrics ? `${metrics.attendancePct}%` : "—"}
              delta={metrics ? metrics.attendanceDelta : undefined}
              subtitle={loading ? "Loading…" : "Today vs yesterday"}
            />
            <KpiCard
              title="Active Students"
              value={metrics ? metrics.activeStudents : "—"}
            />
            <KpiCard
              title="Absent"
              value={metrics ? metrics.absentCount : "—"}
            />
            <KpiCard
              title="Late arrivals"
              value={metrics ? metrics.lateCount : "—"}
            />
            <div className="bg-white p-4 rounded-lg shadow-sm flex-1 min-w-[300px]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700">
                    Scans / hour (today)
                  </h3>
                  <div className="text-xl font-bold text-gray-900">
                    {metrics
                      ? metrics.scansPerHour.reduce((a, b) => a + b, 0)
                      : 0}
                  </div>
                </div>
                <div className="text-xs text-gray-500 text-right">
                  {lastUpdated
                    ? `Updated ${Math.round((Date.now() - lastUpdated.getTime()) / 60000)}m ago`
                    : ""}
                </div>
              </div>
              {metrics ? (
                <Sparkline 
                  points={metrics.scansPerHour.slice(6, 18)} 
                  labels={Array.from({ length: 12 }, (_, i) => {
                    const hour = i + 6;
                    return hour < 12 ? `${hour}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`;
                  })}
                />
              ) : (
                <div className="h-12 flex items-center justify-center text-xs text-gray-400">Loading chart…</div>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm space-y-3">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <ChainedSelects onChange={handleFilterChange} />
                <label className="text-sm text-gray-700 flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={showAbsentOnly}
                    onChange={(e) => {
                      setShowAbsentOnly(e.target.checked);
                      if (e.target.checked) setShowLateOnly(false);
                    }}
                  />
                  Show absent
                </label>
                <label className="text-sm text-gray-700 flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={showLateOnly}
                    onChange={(e) => {
                      setShowLateOnly(e.target.checked);
                      if (e.target.checked) setShowAbsentOnly(false);
                    }}
                  />
                  Show late
                </label>
                <input
                  placeholder="Search name or class"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border rounded px-3 py-2"
                />
              </div>
              <div className="text-xs text-gray-500">
                {lastUpdated
                  ? `Updated ${Math.round((Date.now() - lastUpdated.getTime()) / 60000)}m ago`
                  : "Loading…"}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="p-2">Student</th>
                    <th className="p-2">Roll</th>
                    <th className="p-2">Class</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Time In</th>
                    <th className="p-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-3 text-center text-gray-500">
                        No students match filters.
                      </td>
                    </tr>
                  )}
                  {pageData.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{row.displayName}</td>
                      <td className="p-2 font-mono text-sm">{row.roll}</td>
                      <td className="p-2">{row.className}</td>
                      <td className="p-2">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="p-2">{formatNPTOrDash(row.time)}</td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => navigate(`/admin/student/${row.roll}`)}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="text-sm text-gray-600">
                Showing {filteredRows.length ? `${(page - 1) * perPage + 1} - ${Math.min(page * perPage, filteredRows.length)} of ${filteredRows.length}` : "0 results"}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 border rounded"
                  disabled={page === 1}
                >
                  Prev
                </button>
                <div className="px-2 text-sm">
                  {page} / {totalPages}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 border rounded"
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

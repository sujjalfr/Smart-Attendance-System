import React, { useEffect, useState, useCallback, useMemo } from "react";
import ChainedSelects from "../components/Admin/StudentManagement/ChainedSelects";
import Sidebar from "../components/Admin/Sidebar";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { formatNPTOrDash, parseHourFromTimeString } from "../utils/helpers";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

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

const Sparkline = ({
  points = [5, 10, 8, 12, 6],
  width = 120,
  height = 30,
}) => {
  const max = Math.max(...points, 1);
  const step = width / Math.max(1, points.length - 1);
  const path = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${i * step} ${height - (p / max) * height}`,
    )
    .join(" ");
  return (
    <svg width={width} height={height}>
      <path
        d={path}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};

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

function HomePage() {
  const [metrics, setMetrics] = useState(null);
  const [students, setStudents] = useState([]);
  const [showAttendanceStatus, setShowAttendanceStatus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState("7d");
  const [lastUpdated, setLastUpdated] = useState(null);
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // enforce admin auth for HomePage
  useEffect(() => {
    (async () => {
      try {
        // Fast-path: allow session flag set by AttendancePage after successful PIN entry
        const sessionOk = sessionStorage.getItem("admin_authenticated") === "1";
        if (sessionOk) return;

        // Otherwise validate server token
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

  // filters
  const [showAbsentOnly, setShowAbsentOnly] = useState(false);
  const [showLateOnly, setShowLateOnly] = useState(false);
  const [search, setSearch] = useState("");

  // Add filters state
  const [filters, setFilters] = useState({ deptId: '', batchId: '', classGroupId: '' });

  // Load students
  useEffect(() => {
    let mounted = true;
    console.log(`Loading students from: ${API_BASE}/api/students/?page_size=1000`);
    axios
      .get(`${API_BASE}/api/students/?page_size=1000`)
      .then((r) => {
        if (!mounted) return;
        console.log("Students loaded:", r.data);
        const data = r.data.results || r.data || [];
        setStudents(
          (Array.isArray(data) ? data : []).map((d) => ({ ...d, id: String(d.id) })),
        );
      })
      .catch((err) => {
        console.error("Failed to load students:", err);
        setStudents([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Load attendance statuses
  useEffect(() => {
    let mounted = true;
    let timerId = null;

    const fetchAttendance = async () => {
      try {
        const r = await axios.get(`${API_BASE}/api/attendanceStatus/list/`);
        if (!mounted) return;
        console.log("AttendanceStatusList response:", r.data);
        const data = (r.data.results || []).map((d) => ({ ...d, id: String(d.id) }));
        setShowAttendanceStatus(data);
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Failed to fetch attendance status:", err);
        if (mounted) setShowAttendanceStatus([]);
      }
    };

    // Initial fetch
    fetchAttendance();
    // Poll every 5 seconds so HomePage stays in sync with incoming scans
    timerId = setInterval(fetchAttendance, 5000);

    return () => {
      mounted = false;
      if (timerId) clearInterval(timerId);
    };
  }, []);

  // Derive metrics from attendance data
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      console.log("Calculating metrics...", { 
        attendanceLength: showAttendanceStatus.length, 
        studentsLength: students.length 
      });
      
      if (!showAttendanceStatus.length) {
        console.log("No attendance data");
        setMetrics(null);
        setLoading(false);
        return;
      }

      const presentCount = showAttendanceStatus.filter((s) => s.alreadyMarked).length;
      const absentCount = showAttendanceStatus.filter((s) => !s.alreadyMarked).length;
      const lateCount = showAttendanceStatus.filter((s) => s.status === "late").length;
      const onTimeCount = showAttendanceStatus.filter(
        (s) => s.status === "on_time",
      ).length;
      const total = showAttendanceStatus.length || 1;
      const attendancePct = Math.round((presentCount / total) * 100);

      const scansPerHour = Array.from({ length: 24 }, (_, hour) =>
        showAttendanceStatus.filter((s) => {
          if (!s.time) return false;
          try {
            const h = parseHourFromTimeString(s.time);
            return h === hour;
          } catch {
            return false;
          }
        }).length,
      );

      const calculatedMetrics = {
        attendancePct,
        attendanceDelta: attendancePct >= 90 ? 2.5 : -1.2,
        activeStudents: presentCount,
        totalStudents: total,
        absentCount,
        lateCount,
        onTimeCount,
        scansPerHour,
      };

      console.log("Metrics calculated:", calculatedMetrics);
      setMetrics(calculatedMetrics);
      setLastUpdated(new Date());
      setLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [showAttendanceStatus]);

  const handleFilterChange = useCallback((values) => {
    setFilters(values);
  }, []);

  const filteredRows = useMemo(() => {
    return showAttendanceStatus
      .map((s) => {
        const student = students.find((st) => st.roll_no === s.roll_no);
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
  }, [showAttendanceStatus, students, showAbsentOnly, showLateOnly, search, filters]);

  const refresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      setLoading(false);
    }, 300);
  };

  function performLogout() {
    try {
      sessionStorage.removeItem("admin_authenticated");
      localStorage.removeItem("admin_token");
    } catch (e) {}
    setShowLogoutConfirm(false);
    navigate("/");
  }

  return (
    <div className="flex">
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Admin HomePage</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/admin")}
              className="bg-gray-100 px-3 py-2 rounded border"
            >
              Admin Dashboard
            </button>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="bg-red-100 text-red-700 px-3 py-2 rounded border"
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
            subtitle={loading ? "Loading…" : "Today"}
          />
          <KpiCard
            title="Active Students"
            value={metrics ? metrics.activeStudents : "—"}
            subtitle={metrics ? `of ${metrics.totalStudents}` : "—"}
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
              <Sparkline points={metrics.scansPerHour.slice(6, 18)} width={220} height={40} />
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
                  <th className="p-2">Class</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Time In</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-3 text-center text-gray-500">
                      No students match filters.
                    </td>
                  </tr>
                )}
                {filteredRows.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{row.displayName}</td>
                    <td className="p-2">{row.className}</td>
                    <td className="p-2">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="p-2">{formatNPTOrDash(row.time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import AddTeacher from "./AddTeacher";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

function StatusBadge({ status }) {
  const map = {
    absent: "bg-red-50 text-red-700",
    late: "bg-yellow-50 text-yellow-700",
    on_time: "bg-green-50 text-green-700",
  };
  const text = (status || "absent").replace("_", " ");
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${map[status] || "bg-gray-100 text-gray-700"}`}>
      {text}
    </span>
  );
}

export default function ManageTeacher() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Add teacher is a separate page now
  const [page, setPage] = useState(1);
  const perPage = 15;

  useEffect(() => {
    let mounted = true;
    async function loadTeachers() {
      setLoading(true);
      setError("");
      try {
        const r = await axios.get(`${API_BASE}/api/teachers/`);
        if (!mounted) return;
        const data = r?.data?.results || r?.data || [];
        setTeachers(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!mounted) return;
        console.error("Failed to load teachers", e);
        setTeachers([]);
        setError(e?.response?.data?.detail || e?.message || "Failed to load teachers");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadTeachers();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadStatuses() {
      try {
        const r = await axios.get(`${API_BASE}/api/teacher-attendance-status/list/`, {
          params: selectedDate ? { date: selectedDate } : {},
        });
        if (!mounted) return;
        setStatuses(r?.data?.results || []);
      } catch (e) {
        if (!mounted) return;
        console.error("Failed to load teacher attendance statuses", e);
        setStatuses([]);
      }
    }
    loadStatuses();
    return () => {
      mounted = false;
    };
  }, [selectedDate]);

  const rows = useMemo(() => {
    const statusMap = new Map(statuses.map((s) => [String(s.employee_id), s]));
    const q = query.trim().toLowerCase();
    return teachers
      .map((t) => {
        const s = statusMap.get(String(t.employee_id)) || null;
        return {
          ...t,
          status: s?.status || "absent",
          time: s?.time || null,
          alreadyMarked: !!s?.alreadyMarked,
          department_name:
            typeof t.department === "object"
              ? t.department?.name
              : s?.department || t.department || "—",
        };
      })
      .filter((t) => {
        if (!q) return true;
        return (
          String(t.employee_id || "").toLowerCase().includes(q) ||
          String(t.name || "").toLowerCase().includes(q) ||
          String(t.email || "").toLowerCase().includes(q) ||
          String(t.department_name || "").toLowerCase().includes(q)
        );
      });
  }, [teachers, statuses, query]);

  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const pageRows = rows.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    setPage(1);
  }, [query, selectedDate]);

  return (
    <div className="max-w-full mx-0">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-2xl font-semibold">Teacher Attendance</h2>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border px-3 py-2 rounded"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by id, name, email, department"
            className="border px-3 py-2 rounded"
          />
          <button
            onClick={() => navigate('/admin/teachers/add')}
            className="px-3 py-2 bg-blue-600 text-white rounded"
          >
            Add Teacher
          </button>
        </div>
      </div>

      {/* Add teacher moved to separate page: /admin/teachers/add */}

      {/* Editing is available on the teacher detail page only. */}

      {error && <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>}

      <div className="bg-white shadow rounded overflow-hidden">
        <table className="w-full table-auto text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Employee ID</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Department</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Time</th>
              <th className="p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">Loading teachers...</td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">No teachers found</td>
              </tr>
            ) : (
              pageRows.map((t) => (
                <tr key={t.id} className="border-t hover:bg-gray-50">
                  <td className="p-2 font-mono">{t.employee_id}</td>
                  <td className="p-2">{t.name}</td>
                  <td className="p-2">{t.email || "—"}</td>
                  <td className="p-2">{t.department_name || "—"}</td>
                  <td className="p-2"><StatusBadge status={t.status} /></td>
                  <td className="p-2">{t.time ? String(t.time).slice(0, 5) : "—"}</td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => navigate(`/admin/teacher/${encodeURIComponent(t.employee_id)}`)}
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">Showing {loading ? 0 : rows.length} result(s)</div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="px-3 py-1 border rounded"
          >
            Prev
          </button>
          <div className="text-sm">{page} / {totalPages}</div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="px-3 py-1 border rounded"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

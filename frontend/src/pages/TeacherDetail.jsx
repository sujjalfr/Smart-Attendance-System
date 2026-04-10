import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Sidebar from "../components/Admin/Sidebar";
import AddTeacher from "../components/Admin/TeacherManagement/AddTeacher";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

function StatusBadge({ status }) {
  const s = String(status || "absent").toLowerCase();
  const map = {
    absent: "bg-red-50 text-red-700",
    late: "bg-yellow-50 text-yellow-700",
    on_time: "bg-green-50 text-green-700",
  };
  return <span className={`px-2 py-1 rounded text-xs font-medium ${map[s] || "bg-gray-100 text-gray-700"}`}>{s.replace("_", " ")}</span>;
}

function formatTime(value) {
  if (!value) return "";
  const raw = String(value);
  if (raw.includes("T")) return (raw.split("T")[1] || "").slice(0, 5);
  return raw.slice(0, 5);
}

export default function TeacherDetail() {
  const { employeeId } = useParams();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [teacher, setTeacher] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [error, setError] = useState("");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [editingAttendanceId, setEditingAttendanceId] = useState(null);
  const [editingTime, setEditingTime] = useState("");
  const [editError, setEditError] = useState("");
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    async function loadTeacherAndToday() {
      if (!employeeId) return;
      setLoading(true);
      setError("");
      try {
        const [tr, ar] = await Promise.all([
          axios.get(`${API_BASE}/api/teachers/`),
          axios.get(`${API_BASE}/api/teacher-attendance-status/list/`).catch(() => ({ data: { results: [] } })),
        ]);

        const teachers = tr?.data?.results || tr?.data || [];
        const found = (Array.isArray(teachers) ? teachers : []).find(
          (t) => String(t.employee_id).trim() === String(employeeId).trim(),
        );

        if (!found) {
          setTeacher(null);
          setTodayAttendance(null);
          setError(`Teacher with employee id "${employeeId}" not found.`);
          return;
        }

        setTeacher(found);

        const todayList = ar?.data?.results || [];
        const today = todayList.find((x) => String(x.employee_id).trim() === String(employeeId).trim()) || null;
        setTodayAttendance(today);
      } catch (e) {
        console.error("Failed to load teacher", e);
        setTeacher(null);
        setTodayAttendance(null);
        setError(e?.response?.data?.detail || e?.message || "Failed to load teacher data");
      } finally {
        setLoading(false);
      }
    }

    loadTeacherAndToday();
  }, [employeeId]);

  useEffect(() => {
    async function loadAttendanceDetails() {
      if (!employeeId) return;
      setAttendanceLoading(true);
      try {
        const params = new URLSearchParams();
        if (dateFrom) params.append("date_from", dateFrom);
        if (dateTo) params.append("date_to", dateTo);
        const url = `${API_BASE}/api/teacher/${encodeURIComponent(employeeId)}/attendance/?${params.toString()}`;
        const r = await axios.get(url);
        setDetails(r.data || null);
      } catch (e) {
        console.error("Failed to load teacher attendance details", e);
        setDetails(null);
      } finally {
        setAttendanceLoading(false);
      }
    }

    loadAttendanceDetails();
  }, [employeeId, dateFrom, dateTo]);

  async function saveAttendanceTime() {
    if (!editingAttendanceId) {
      setEditError("No attendance record selected");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(editingTime)) {
      setEditError("Time must be HH:MM");
      return;
    }

    try {
      setEditError("");
      const payloadTime = `${editingTime}:00`;
      const r = await axios.patch(`${API_BASE}/api/teacher-attendance/${editingAttendanceId}/`, {
        time: payloadTime,
        alreadyMarked: true,
      });
      const updatedTime = r?.data?.time || payloadTime;
      const updatedStatus = r?.data?.status || "on_time";

      setDetails((prev) => {
        if (!prev || !Array.isArray(prev.records)) return prev;
        return {
          ...prev,
          records: prev.records.map((row) =>
            String(row.id || row.attendanceId) === String(editingAttendanceId)
              ? { ...row, time: updatedTime, status: updatedStatus }
              : row,
          ),
        };
      });

      setTodayAttendance((prev) =>
        prev && String(prev.id) === String(editingAttendanceId)
          ? { ...prev, time: updatedTime, status: updatedStatus, alreadyMarked: true }
          : prev,
      );

      setEditingAttendanceId(null);
      setEditingTime("");
      setEditError("");
    } catch (e) {
      console.error("Teacher attendance update failed", e);
      setEditError(e?.response?.data?.detail || e?.message || "Failed to update attendance");
    }
  }

  async function updateAttendanceStatus(attId, status) {
    if (!attId) return;
    try {
      setEditError("");
      const payload = { status };
      // For absent/leave, ensure alreadyMarked is set appropriately
      if (status === 'absent' || status === 'leave') payload.alreadyMarked = true;
      const r = await axios.patch(`${API_BASE}/api/teacher-attendance/${attId}/`, payload);
      const updated = r?.data || {};

      setDetails((prev) => {
        if (!prev || !Array.isArray(prev.records)) return prev;
        return {
          ...prev,
          records: prev.records.map((row) =>
            String(row.id || row.attendanceId) === String(attId)
              ? { ...row, time: updated.time || null, status: updated.status }
              : row,
          ),
        };
      });

      setTodayAttendance((prev) =>
        prev && String(prev.id) === String(attId)
          ? { ...prev, time: updated.time || null, status: updated.status, alreadyMarked: updated.alreadyMarked ?? true }
          : prev,
      );
    } catch (e) {
      console.error('Failed to update status', e);
      setEditError(e?.response?.data?.detail || e?.message || 'Failed to update');
    }
  }

  const stats = useMemo(() => {
    if (!details) {
      return { present_days: 0, absent_days: 0, on_time_days: 0, late_days: 0, total_days: 0 };
    }
    return {
      present_days: details.present_days || 0,
      absent_days: details.absent_days || 0,
      on_time_days: details.on_time_days || 0,
      late_days: details.late_days || 0,
      total_days: details.total_days || 0,
    };
  }, [details]);

  return (
    <div className="flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 p-6 bg-gray-50 min-h-screen">
        <div className="max-w-full mx-0 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Teacher Detail</h1>
            <div className="flex gap-2">
              <button onClick={() => navigate("/admin/teachers")} className="px-3 py-2 border rounded hover:bg-gray-100">Teachers</button>
              <button onClick={() => setShowEdit((s) => !s)} className="px-3 py-2 border rounded hover:bg-gray-100">{showEdit ? 'Close Edit' : 'Edit Profile'}</button>
              <button onClick={() => navigate(-1)} className="px-3 py-2 border rounded hover:bg-gray-100">Back</button>
            </div>
            </div>

          {loading ? (
            <div className="bg-white p-4 rounded shadow text-sm text-gray-500">Loading teacher...</div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded">{error}</div>
          ) : teacher ? (
            <>
              <div className="bg-white p-4 rounded shadow">
                {showEdit ? (
                  <div>
                    <h3 className="font-semibold mb-2">Edit Teacher</h3>
                    <div>
                      <AddTeacher
                        isEdit={true}
                        initial={teacher}
                        onCancel={() => setShowEdit(false)}
                        onUpdated={(t) => {
                          setShowEdit(false);
                          if (t) setTeacher(t);
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Employee ID</div>
                    <div className="font-mono">{teacher.employee_id}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Name</div>
                    <div>{teacher.name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Email</div>
                    <div>{teacher.email || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Phone</div>
                    <div>{teacher.phone || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Department</div>
                    <div>{typeof teacher.department === "object" ? teacher.department?.name : teacher.department || todayAttendance?.department || "—"}</div>
                  </div>
                  </div>
                )}
              </div>

              <div className="bg-white p-4 rounded shadow">
                <h2 className="font-semibold mb-3">Today</h2>
                  {todayAttendance ? (
                    <div>
                      {String(editingAttendanceId) === String(todayAttendance.id) ? (
                        <div className="flex items-center gap-3 flex-wrap">
                          <input
                            type="time"
                            value={editingTime}
                            onChange={(e) => setEditingTime(e.target.value)}
                            className="border px-2 py-1 rounded"
                          />
                          <button onClick={saveAttendanceTime} className="px-2 py-1 bg-blue-600 text-white rounded">Save</button>
                          <button
                            onClick={() => {
                              setEditingAttendanceId(null);
                              setEditingTime("");
                              setEditError("");
                            }}
                            className="px-2 py-1 border rounded"
                          >
                            Cancel
                          </button>
                          {editError && <div className="text-sm text-red-600">{editError}</div>}
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 flex-wrap">
                          <StatusBadge status={todayAttendance.status} />
                          <div className="text-sm">Time: {todayAttendance.time ? formatTime(todayAttendance.time) : "—"}</div>
                          <div className="text-sm">Marked: {todayAttendance.alreadyMarked ? "Yes" : "No"}</div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                // start editing today's time
                                setEditingAttendanceId(todayAttendance.id);
                                setEditingTime(todayAttendance.time ? formatTime(todayAttendance.time) : "");
                                setEditError("");
                              }}
                              className="px-2 py-1 border rounded text-xs"
                            >
                              Edit Time
                            </button>
                            <button
                              onClick={() => updateAttendanceStatus(todayAttendance.id, 'absent')}
                              className="px-2 py-1 border rounded text-xs text-red-600"
                            >
                              Mark Absent
                            </button>
                            <button
                              onClick={() => updateAttendanceStatus(todayAttendance.id, 'leave')}
                              className="px-2 py-1 border rounded text-xs text-yellow-600"
                            >
                              Mark Leave
                            </button>
                            <button
                              onClick={() => {
                                // mark present now by setting time to current HH:MM and saving
                                const now = new Date();
                                const hh = String(now.getHours()).padStart(2, '0');
                                const mm = String(now.getMinutes()).padStart(2, '0');
                                setEditingAttendanceId(todayAttendance.id);
                                setEditingTime(`${hh}:${mm}`);
                                setTimeout(() => saveAttendanceTime(), 50);
                              }}
                              className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                            >
                              Mark Present (now)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No attendance data for today</div>
                  )}
              </div>

              <div className="bg-white p-4 rounded shadow">
                <h2 className="font-semibold mb-3">Attendance Summary</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                  <div className="p-3 rounded bg-gray-50"><div className="text-gray-500 text-xs">Present</div><div className="font-semibold">{stats.present_days}</div></div>
                  <div className="p-3 rounded bg-gray-50"><div className="text-gray-500 text-xs">Absent</div><div className="font-semibold">{stats.absent_days}</div></div>
                  <div className="p-3 rounded bg-gray-50"><div className="text-gray-500 text-xs">On Time</div><div className="font-semibold">{stats.on_time_days}</div></div>
                  <div className="p-3 rounded bg-gray-50"><div className="text-gray-500 text-xs">Late</div><div className="font-semibold">{stats.late_days}</div></div>
                  <div className="p-3 rounded bg-gray-50"><div className="text-gray-500 text-xs">Total Days</div><div className="font-semibold">{stats.total_days}</div></div>
                </div>
              </div>

              <div className="bg-white p-4 rounded shadow">
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <h2 className="font-semibold">Attendance Records</h2>
                  <div className="flex items-center gap-2">
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border px-2 py-1 rounded" />
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border px-2 py-1 rounded" />
                  </div>
                </div>

                {attendanceLoading ? (
                  <div className="text-sm text-gray-500">Loading records...</div>
                ) : !details?.records?.length ? (
                  <div className="text-sm text-gray-500">No records found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-2">Date</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-left p-2">Time</th>
                          <th className="text-left p-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {details.records.map((r) => {
                          const rid = r.id || r.attendanceId;
                          const editing = String(editingAttendanceId) === String(rid);
                          return (
                            <tr key={rid} className="border-t">
                              <td className="p-2">{r.date}</td>
                              <td className="p-2"><StatusBadge status={r.status} /></td>
                              <td className="p-2">
                                {editing ? (
                                  <input
                                    type="time"
                                    value={editingTime}
                                    onChange={(e) => setEditingTime(e.target.value)}
                                    className="border px-2 py-1 rounded"
                                  />
                                ) : (
                                  formatTime(r.time) || "—"
                                )}
                              </td>
                              <td className="p-2">
                                {editing ? (
                                  <div className="flex items-center gap-2">
                                    <button onClick={saveAttendanceTime} className="px-2 py-1 bg-blue-600 text-white rounded">Save</button>
                                    <button
                                      onClick={() => {
                                        setEditingAttendanceId(null);
                                        setEditingTime("");
                                        setEditError("");
                                      }}
                                      className="px-2 py-1 border rounded"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => {
                                        setEditingAttendanceId(rid);
                                        setEditingTime(formatTime(r.time));
                                        setEditError("");
                                      }}
                                      className="text-blue-600 hover:underline"
                                    >
                                      Edit Time
                                    </button>
                                    <button
                                      onClick={() => updateAttendanceStatus(rid, 'absent')}
                                      className="text-red-600 hover:underline"
                                    >
                                      Mark Absent
                                    </button>
                                    <button
                                      onClick={() => updateAttendanceStatus(rid, 'leave')}
                                      className="text-yellow-600 hover:underline"
                                    >
                                      Mark Leave
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {editError && <div className="mt-3 text-sm text-red-700 bg-red-50 p-2 rounded">{editError}</div>}
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}

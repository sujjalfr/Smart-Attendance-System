import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Sidebar from "../components/Admin/Sidebar";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
// Threshold for being considered on-time (HH:MM). Adjust as needed.
const LATE_THRESHOLD = "09:15";

function formatDate(date) {
  if (!date) return "";
  try {
    return new Date(date).toLocaleDateString("en-GB");
  } catch {
    return date;
  }
}

function formatTimeForDisplay(value) {
  if (!value) return "—";
  // value may be ISO (2026-01-26T09:15:30) or time-only (09:15:30)
  try {
    if (String(value).includes("T")) {
      const timePart = String(value).split("T")[1] || "";
      return timePart.slice(0, 5);
    }
    // maybe "09:15:30" or "09:15"
    const parts = String(value).split(":");
    if (parts.length >= 2)
      return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
    return value;
  } catch {
    return value;
  }
}

function computeStatusFromTime(hhmm) {
  // Determine attendance status from time string (HH:MM).
  // Returns 'absent' | 'on_time' | 'late'
  if (!hhmm) return "absent";
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return "absent";
  const [h1, m1] = hhmm.split(":").map((v) => Number(v));
  const [h2, m2] = String(LATE_THRESHOLD)
    .split(":")
    .map((v) => Number(v));
  if (
    Number.isNaN(h1) ||
    Number.isNaN(m1) ||
    Number.isNaN(h2) ||
    Number.isNaN(m2)
  ) {
    return "absent";
  }
  if (h1 < h2 || (h1 === h2 && m1 <= m2)) return "on_time";
  return "late";
}

export default function StudentDetail() {
  const { rollNo } = useParams();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);

  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState(null); // today's attendance summary object
  const [error, setError] = useState("");

  const [inputRoll, setInputRoll] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [attForm, setAttForm] = useState(null); // used while editing today's attendance

  // Lightbox state for clicking images (profile / QR)
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const openLightbox = (src) => {
    if (!src) return;
    setLightboxSrc(src);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxSrc(null);
  };

  // Close lightbox when Escape is pressed
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && lightboxOpen) closeLightbox();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen]);

  const [allDepartments, setAllDepartments] = useState([]);
  const [allBatches, setAllBatches] = useState([]);
  const [allClassGroups, setAllClassGroups] = useState([]);
  const [deptId, setDeptId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [classGroupId, setClassGroupId] = useState("");

  const [attendanceDetails, setAttendanceDetails] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Editing a specific historical attendance record
  const [editingAttendanceId, setEditingAttendanceId] = useState(null);
  const [editingTime, setEditingTime] = useState(""); // HH:MM
  const [editError, setEditError] = useState("");

  // --- Load student and today's attendance summary ---
  useEffect(() => {
    async function load() {
      if (!rollNo) return;
      setLoading(true);
      setError("");
      try {
        console.log(
          `Fetching students from: ${API_BASE}/api/students/?page_size=1000`,
        );
        const [sr, ar] = await Promise.all([
          axios.get(`${API_BASE}/api/students/?page_size=1000`),
          axios.get(`${API_BASE}/api/attendanceStatus/list/`).catch((e) => {
            console.warn("AttendanceStatusList failed, continuing anyway:", e);
            return { data: { results: [] } };
          }),
        ]);

        console.log("Students response:", sr.data);
        console.log("Attendance response:", ar.data);

        // Handle both paginated and non-paginated responses
        const students = sr?.data?.results || sr?.data || [];
        console.log(`Total students fetched: ${students.length}`);
        console.log(
          "Student roll numbers:",
          students.map((s) => s.roll_no),
        );

        const found = students.find(
          (s) => String(s.roll_no).trim() === String(rollNo).trim(),
        );

        if (!found) {
          console.log(
            `Student with rollNo "${rollNo}" not found in:`,
            students.map((s) => `"${s.roll_no}"`),
          );
          setError(
            `Student with roll number "${rollNo}" not found. Available: ${students
              .slice(0, 5)
              .map((s) => s.roll_no)
              .join(", ")}${students.length > 5 ? "..." : ""}`,
          );
          setStudent(null);
          setAttendance(null);
        } else {
          console.log("Student found:", found);
          setStudent(found);
          const allAtt = ar?.data?.results || [];
          const todayAtt =
            allAtt.find(
              (a) => String(a.roll_no).trim() === String(rollNo).trim(),
            ) || null;
          setAttendance(todayAtt);
          setError("");
        }
      } catch (e) {
        console.error("Failed to load student/attendance data:", e);
        const errorMsg =
          e?.response?.data?.error ||
          e?.response?.data?.detail ||
          e?.message ||
          "Failed to load student data. Please check server connection.";
        setError(`Error: ${errorMsg}`);
        setStudent(null);
        setAttendance(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [rollNo]);

  // --- Attendance details (records) with optional date filter ---
  useEffect(() => {
    async function loadAttendanceDetails() {
      if (!rollNo) return;
      setAttendanceLoading(true);
      try {
        const params = new URLSearchParams();
        if (dateFrom) params.append("date_from", dateFrom);
        if (dateTo) params.append("date_to", dateTo);
        const url = `${API_BASE}/api/student/${rollNo}/attendance/?${params.toString()}`;
        const resp = await axios.get(url);
        setAttendanceDetails(resp.data);
      } catch (e) {
        console.error("Failed to load attendance details:", e);
        setAttendanceDetails(null);
      } finally {
        setAttendanceLoading(false);
      }
    }

    loadAttendanceDetails();
  }, [rollNo, dateFrom, dateTo]);

  // --- Populate attForm when editing today's attendance ---
  useEffect(() => {
    if (attendance && isEditing) {
      setAttForm({
        status: attendance.status || "absent",
        // Normalize to HH:MM for time input if possible
        time: attendance.time ? formatTimeForDisplay(attendance.time) : "",
        alreadyMarked: !!attendance.alreadyMarked,
        class: attendance.class || "",
      });
    } else if (!isEditing) {
      setAttForm(null);
    }
  }, [attendance, isEditing]);

  // --- Lookups ---
  useEffect(() => {
    let mounted = true;
    async function loadLookups() {
      try {
        const [deps, batches, classes] = await Promise.all([
          axios.get(`${API_BASE}/api/departments/`).catch(() => ({ data: [] })),
          axios.get(`${API_BASE}/api/batches/`).catch(() => ({ data: [] })),
          axios.get(`${API_BASE}/api/classgroups/`).catch(() => ({ data: [] })),
        ]);
        if (!mounted) return;
        setAllDepartments(
          (deps.data || []).map((d) => ({ ...d, id: String(d.id) })),
        );
        setAllBatches(
          (batches.data || []).map((b) => ({ ...b, id: String(b.id) })),
        );
        setAllClassGroups(
          (classes.data || []).map((c) => ({
            ...c,
            id: String(c.id),
            department_id: String(c.department_id || ""),
            batch_id: String(c.batch_id || ""),
          })),
        );
      } catch {
        if (!mounted) return;
        setAllDepartments([]);
        setAllBatches([]);
        setAllClassGroups([]);
      }
    }
    loadLookups();
    return () => {
      mounted = false;
    };
  }, []);

  // sync selected ids
  useEffect(() => {
    if (!student) return;
    setDeptId(student.department?.id ? String(student.department.id) : "");
    setBatchId(student.batch?.id ? String(student.batch.id) : "");
    setClassGroupId(
      student.class_group?.id ? String(student.class_group.id) : "",
    );
  }, [student]);

  const filteredBatches = useMemo(() => {
    if (!deptId) return allBatches;
    const classesInDept = allClassGroups.filter(
      (c) => String(c.department_id) === String(deptId),
    );
    const batchIds = new Set(
      classesInDept.map((c) => c.batch_id).filter(Boolean),
    );
    return allBatches.filter((b) => batchIds.has(String(b.id)));
  }, [deptId, allBatches, allClassGroups]);

  const filteredClassGroups = useMemo(() => {
    let filtered = allClassGroups;
    if (deptId)
      filtered = filtered.filter(
        (c) => String(c.department_id) === String(deptId),
      );
    if (batchId)
      filtered = filtered.filter((c) => String(c.batch_id) === String(batchId));
    return filtered;
  }, [deptId, batchId, allClassGroups]);

  // Helper: build time-only payload string expected by backend (HH:MM:SS)
  function buildTimeOnly(hhmm) {
    // hhmm as HH:MM from time input
    if (!hhmm) return null;
    // Ensure it matches HH:MM format
    if (!/^\d{2}:\d{2}$/.test(hhmm)) return null;
    return `${String(hhmm)}:00`;
  }

  // --- Save student + today's attendance changes ---
  async function saveChanges() {
    if (!student?.id) return;
    setLoading(true);
    setError("");
    try {
      // Update student - use _id suffix for FK fields
      await axios.patch(`${API_BASE}/api/students/${student.id}/`, {
        name: student.name,
        roll_no: student.roll_no,
        department_id: deptId || null,
        batch_id: batchId || null,
        class_group_id: classGroupId || null,
      });

      // Update today's attendance if present and attForm exists
      if (attendance?.id && attForm?.time) {
        try {
          // attForm.time is HH:MM from time input -> convert to HH:MM:SS
          const payloadTime = buildTimeOnly(attForm.time);
          if (!payloadTime) {
            setError("Invalid time format");
            setLoading(false);
            return;
          }

          const resp = await axios.patch(
            `${API_BASE}/api/attendance/${attendance.id}/`,
            {
              time: payloadTime,
              alreadyMarked: !!attForm.alreadyMarked,
            },
          );

          // Update local today's attendance with returned values
          setAttendance((prev) =>
            prev
              ? {
                  ...prev,
                  status:
                    resp?.data?.status ?? computeStatusFromTime(attForm.time),
                  time: resp?.data?.time ?? payloadTime,
                  alreadyMarked:
                    resp?.data?.alreadyMarked ?? !!attForm.alreadyMarked,
                }
              : prev,
          );
        } catch (err) {
          console.warn("Attendance PATCH failed.", err);
          const msg =
            err?.response?.data?.detail ||
            err?.message ||
            "Attendance save failed.";
          setError(typeof msg === "string" ? msg : JSON.stringify(msg));
        }
      }

      setIsEditing(false);
    } catch (e) {
      console.error("Save failed", e);
      setError("Save failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  }

  const imageUrl = useMemo(() => {
    const defaultImage = `${API_BASE}/media/students/default.png`;
    if (!student) return defaultImage;

    // Prefer the explicit URL provided by the backend serializer
    if (student.image_url) return student.image_url;

    // Fallback to older `student.image` string (may be relative path)
    const imagePath = student.image;
    if (!imagePath) return defaultImage;

    if (typeof imagePath === "string") {
      // Full URL already
      if (imagePath.startsWith("http")) return imagePath;
      // Already a /media/... path
      if (imagePath.startsWith("/media")) return `${API_BASE}${imagePath}`;
    }

    // Default fallback: prepend /media/
    return `${API_BASE}/media/${imagePath}`;
  }, [student]);

  // --- Edit a historical attendance record: prepare editing state ---
  const handleEditAttendance = (record) => {
    if (!record) return;
    // id might be `id` or `attendanceId` depending on API shape
    const aid = record.id || record.attendanceId || record.attendance_id;
    setEditingAttendanceId(aid);

    // derive HH:MM for editingTime from the stored time
    if (record.time) {
      const displayed = formatTimeForDisplay(record.time);
      // ensure it's HH:MM for time input
      if (/^\d{2}:\d{2}$/.test(displayed)) {
        setEditingTime(displayed);
      } else {
        setEditingTime("");
      }
    } else {
      setEditingTime("");
    }
    setEditError("");
  };

  // --- Save edited historical attendance time ---
  const handleSaveAttendance = async () => {
    if (!editingAttendanceId) {
      setEditError("Error: No attendance record selected");
      return;
    }

    if (!editingTime) {
      setEditError("Please enter a time (HH:MM)");
      return;
    }

    // Validate HH:MM format
    if (!/^\d{2}:\d{2}$/.test(editingTime)) {
      setEditError("Time must be in HH:MM format");
      return;
    }

    // Validate values
    const [h, m] = editingTime.split(":").map((v) => Number(v));
    if (
      Number.isNaN(h) ||
      Number.isNaN(m) ||
      h < 0 ||
      h > 23 ||
      m < 0 ||
      m > 59
    ) {
      setEditError("Invalid time (hours: 0-23, minutes: 0-59)");
      return;
    }

    try {
      setEditError("");
      // Convert HH:MM to HH:MM:SS for backend
      const payloadTime = `${editingTime}:00`;

      const resp = await axios.patch(
        `${API_BASE}/api/attendance/${editingAttendanceId}/`,
        {
          time: payloadTime,
          status: "on_time", // Will be auto-computed by backend
        },
        { headers: { "Content-Type": "application/json" } },
      );

      // Update attendanceDetails.records if present
      if (attendanceDetails && Array.isArray(attendanceDetails.records)) {
        const updated = attendanceDetails.records.map((r) => {
          const rid = r.id || r.attendanceId || r.attendance_id;
          if (String(rid) === String(editingAttendanceId)) {
            return {
              ...r,
              time: resp.data.time ?? payloadTime,
              status: resp.data.status ?? "on_time",
            };
          }
          return r;
        });
        setAttendanceDetails({ ...attendanceDetails, records: updated });
      }

      // If this record is today's attendance summary object, update that too
      if (attendance && String(attendance.id) === String(editingAttendanceId)) {
        setAttendance((prev) =>
          prev
            ? {
                ...prev,
                time: resp.data.time ?? payloadTime,
                status: resp.data.status ?? "on_time",
              }
            : prev,
        );
      }

      // Clear editing state
      setEditingAttendanceId(null);
      setEditingTime("");
      setEditError("");
    } catch (err) {
      console.error("Attendance PATCH failed:", err);
      const errMsg =
        err?.response?.data?.time?.[0] ||
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to update attendance";
      setEditError(
        typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg),
      );
    }
  };

  // --- Cancel editing ---
  const handleCancelEdit = () => {
    setEditingAttendanceId(null);
    setEditingTime("");
    setEditError("");
  };

  return (
    <div className="flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 p-6 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Student Detail</h1>
            <div className="flex gap-2">
              <button
                onClick={() => navigate("/admin/students/add")}
                className="px-3 py-2 mx-10 border rounded hover:bg-gray-100"
              >
                Add Student
              </button>
              <button
                onClick={() => navigate(-1)}
                className="px-3 py-2 border rounded hover:bg-gray-100"
              >
                Back
              </button>
              {rollNo && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={loading}
                >
                  Edit
                </button>
              )}
              {rollNo && isEditing && (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setError("");
                      setAttForm(null);
                    }}
                    className="px-3 py-2 border rounded hover:bg-gray-100"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveChanges}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save"}
                  </button>
                </>
              )}
            </div>
          </div>

          {!rollNo && (
            <div className="bg-white p-4 rounded shadow">
              <div className="text-sm text-gray-600 mb-2">
                Enter roll number to view student details
              </div>
              <div className="flex gap-2">
                <input
                  value={inputRoll}
                  onChange={(e) => setInputRoll(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && inputRoll) {
                      navigate(`/admin/student/${String(inputRoll).trim()}`);
                    }
                  }}
                  placeholder="e.g., 201, BIT-2081"
                  className="border px-3 py-2 rounded flex-1"
                />
                <button
                  onClick={() =>
                    inputRoll &&
                    navigate(`/admin/student/${String(inputRoll).trim()}`)
                  }
                  className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  View
                </button>
              </div>
            </div>
          )}

          {rollNo && (
            <>
              <div className="bg-white p-6 rounded shadow">
                {loading ? (
                  <div className="text-gray-500 text-sm">
                    Loading student data…
                  </div>
                ) : error ? (
                  <div className="bg-red-50 text-red-700 text-sm p-4 rounded border border-red-200">
                    <strong>Error:</strong> {error}
                    <div className="mt-2 text-xs">
                      <p>Make sure:</p>
                      <ul className="list-disc pl-5 mt-1">
                        <li>Backend server is running on {API_BASE}</li>
                        <li>
                          The student with roll number "{rollNo}" exists in the
                          database
                        </li>
                        <li>API endpoint `/api/students/` is accessible</li>
                      </ul>
                    </div>
                  </div>
                ) : student ? (
                  <div className="space-y-4">
                    <div className="flex gap-4 items-center">
                      <button
                        type="button"
                        onClick={() => openLightbox(imageUrl)}
                        className="rounded-lg overflow-hidden p-0 bg-transparent border-0"
                        title="Open profile image"
                      >
                        <img
                          src={imageUrl}
                          alt="avatar"
                          className="w-24 h-24 rounded-lg object-cover bg-gray-100"
                          onError={(e) => {
                            const defaultImg = `${API_BASE}/media/students/default.png`;
                            console.error(
                              "Image failed to load:",
                              e?.target?.src,
                            );
                            // avoid infinite loop: only set default if it's not already the default
                            if (e.target && e.target.src !== defaultImg) {
                              e.target.src = defaultImg;
                            }
                          }}
                        />
                      </button>
                      {/* QR code (if available) */}
                      {(student?.qr_code_url || student?.qr_code) && (
                        <button
                          type="button"
                          onClick={() => {
                            const src = student.qr_code_url
                              ? student.qr_code_url
                              : typeof student.qr_code === "string" &&
                                  student.qr_code.startsWith("http")
                                ? student.qr_code
                                : `${API_BASE}/media/${student.qr_code}`;
                            openLightbox(src);
                          }}
                          title="Open QR code"
                          className="flex-shrink-0 p-0 bg-transparent border-0"
                        >
                          <img
                            src={
                              student.qr_code_url
                                ? student.qr_code_url
                                : typeof student.qr_code === "string" &&
                                    student.qr_code.startsWith("http")
                                  ? student.qr_code
                                  : `${API_BASE}/media/${student.qr_code}`
                            }
                            alt="QR"
                            className="w-20 h-20 object-contain bg-white border rounded p-1"
                            onError={(e) => {
                              // hide QR image if it fails to load
                              if (e && e.target && e.target.style) {
                                e.target.style.display = "none";
                              }
                            }}
                          />
                        </button>
                      )}
                      {/* Lightbox overlay */}
                      {lightboxOpen && lightboxSrc && (
                        <div
                          role="dialog"
                          aria-modal="true"
                          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
                          onClick={closeLightbox}
                        >
                          <div
                            className="max-w-full max-h-full"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <img
                              src={lightboxSrc}
                              alt="Preview"
                              className="max-w-[90vw] max-h-[90vh] object-contain rounded shadow-lg bg-white"
                            />
                          </div>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="mb-2">
                          <label className="text-xs text-gray-500">Name</label>
                          <input
                            className="text-lg font-semibold border rounded px-2 py-1 w-full"
                            value={student.name || ""}
                            onChange={(e) =>
                              isEditing &&
                              setStudent((s) => ({
                                ...s,
                                name: e.target.value,
                              }))
                            }
                            readOnly={!isEditing}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">
                            Roll Number
                          </label>
                          <input
                            className="border rounded px-2 py-1 w-full"
                            value={student.roll_no || ""}
                            onChange={(e) =>
                              isEditing &&
                              setStudent((s) => ({
                                ...s,
                                roll_no: e.target.value,
                              }))
                            }
                            readOnly={!isEditing}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 border rounded">
                        <label className="text-xs text-gray-500 block mb-1">
                          Department
                        </label>
                        <select
                          className="text-sm border rounded px-2 py-1 w-full"
                          value={deptId}
                          onChange={(e) => {
                            if (!isEditing) return;
                            const val = e.target.value;
                            setDeptId(val);
                            setBatchId("");
                            setClassGroupId("");
                          }}
                          disabled={!isEditing}
                        >
                          <option value="">Select department</option>
                          {allDepartments.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="p-3 border rounded">
                        <label className="text-xs text-gray-500 block mb-1">
                          Batch
                        </label>
                        <select
                          className="text-sm border rounded px-2 py-1 w-full"
                          value={batchId}
                          onChange={(e) => {
                            if (!isEditing) return;
                            const val = e.target.value;
                            setBatchId(val);
                            setClassGroupId("");
                          }}
                          disabled={!isEditing}
                        >
                          <option value="">Select batch</option>
                          {filteredBatches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="p-3 border rounded">
                        <label className="text-xs text-gray-500 block mb-1">
                          Class Group
                        </label>
                        <select
                          className="text-sm border rounded px-2 py-1 w-full"
                          value={classGroupId}
                          onChange={(e) => {
                            if (!isEditing) return;
                            setClassGroupId(e.target.value);
                          }}
                          disabled={!isEditing}
                        >
                          <option value="">Select class group</option>
                          {filteredClassGroups.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="p-3 border rounded">
                      <label className="text-sm text-gray-500 block mb-2">
                        Today's Attendance Status
                      </label>
                      {!isEditing && attendance ? (
                        <div className="text-sm space-y-1">
                          <div>
                            Status:{" "}
                            <span className="font-medium">
                              {attendance.status}
                            </span>
                          </div>
                          <div>
                            Time:{" "}
                            <span className="font-mono">
                              {attendance.time
                                ? formatTimeForDisplay(attendance.time)
                                : "—"}
                            </span>
                          </div>
                          <div>
                            Already Marked:{" "}
                            {attendance.alreadyMarked ? "Yes" : "No"}
                          </div>
                          <div>Class: {attendance.class || "—"}</div>
                        </div>
                      ) : !isEditing ? (
                        <div className="text-sm text-gray-500">
                          No attendance record for today.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                          <div>
                            <label className="text-xs text-gray-500">
                              Status
                            </label>
                            <div className="w-full border rounded px-2 py-1 bg-gray-100 text-sm">
                              {attForm
                                ? computeStatusFromTime(attForm.time)
                                : "absent"}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">
                              Time
                            </label>
                            <input
                              type="time"
                              className="w-full border rounded px-2 py-1"
                              value={attForm?.time || ""}
                              onChange={(e) =>
                                setAttForm((f) => ({
                                  ...f,
                                  time: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!attForm?.alreadyMarked}
                              onChange={(e) =>
                                setAttForm((f) => ({
                                  ...f,
                                  alreadyMarked: e.target.checked,
                                }))
                              }
                            />
                            <span className="text-xs text-gray-500">
                              Already Marked
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No student data.</div>
                )}
              </div>

              {/* Attendance Details */}
              <div className="bg-white p-6 rounded shadow">
                <h2 className="text-lg font-semibold mb-4">
                  Attendance Summary
                </h2>

                {attendanceLoading ? (
                  <div className="text-gray-500 text-sm text-center py-8">
                    Loading attendance details…
                  </div>
                ) : attendanceDetails ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-xs text-gray-600">Total Days</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {attendanceDetails.total_days}
                        </div>
                      </div>
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-xs text-gray-600">
                          Days Present
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          {attendanceDetails.present_days}
                        </div>
                      </div>
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="text-xs text-gray-600">Days Absent</div>
                        <div className="text-2xl font-bold text-red-600">
                          {attendanceDetails.absent_days}
                        </div>
                      </div>
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <div className="text-xs text-gray-600">On Time</div>
                        <div className="text-2xl font-bold text-emerald-600">
                          {attendanceDetails.on_time_days}
                        </div>
                      </div>
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="text-xs text-gray-600">Late</div>
                        <div className="text-2xl font-bold text-yellow-600">
                          {attendanceDetails.late_days}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <div className="text-sm font-semibold mb-3">
                        Filter by Date Range
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">
                            From Date
                          </label>
                          <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full border rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">
                            To Date
                          </label>
                          <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full border rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={() => {
                              setDateFrom("");
                              setDateTo("");
                            }}
                            className="w-full px-3 py-2 text-sm bg-gray-300 hover:bg-gray-400 rounded text-gray-700 font-medium"
                          >
                            Clear Filters
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold mb-3">
                        Attendance Records (
                        {attendanceDetails.records?.length || 0})
                      </div>
                      <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-100 border-b">
                              <th className="px-4 py-3 text-left font-semibold">
                                Date
                              </th>
                              <th className="px-4 py-3 text-left font-semibold">
                                Time
                              </th>
                              <th className="px-4 py-3 text-left font-semibold">
                                Status
                              </th>
                              <th className="px-4 py-3 text-left font-semibold">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendanceDetails.records &&
                            attendanceDetails.records.length > 0 ? (
                              attendanceDetails.records.map((record, idx) => {
                                const rid =
                                  record.id ||
                                  record.attendanceId ||
                                  record.attendance_id;
                                const isThisEditing =
                                  String(rid) === String(editingAttendanceId);
                                return (
                                  <tr
                                    key={idx}
                                    className="border-b hover:bg-gray-50 transition"
                                  >
                                    <td className="px-4 py-3">
                                      {formatDate(record.date)}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-gray-700">
                                      {isThisEditing ? (
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <div className="flex items-center gap-1">
                                            <label className="text-xs text-gray-600">
                                              Time:
                                            </label>
                                            <input
                                              type="time"
                                              value={editingTime}
                                              onChange={(e) =>
                                                setEditingTime(e.target.value)
                                              }
                                              className="border rounded px-2 py-1 text-sm"
                                              placeholder="HH:MM"
                                            />
                                          </div>
                                          <button
                                            onClick={handleSaveAttendance}
                                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                          >
                                            Save
                                          </button>
                                          <button
                                            onClick={handleCancelEdit}
                                            className="px-2 py-1 border rounded text-xs hover:bg-gray-100"
                                          >
                                            Cancel
                                          </button>
                                          {editError && (
                                            <div className="text-xs text-red-600 w-full">
                                              {editError}
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-3">
                                          <span>
                                            {record.time
                                              ? formatTimeForDisplay(
                                                  record.time,
                                                )
                                              : "—"}
                                          </span>
                                          {/*
                                          <button
                                            onClick={() => {
                                              handleEditAttendance(record);
                                            }}
                                            className="px-2 py-1 border rounded text-xs hover:bg-blue-50">
                                            Edit
                                          </button>
                                          */}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span
                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                          record.status === "on_time"
                                            ? "bg-green-100 text-green-800"
                                            : record.status === "late"
                                              ? "bg-yellow-100 text-yellow-800"
                                              : "bg-red-100 text-red-800"
                                        }`}
                                      >
                                        {String(record.status || "")
                                          .replace("_", " ")
                                          .toUpperCase()}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      {!isThisEditing && (
                                        <button
                                          onClick={() => {
                                            handleEditAttendance(record);
                                          }}
                                          className="px-2 py-1 border rounded text-xs"
                                        >
                                          Edit Time
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td
                                  colSpan="4"
                                  className="px-4 py-6 text-center text-gray-500"
                                >
                                  No attendance records found for the selected
                                  date range.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {attendanceDetails.total_days > 0 && (
                      <div className="p-4 bg-gray-50 rounded-lg border">
                        <div className="text-sm font-semibold mb-2">
                          Attendance Percentage
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-green-600 h-3 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.round((attendanceDetails.present_days / attendanceDetails.total_days) * 100)}%`,
                            }}
                          />
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {Math.round(
                            (attendanceDetails.present_days /
                              attendanceDetails.total_days) *
                              100,
                          )}
                          % attendance
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm text-center py-8">
                    No attendance details available.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

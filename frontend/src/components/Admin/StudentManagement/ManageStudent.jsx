import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ChainedSelects from "./ChainedSelects";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function ManageStudent() {
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ deptId: '', batchId: '', classGroupId: '' });
  const perPage = 15;
  const navigate = useNavigate();

  // Fetch students from API
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    axios
      .get(`${API_BASE}/api/students/?page_size=1000`)
      .then((r) => {
        if (!mounted) return;
        console.log("Students response:", r.data);

        // Handle both paginated and non-paginated responses
        const studentsData = r.data.results || r.data || [];
        console.log(`Loaded ${Array.isArray(studentsData) ? studentsData.length : 0} students`);

        const data = (Array.isArray(studentsData) ? studentsData : []).map((d) => {
          // Construct proper image URL
          let imageUrl = "https://i.pravatar.cc/40?img=1";
          if (d.image) {
            if (d.image.startsWith('http')) {
              imageUrl = d.image;
            } else {
              imageUrl = `${API_BASE}/media/${d.image}`;
            }
          }

          return {
            id: d.id,
            name: d.name,
            roll: d.roll_no,
            batch: typeof d.batch === 'object' && d.batch ? d.batch.name : d.batch || "—",
            department: typeof d.department === 'object' && d.department ? d.department.name : d.department || "—",
            class: typeof d.class_group === 'object' && d.class_group ? d.class_group.name : d.class_group || "—",
            image: imageUrl,
            face_encoding: d.face_encoding,
            qr_code: d.qr_code,
            created_at: d.created_at,
            batchObj: d.batch,
            departmentObj: d.department,
            classGroupObj: d.class_group,
          };
        });
        setStudents(data);
        setError("");
      })
      .catch((err) => {
        if (!mounted) return;
        console.error("Failed to fetch students:", err);
        const errMsg = err?.response?.data?.error || err?.message || "Failed to load students. Please check server connection.";
        setError(errMsg);
        setStudents([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      // Text search
      if (q && !(
        String(s.name).toLowerCase().includes(q) ||
        String(s.roll).toLowerCase().includes(q) ||
        String(s.department).toLowerCase().includes(q) ||
        String(s.class).toLowerCase().includes(q)
      )) {
        return false;
      }
      // Department filter
      if (filters.deptId && String(s.departmentObj?.id || '') !== String(filters.deptId)) {
        return false;
      }
      // Batch filter
      if (filters.batchId && String(s.batchObj?.id || '') !== String(filters.batchId)) {
        return false;
      }
      // Class filter
      if (filters.classGroupId && String(s.classGroupObj?.id || '') !== String(filters.classGroupId)) {
        return false;
      }
      return true;
    });
  }, [students, query, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageData = filtered.slice((page - 1) * perPage, page * perPage);

  function openDetailsByPrompt() {
    const roll = window.prompt("Enter roll number to view details:");
    if (roll && String(roll).trim()) {
      navigate(`/admin/student/${String(roll).trim()}`);
    }
  }

  const handleFilterChange = useCallback((filterValues) => {
    setFilters(filterValues);
    setPage(1); // reset to first page when filters change
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Manage Students</h2>
        <div className="flex gap-2 items-center">
          <ChainedSelects onChange={handleFilterChange} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, roll, dept or class"
            className="border px-3 py-2 rounded"
          />
          <button
            onClick={openDetailsByPrompt}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            View Details
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded overflow-hidden">
        <table className="w-full table-auto text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">#</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Roll</th>
              <th className="p-2 text-left">Class</th>
              <th className="p-2 text-left">Batch</th>
              <th className="p-2 text-left">Department</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  Loading students...
                </td>
              </tr>
            ) : pageData.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  No students found
                </td>
              </tr>
            ) : (
              pageData.map((s) => (
                <tr key={s.id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{s.id}</td>
                  <td className="p-2 flex items-center gap-3">
                    <img
                      src={s.image}
                      alt="avatar"
                      className="w-8 h-8 rounded-full object-cover bg-gray-200"
                      onError={(e) => {
                        console.error("Student image failed to load:", s.image);
                        e.target.src = "https://i.pravatar.cc/40?img=1";
                      }}
                    />
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-gray-500">{s.email || "—"}</div>
                    </div>
                  </td>
                  <td className="p-2 font-mono text-sm">{String(s.roll)}</td>
                  <td className="p-2">{String(s.class)}</td>
                  <td className="p-2">{String(s.batch)}</td>
                  <td className="p-2">{String(s.department)}</td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => navigate(`/admin/student/${s.roll}`)}
                      className="text-sm text-green-600 hover:underline"
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
        <div className="text-sm text-gray-600">
          Showing {loading ? 0 : filtered.length} result(s)
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 border rounded"
            disabled={page === 1 || loading}
          >
            Prev
          </button>
          <div className="px-2 text-sm">
            {page} / {totalPages}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1 border rounded"
            disabled={page === totalPages || loading}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

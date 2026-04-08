import React, { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../components/Admin/Sidebar";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

export default function AdminLookups() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [classes, setClasses] = useState([]);
  const [deptName, setDeptName] = useState("");
  const [batchName, setBatchName] = useState("");
  const [className, setClassName] = useState("");
  const [classDept, setClassDept] = useState("");
  const [classBatch, setClassBatch] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    setMsg("");
    try {
      const [d, b, c] = await Promise.all([
        axios.get(`${API_BASE}/api/departments/`),
        axios.get(`${API_BASE}/api/batches/`),
        axios.get(`${API_BASE}/api/classgroups/`),
      ]);
      setDepartments(d.data || []);
      setBatches(b.data || []);
      setClasses(c.data || []);
      setOffline(false);
    } catch (e) {
      // network/backend unreachable or CORS/CSRF issues
      console.error("Lookups load error:", e);
      setMsg(
        `Cannot reach backend at ${API_BASE}. Ensure Django server is running.`
      );
      setOffline(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const createDepartment = async (e) => {
    e?.preventDefault();
    if (offline) return setMsg("Backend unavailable — cannot add department");
    if (!deptName.trim()) return setMsg("Department name required");
    try {
      const token = localStorage.getItem("admin_token");
      const headers = token ? { "X-Admin-Token": token } : {};
      const resp = await axios.post(
        `${API_BASE}/api/departments/`,
        { name: deptName },
        { headers, timeout: 5000 }
      );
      setDeptName("");
      if (resp?.data) setDepartments((s) => [...s, resp.data]); else loadAll();
    } catch (err) {
      console.error("Create department error:", err);
      setMsg(err?.response?.data || String(err.message || "Failed to add"));
    }
  };

  const createBatch = async (e) => {
    e?.preventDefault();
    if (offline) return setMsg("Backend unavailable — cannot add batch");
    if (!batchName.trim()) return setMsg("Batch name required");
    try {
      const token = localStorage.getItem("admin_token");
      const headers = token ? { "X-Admin-Token": token } : {};
      const resp = await axios.post(
        `${API_BASE}/api/batches/`,
        { name: batchName },
        { headers, timeout: 5000 }
      );
      setBatchName("");
      if (resp?.data) setBatches((s) => [...s, resp.data]); else loadAll();
    } catch (err) {
      console.error("Create batch error:", err);
      setMsg(err?.response?.data || String(err.message || "Failed to add"));
    }
  };

  const createClass = async (e) => {
    e?.preventDefault();
    if (offline) return setMsg("Backend unavailable — cannot add class");
    if (!className.trim()) return setMsg("Class name required");
    try {
      const payload = {
        name: className,
        department_id: classDept || null,
        batch_id: classBatch || null,
      };
      const token = localStorage.getItem("admin_token");
      const headers = token ? { "X-Admin-Token": token } : {};
      const resp = await axios.post(
        `${API_BASE}/api/classgroups/`,
        payload,
        { headers, timeout: 5000 }
      );
      setClassName("");
      setClassDept("");
      setClassBatch("");
      if (resp?.data) setClasses((s) => [...s, resp.data]); else loadAll();
    } catch (err) {
      console.error("Create class error:", err);
      setMsg(err?.response?.data || String(err.message || "Failed to add"));
    }
  };

  const tryDelete = async (type, id, name) => {
    if (offline) return setMsg("Backend unavailable — cannot delete");
    const title = name ? `Delete "${name}"?` : "Delete item?";
    if (!window.confirm(title)) return;
    try {
      const token = localStorage.getItem("admin_token");
      const headers = token ? { "X-Admin-Token": token } : {};
      await axios.delete(`${API_BASE}/api/${type}/${id}/`, { headers, timeout: 5000 });
      if (type === "departments") setDepartments((s) => s.filter((x) => String(x.id) !== String(id)));
      if (type === "batches") setBatches((s) => s.filter((x) => String(x.id) !== String(id)));
      if (type === "classgroups") setClasses((s) => s.filter((x) => String(x.id) !== String(id)));
    } catch (err) {
      console.error("Delete error:", err);
      setMsg(err?.response?.data || String(err.message || "Delete failed"));
    }
  };

  return (
    <div className="flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Manage Lookups</h1>
            <div>
              {offline ? (
                <div className="inline-flex items-center gap-2">
                  <span className="text-sm text-red-600">Backend unreachable</span>
                  <button onClick={loadAll} className="px-2 py-1 border rounded text-sm">Retry</button>
                </div>
              ) : loading ? (
                <div className="text-sm text-gray-500">Loading…</div>
              ) : null}
            </div>
          </div>

          {msg && <div className="p-3 bg-yellow-50 text-sm text-red-700 rounded">{String(msg)}</div>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <section className="bg-white p-4 rounded shadow">
              <h3 className="font-semibold mb-2">Departments</h3>
              <form onSubmit={createDepartment} className="flex gap-2 mb-3">
                <input
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="border px-2 py-1 flex-1"
                  placeholder="New department"
                  disabled={offline}
                />
                <button type="submit" disabled={offline} className="px-3 py-1 bg-blue-600 text-white rounded">Add</button>
              </form>
              <ul className="space-y-1 text-sm">
                {departments.length === 0 && <li className="text-gray-500">No departments</li>}
                {departments.map((d) => (
                  <li key={d.id} className="flex items-center justify-between">
                    <span>{d.name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => tryDelete("departments", d.id, d.name)}
                        disabled={offline}
                        className="text-red-600 text-sm">Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="bg-white p-4 rounded shadow">
              <h3 className="font-semibold mb-2">Batches</h3>
              <form onSubmit={createBatch} className="flex gap-2 mb-3">
                <input value={batchName} onChange={(e) => setBatchName(e.target.value)} className="border px-2 py-1 flex-1" placeholder="New batch" disabled={offline} />
                <button type="submit" disabled={offline} className="px-3 py-1 bg-blue-600 text-white rounded">Add</button>
              </form>
              <ul className="space-y-1 text-sm">
                {batches.length === 0 && <li className="text-gray-500">No batches</li>}
                {batches.map((b) => (
                  <li key={b.id} className="flex items-center justify-between">
                    <span>{b.name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => tryDelete("batches", b.id, b.name)}
                        disabled={offline}
                        className="text-red-600 text-sm">Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="bg-white p-4 rounded shadow">
              <h3 className="font-semibold mb-2">Class Groups</h3>
              <form onSubmit={createClass} className="space-y-2 mb-3">
                <input value={className} onChange={(e) => setClassName(e.target.value)} className="border px-2 py-1 w-full" placeholder="New class group" disabled={offline} />
                <div className="flex gap-2">
                  <select value={classDept} onChange={(e) => setClassDept(e.target.value)} className="border px-2 py-1 flex-1" disabled={offline}>
                    <option value="">Department (optional)</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <select value={classBatch} onChange={(e) => setClassBatch(e.target.value)} className="border px-2 py-1 flex-1" disabled={offline}>
                    <option value="">Batch (optional)</option>
                    {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <button type="submit" disabled={offline} className="px-3 py-1 bg-blue-600 text-white rounded">Add Class</button>
                </div>
              </form>

              <ul className="space-y-1 text-sm">
                {classes.length === 0 && <li className="text-gray-500">No class groups</li>}
                {classes.map((c) => (
                  <li key={c.id} className="flex items-center justify-between">
                    <div className="text-sm">
                      <div>{c.name}</div>
                      <div className="text-xs text-gray-500">
                        Dept: {c.department__name || c.department_name || c.department_id || "—"} • Batch: {c.batch__name || c.batch_id || "—"}
                      </div>
                    </div>
                    <div>
                      <button
                        onClick={() => tryDelete("classgroups", c.id, c.name)}
                        disabled={offline}
                        className="text-red-600 text-sm">Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

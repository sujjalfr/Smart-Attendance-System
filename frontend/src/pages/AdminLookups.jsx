import React, { useEffect, useState } from "react";
import axios from "axios";
import { HiOutlineDotsVertical } from "react-icons/hi";
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
  const [showDeptInput, setShowDeptInput] = useState(false);
  const [showBatchInput, setShowBatchInput] = useState(false);
  const [showClassInput, setShowClassInput] = useState(false);
  // Inline edit / action menu state
  const [deptActionOpen, setDeptActionOpen] = useState(null);
  const [deptEditingId, setDeptEditingId] = useState(null);
  const [deptEditName, setDeptEditName] = useState("");

  const [batchActionOpen, setBatchActionOpen] = useState(null);
  const [batchEditingId, setBatchEditingId] = useState(null);
  const [batchEditName, setBatchEditName] = useState("");

  const [classActionOpen, setClassActionOpen] = useState(null);
  const [classEditingId, setClassEditingId] = useState(null);
  const [classEditName, setClassEditName] = useState("");

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

  const updateDepartment = async (e) => {
    e?.preventDefault();
    if (offline) return setMsg("Backend unavailable — cannot update department");
    if (!deptEditName.trim()) return setMsg("Department name required");
    try {
      const token = localStorage.getItem("admin_token");
      const headers = token ? { "X-Admin-Token": token } : {};
      const resp = await axios.patch(`${API_BASE}/api/departments/${deptEditingId}/`, { name: deptEditName }, { headers, timeout: 5000 });
      setDepartments((s) => s.map((d) => (String(d.id) === String(deptEditingId) ? resp.data || { ...d, name: deptEditName } : d)));
      setDeptEditingId(null);
      setDeptEditName("");
    } catch (err) {
      console.error("Update department error:", err);
      setMsg(err?.response?.data || String(err.message || "Failed to update"));
    }
  };

  const updateBatch = async (e) => {
    e?.preventDefault();
    if (offline) return setMsg("Backend unavailable — cannot update batch");
    if (!batchEditName.trim()) return setMsg("Batch name required");
    try {
      const token = localStorage.getItem("admin_token");
      const headers = token ? { "X-Admin-Token": token } : {};
      const resp = await axios.patch(`${API_BASE}/api/batches/${batchEditingId}/`, { name: batchEditName }, { headers, timeout: 5000 });
      setBatches((s) => s.map((b) => (String(b.id) === String(batchEditingId) ? resp.data || { ...b, name: batchEditName } : b)));
      setBatchEditingId(null);
      setBatchEditName("");
    } catch (err) {
      console.error("Update batch error:", err);
      setMsg(err?.response?.data || String(err.message || "Failed to update"));
    }
  };

  const updateClass = async (e) => {
    e?.preventDefault();
    if (offline) return setMsg("Backend unavailable — cannot update class group");
    if (!classEditName.trim()) return setMsg("Class name required");
    try {
      const token = localStorage.getItem("admin_token");
      const headers = token ? { "X-Admin-Token": token } : {};
      const resp = await axios.patch(`${API_BASE}/api/classgroups/${classEditingId}/`, { name: classEditName }, { headers, timeout: 5000 });
      setClasses((s) => s.map((c) => (String(c.id) === String(classEditingId) ? resp.data || { ...c, name: classEditName } : c)));
      setClassEditingId(null);
      setClassEditName("");
    } catch (err) {
      console.error("Update class error:", err);
      setMsg(err?.response?.data || String(err.message || "Failed to update"));
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
      setShowDeptInput(false);
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
      setShowBatchInput(false);
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
      setShowClassInput(false);
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
        <div className="max-w-full mx-0 space-y-6">
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
              {!showDeptInput ? (
                <div className="mb-3">
                  <button onClick={() => setShowDeptInput(true)} className="inline-flex items-center px-3 py-1 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm">New department</button>
                </div>
              ) : (
                <form onSubmit={createDepartment} className="flex gap-2 mb-3">
                  <input
                    autoFocus
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    className="border px-2 py-1 flex-1"
                    placeholder="New department"
                    disabled={offline}
                  />
                  <div className="flex gap-2">
                    <button type="submit" disabled={offline} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm">Add</button>
                    <button type="button" onClick={() => { setShowDeptInput(false); setDeptName(""); }} className="px-3 py-1 border border-gray-200 bg-white text-gray-700 rounded-md">Cancel</button>
                  </div>
                </form>
              )}
              <ul className="space-y-1 text-sm">
                {departments.length === 0 && <li className="text-gray-500">No departments</li>}
                {departments.map((d) => (
                  <li key={d.id}>
                    <div className="flex items-center justify-between relative p-3 bg-white rounded-md shadow-sm border border-transparent">
                      {deptEditingId === d.id ? (
                        <form onSubmit={updateDepartment} className="flex gap-2 w-full">
                          <input value={deptEditName} onChange={(e) => setDeptEditName(e.target.value)} className="border px-2 py-1 flex-1" />
                          <div className="flex gap-2">
                            <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded">Save</button>
                            <button type="button" onClick={() => { setDeptEditingId(null); setDeptEditName(""); }} className="px-3 py-1 border rounded">Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <span>{d.name}</span>
                          <div className="relative">
                            <button onClick={() => setDeptActionOpen(deptActionOpen === d.id ? null : d.id)} className="p-1 rounded-full hover:bg-gray-100 border border-transparent">
                              <span className="sr-only">Open actions</span>
                              <HiOutlineDotsVertical className="h-5 w-5 text-gray-600" />
                            </button>
                            {deptActionOpen === d.id && (
                              <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow z-10 divide-y divide-gray-100">
                                <button onClick={() => { setDeptEditingId(d.id); setDeptEditName(d.name); setDeptActionOpen(null); }} className="w-full text-left px-3 py-2 hover:bg-gray-50">Edit</button>
                                <button onClick={() => tryDelete("departments", d.id, d.name)} className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50">Delete</button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="bg-white p-4 rounded shadow">
              <h3 className="font-semibold mb-2">Batches</h3>
              {!showBatchInput ? (
                <div className="mb-3">
                  <button onClick={() => setShowBatchInput(true)} className="inline-flex items-center px-3 py-1 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm">New batch</button>
                </div>
              ) : (
                <form onSubmit={createBatch} className="flex gap-2 mb-3">
                  <input value={batchName} autoFocus onChange={(e) => setBatchName(e.target.value)} className="border px-2 py-1 flex-1" placeholder="New batch" disabled={offline} />
                  <div className="flex gap-2">
                    <button type="submit" disabled={offline} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm">Add</button>
                    <button type="button" onClick={() => { setShowBatchInput(false); setBatchName(""); }} className="px-3 py-1 border border-gray-200 bg-white text-gray-700 rounded-md">Cancel</button>
                  </div>
                </form>
              )}
              <ul className="space-y-1 text-sm">
                {batches.length === 0 && <li className="text-gray-500">No batches</li>}
                {batches.map((b) => (
                  <li key={b.id}>
                    <div className="flex items-center justify-between relative p-3 bg-white rounded-md shadow-sm border border-transparent">
                      {batchEditingId === b.id ? (
                        <form onSubmit={updateBatch} className="flex gap-2 w-full">
                          <input value={batchEditName} onChange={(e) => setBatchEditName(e.target.value)} className="border px-2 py-1 flex-1" />
                          <div className="flex gap-2">
                            <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded">Save</button>
                            <button type="button" onClick={() => { setBatchEditingId(null); setBatchEditName(""); }} className="px-3 py-1 border rounded">Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <span>{b.name}</span>
                          <div className="relative">
                            <button onClick={() => setBatchActionOpen(batchActionOpen === b.id ? null : b.id)} className="p-1 rounded-full hover:bg-gray-100 border border-transparent">
                              <span className="sr-only">Open actions</span>
                              <HiOutlineDotsVertical className="h-5 w-5 text-gray-600" />
                            </button>
                            {batchActionOpen === b.id && (
                              <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow z-10 divide-y divide-gray-100">
                                <button onClick={() => { setBatchEditingId(b.id); setBatchEditName(b.name); setBatchActionOpen(null); }} className="w-full text-left px-3 py-2 hover:bg-gray-50">Edit</button>
                                <button onClick={() => tryDelete("batches", b.id, b.name)} className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50">Delete</button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="bg-white p-4 rounded shadow">
              <h3 className="font-semibold mb-2">Class Groups</h3>
              {!showClassInput ? (
                <div className="mb-3">
                  <button onClick={() => setShowClassInput(true)} className="inline-flex items-center px-3 py-1 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm">New class group</button>
                </div>
              ) : (
                <form onSubmit={createClass} className="space-y-2 mb-3">
                  <input value={className} autoFocus onChange={(e) => setClassName(e.target.value)} className="border px-2 py-1 w-full" placeholder="New class group" disabled={offline} />
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
                  <div className="flex gap-2">
                    <button type="submit" disabled={offline} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm">Add Class</button>
                    <button type="button" onClick={() => { setShowClassInput(false); setClassName(""); setClassDept(""); setClassBatch(""); }} className="px-3 py-1 border border-gray-200 bg-white text-gray-700 rounded-md">Cancel</button>
                  </div>
                </form>
              )}

              <ul className="space-y-1 text-sm">
                {classes.length === 0 && <li className="text-gray-500">No class groups</li>}
                {classes.map((c) => (
                  <li key={c.id}>
                    <div className="flex items-center justify-between relative p-3 bg-white rounded-md shadow-sm border border-transparent">
                      {classEditingId === c.id ? (
                        <form onSubmit={updateClass} className="flex gap-2 w-full items-center">
                          <input value={classEditName} onChange={(e) => setClassEditName(e.target.value)} className="border px-2 py-1 flex-1" />
                          <div className="flex gap-2">
                            <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded">Save</button>
                            <button type="button" onClick={() => { setClassEditingId(null); setClassEditName(""); }} className="px-3 py-1 border rounded">Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="text-sm">
                            <div>{c.name}</div>
                            <div className="text-xs text-gray-500">
                              Dept: {c.department__name || c.department_name || c.department_id || "—"} • Batch: {c.batch__name || c.batch_id || "—"}
                            </div>
                          </div>
                          <div className="relative">
                            <button onClick={() => setClassActionOpen(classActionOpen === c.id ? null : c.id)} className="p-1 rounded-full hover:bg-gray-100 border border-transparent">
                              <span className="sr-only">Open actions</span>
                              <HiOutlineDotsVertical className="h-5 w-5 text-gray-600" />
                            </button>
                            {classActionOpen === c.id && (
                              <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow z-10 divide-y divide-gray-100">
                                <button onClick={() => { setClassEditingId(c.id); setClassEditName(c.name); setClassActionOpen(null); }} className="w-full text-left px-3 py-2 hover:bg-gray-50">Edit</button>
                                <button onClick={() => tryDelete("classgroups", c.id, c.name)} className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50">Delete</button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
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

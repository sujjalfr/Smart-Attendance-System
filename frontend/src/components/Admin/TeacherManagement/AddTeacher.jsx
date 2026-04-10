import React, { useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

export default function AddTeacher({ onCreated, onCancel, initial = null, isEdit = false, onUpdated }) {
  const [form, setForm] = useState(
    initial
      ? {
          employee_id: initial.employee_id || "",
          name: initial.name || "",
          email: initial.email || "",
          phone: initial.phone || "",
        }
      : { employee_id: "", name: "", email: "", phone: "" },
  );
  const [imageBlob, setImageBlob] = useState(null);
  const [msg, setMsg] = useState("");
  const fileRef = useRef(null);
  const navigate = useNavigate();

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageBlob(f);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    if (!form.employee_id || !form.name) {
      setMsg("Employee ID and name are required");
      return;
    }

    const fd = new FormData();
    fd.append("employee_id", form.employee_id);
    fd.append("name", form.name);
    if (form.email) fd.append("email", form.email);
    if (form.phone) fd.append("phone", form.phone);
    if (imageBlob) fd.append("image", imageBlob, `${form.employee_id}.jpg`);

    try {
      const token = localStorage.getItem("admin_token");
      const headers = token ? { Authorization: `Token ${token}` } : {};
      let r;
      let created;
      if (isEdit && initial && initial.id) {
        // Update existing teacher
        r = await axios.patch(`${API_BASE}/api/teachers/${initial.id}/`, fd, { headers });
        created = r?.data;
        if (onUpdated) onUpdated(created);
      } else {
        r = await axios.post(`${API_BASE}/api/teachers/`, fd, { headers });
        created = r?.data;
        if (onCreated) onCreated(created);
      }
      // navigate to created/updated teacher detail if available
      if (created && created.employee_id) navigate(`/admin/teacher/${encodeURIComponent(created.employee_id)}`);
    } catch (err) {
      console.error("Add teacher failed", err);
      const em = err?.response?.data?.detail || err?.response?.data || err.message;
      setMsg(String(em || "Failed to add teacher"));
    }
  }

  return (
    <div className="p-4 bg-white rounded shadow max-w-md">
      <h3 className="text-lg font-medium mb-3">Add Teacher</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm">Employee ID</label>
          <input value={form.employee_id} onChange={(e) => setForm((s) => ({ ...s, employee_id: e.target.value }))} className="w-full border px-2 py-1 rounded" required />
        </div>
        <div>
          <label className="block text-sm">Name</label>
          <input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} className="w-full border px-2 py-1 rounded" required />
        </div>
        <div>
          <label className="block text-sm">Email</label>
          <input value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} className="w-full border px-2 py-1 rounded" />
        </div>
        <div>
          <label className="block text-sm">Phone</label>
          <input value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} className="w-full border px-2 py-1 rounded" />
        </div>
        <div>
          <label className="block text-sm">Photo</label>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} />
        </div>

        {msg && <div className="text-sm text-red-600">{msg}</div>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-3 py-1 border rounded">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">Save</button>
        </div>
      </form>
    </div>
  );
}

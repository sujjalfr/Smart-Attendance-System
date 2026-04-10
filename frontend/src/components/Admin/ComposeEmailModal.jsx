import React, { useEffect, useState } from "react";
import axios from "axios";

export default function ComposeEmailModal({ open, onClose }) {
  const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
  const [filter, setFilter] = useState("absent_today");
  const [date, setDate] = useState("");
  const [days, setDays] = useState(7);
  const [limit, setLimit] = useState(10);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    // load a small student list for individual selection
    async function loadStudents() {
      try {
        const resp = await axios.get(`${API_BASE}/api/students/?page_size=500`);
        const data = resp.data && resp.data.results ? resp.data.results : resp.data;
        setStudents(data || []);
      } catch (e) {
        console.error(e);
      }
    }
    if (open) loadStudents();
  }, [open]);

  function toggleStudent(id) {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  }

  async function send() {
    setStatusMsg("");
    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const payload = {
        filter,
        date: date || undefined,
        days,
        limit,
        subject,
        message,
        student_ids: Array.from(selected),
      };
      const headers = token ? { "X-Admin-Token": token } : {};
      const resp = await axios.post(`${API_BASE}/api/admin/send-email/`, payload, { headers });
      setStatusMsg(`Queued: ${resp.data.queued || 0}`);
    } catch (e) {
      setStatusMsg(e?.response?.data?.error || "Failed to send");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-[900px] max-w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Compose & Send Email</h3>
          <button onClick={onClose} className="text-gray-600">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Recipients</label>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2">
                <input type="radio" name="filter" value="absent_today" checked={filter==='absent_today'} onChange={() => setFilter('absent_today')} /> Absent today
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="filter" value="absent_yesterday" checked={filter==='absent_yesterday'} onChange={() => setFilter('absent_yesterday')} /> Absent yesterday
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="filter" value="absent_date" checked={filter==='absent_date'} onChange={() => setFilter('absent_date')} /> Absent on date
                {filter==='absent_date' && <input type="date" className="ml-2 border rounded px-2 py-1" value={date} onChange={(e)=>setDate(e.target.value)} />}
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="filter" value="most_absent" checked={filter==='most_absent'} onChange={() => setFilter('most_absent')} /> Most absent (last N days)
                {filter==='most_absent' && <input type="number" className="ml-2 w-20 border rounded px-2 py-1" value={days} onChange={(e)=>setDays(Number(e.target.value))} />}
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="filter" value="students" checked={filter==='students'} onChange={() => setFilter('students')} /> Specific students
              </label>

              {filter==='students' && (
                <div className="mt-2 max-h-56 overflow-auto border rounded p-2">
                  {students.map(s => (
                    <label key={s.id} className="flex items-center gap-2 py-1">
                      <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleStudent(s.id)} />
                      <span className="text-sm">{s.roll_no} — {s.name} {s.email ? `(${s.email})` : ''}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Subject</label>
            <input className="mt-1 w-full border rounded px-3 py-2" value={subject} onChange={(e)=>setSubject(e.target.value)} />

            <label className="block text-sm font-medium mt-3">Message</label>
            <textarea className="mt-1 w-full border rounded px-3 py-2 h-40" value={message} onChange={(e)=>setMessage(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-4">
          <div className="text-sm text-gray-600 mr-auto">{statusMsg}</div>
          <button onClick={onClose} className="px-3 py-2 border rounded">Cancel</button>
          <button onClick={send} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading ? 'Sending...' : 'Send'}</button>
        </div>
      </div>
    </div>
  );
}

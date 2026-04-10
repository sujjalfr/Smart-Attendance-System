import React, { useEffect, useState } from "react";
import Sidebar from "../components/Admin/Sidebar";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

function loadTemplates() {
  try {
    return JSON.parse(localStorage.getItem("email_templates") || "[]") || [];
  } catch (e) {
    return [];
  }
}

function saveTemplate(name, subject, message) {
  const templates = loadTemplates();
  const id = Date.now();
  templates.unshift({ id, name, subject, message });
  localStorage.setItem("email_templates", JSON.stringify(templates));
  return templates;
}

export default function AdminSendEmail() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filter, setFilter] = useState("absent_today");
  const [date, setDate] = useState("");
  const [days, setDays] = useState(7);
  const [limit, setLimit] = useState(10);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [selectedTeachers, setSelectedTeachers] = useState(new Set());
  const [extraEmails, setExtraEmails] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState(loadTemplates());
  const navigate = useNavigate();

  useEffect(() => {
    async function loadLists() {
      try {
        const [s, t] = await Promise.all([
          axios.get(`${API_BASE}/api/students/?page_size=500`).catch(() => ({ data: [] })),
          axios.get(`${API_BASE}/api/teachers/?page_size=500`).catch(() => ({ data: [] })),
        ]);
        const sdata = s.data && s.data.results ? s.data.results : s.data || [];
        const tdata = t.data && t.data.results ? t.data.results : t.data || [];
        setStudents(sdata || []);
        setTeachers(tdata || []);
      } catch (e) {
        console.error("Failed to load recipients", e);
      }
    }
    loadLists();
  }, []);

  function toggleStudent(id) {
    const s = new Set(selectedStudents);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelectedStudents(s);
  }
  function toggleTeacher(id) {
    const s = new Set(selectedTeachers);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelectedTeachers(s);
  }

  function applyTemplate(t) {
    setSubject(t.subject || "");
    setMessage(t.message || "");
  }

  function handleSaveTemplate() {
    const name = window.prompt("Template name");
    if (!name) return;
    const saved = saveTemplate(name, subject, message);
    setTemplates(saved);
    setStatusMsg("Template saved");
    setTimeout(() => setStatusMsg(""), 2000);
  }

  async function handleSend() {
    setLoading(true);
    setStatusMsg("");
    try {
      const token = localStorage.getItem("admin_token");
      const payload = {
        filter,
        date: date || undefined,
        days,
        limit,
        subject,
        message,
        student_ids: Array.from(selectedStudents),
        teacher_ids: Array.from(selectedTeachers),
        emails: extraEmails
          .split(/[,\n;]/)
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const headers = token ? { "X-Admin-Token": token } : {};
      const resp = await axios.post(`${API_BASE}/api/admin/send-email/`, payload, { headers });
      const queued = resp.data.queued || 0;
      setStatusMsg(`Queued: ${queued}`);
      // if backend returned a job_id, poll status
      const jobId = resp.data.job_id;
      if (jobId) pollJobStatus(jobId, token);
    } catch (e) {
      console.error(e);
      setStatusMsg(e?.response?.data?.error || "Failed to send");
    } finally {
      setLoading(false);
    }
  }

  function pollJobStatus(jobId, token) {
    setStatusMsg((s) => `${s} (job ${jobId})`);
    const headers = token ? { "X-Admin-Token": token } : {};
    const poll = setInterval(async () => {
      try {
        const r = await axios.get(`${API_BASE}/api/admin/send-email/status/${jobId}/`, { headers });
        const data = r.data || {};
        if (data.status === 'done' && data.result) {
          const res = data.result;
          setStatusMsg(`Sent: ${res.sent} / ${res.attempted}` + (res.failures && res.failures.length ? ` — ${res.failures.length} failures` : ''));
          clearInterval(poll);
        } else if (data.status === 'queued') {
          setStatusMsg((s) => `Queued: ${data.queued || 0}`);
        } else {
          setStatusMsg(JSON.stringify(data));
        }
      } catch (err) {
        // if 404, stop polling
        if (err?.response?.status === 404) {
          setStatusMsg('Job not found');
          clearInterval(poll);
          return;
        }
        console.error('Poll error', err);
      }
    }, 1500);
    // stop polling after 2 minutes
    setTimeout(() => clearInterval(poll), 2 * 60 * 1000);
  }

  return (
    <div className="flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 p-6">
        <div className="max-w-full mx-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold">Compose & Send Email</h1>
            <div className="flex gap-2">
              <button onClick={() => navigate(-1)} className="px-3 py-2 border rounded">Back</button>
              <button onClick={handleSaveTemplate} className="px-3 py-2 bg-yellow-500 text-white rounded">Save as Template</button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <div className="bg-white p-4 rounded shadow">
                <div className="mb-3">
                  <label className="block text-sm font-medium">Recipients</label>
                  <div className="mt-2 space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="filter" value="absent_today" checked={filter==='absent_today'} onChange={()=>setFilter('absent_today')} /> Absent today
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="filter" value="absent_yesterday" checked={filter==='absent_yesterday'} onChange={()=>setFilter('absent_yesterday')} /> Absent yesterday
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="filter" value="absent_date" checked={filter==='absent_date'} onChange={()=>setFilter('absent_date')} /> Absent on date
                      {filter==='absent_date' && <input type="date" className="ml-2 border rounded px-2 py-1" value={date} onChange={(e)=>setDate(e.target.value)} />}
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="filter" value="most_absent" checked={filter==='most_absent'} onChange={()=>setFilter('most_absent')} /> Most absent (last N days)
                      {filter==='most_absent' && <input type="number" className="ml-2 w-20 border rounded px-2 py-1" value={days} onChange={(e)=>setDays(Number(e.target.value))} />}
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="filter" value="students" checked={filter==='students'} onChange={()=>setFilter('students')} /> Specific students
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="filter" value="teachers" checked={filter==='teachers'} onChange={()=>setFilter('teachers')} /> Specific teachers
                    </label>

                    {filter==='students' && (
                      <div className="mt-2 max-h-56 overflow-auto border rounded p-2">
                        {students.map(s => (
                          <label key={s.id} className="flex items-center gap-2 py-1">
                            <input type="checkbox" checked={selectedStudents.has(s.id)} onChange={()=>toggleStudent(s.id)} />
                            <span className="text-sm">{s.roll_no} — {s.name} {s.email ? `(${s.email})` : ''}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {filter==='teachers' && (
                      <div className="mt-2 max-h-56 overflow-auto border rounded p-2">
                        {teachers.map(t => (
                          <label key={t.id} className="flex items-center gap-2 py-1">
                            <input type="checkbox" checked={selectedTeachers.has(t.id)} onChange={()=>toggleTeacher(t.id)} />
                            <span className="text-sm">{t.employee_id} — {t.name} {t.email ? `(${t.email})` : ''}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    <div className="mt-2">
                      <div className="text-xs text-gray-500 mb-1">Extra emails (comma/newline separated)</div>
                      <textarea className="w-full border rounded px-2 py-1" value={extraEmails} onChange={(e)=>setExtraEmails(e.target.value)} rows={3} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium">Subject</label>
                  <input className="mt-1 w-full border rounded px-3 py-2" value={subject} onChange={(e)=>setSubject(e.target.value)} />
                </div>

                <div className="mt-3">
                  <label className="block text-sm font-medium">Message</label>
                  <textarea className="mt-1 w-full border rounded px-3 py-2 h-60" value={message} onChange={(e)=>setMessage(e.target.value)} />
                </div>

                <div className="flex items-center justify-end gap-3 mt-4">
                  <div className="text-sm text-gray-600 mr-auto">{statusMsg}</div>
                  <button onClick={()=>{ setSubject(''); setMessage(''); setSelectedStudents(new Set()); setSelectedTeachers(new Set()); setExtraEmails(''); setStatusMsg(''); }} className="px-3 py-2 border rounded">Clear</button>
                  <button onClick={handleSend} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading ? 'Sending...' : 'Send'}</button>
                </div>
              </div>
            </div>

            <div className="col-span-1">
              <div className="bg-white p-4 rounded shadow mb-4">
                <div className="text-sm font-semibold mb-2">Templates</div>
                {templates.length === 0 ? (
                  <div className="text-sm text-gray-500">No saved templates</div>
                ) : (
                  <div className="space-y-2">
                    {templates.map((t) => (
                      <div key={t.id} className="border rounded p-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{t.name}</div>
                            <div className="text-xs text-gray-500 truncate">{t.subject}</div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => applyTemplate(t)} className="px-2 py-1 border rounded text-xs">Apply</button>
                            <button onClick={() => { navigator.clipboard?.writeText(t.message || ''); }} className="px-2 py-1 border rounded text-xs">Copy</button>
                          </div>
                        </div>
                        <div className="text-xs text-gray-700 mt-2 max-h-20 overflow-auto">{t.message}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white p-4 rounded shadow">
                <div className="text-sm font-semibold mb-2">Quick Recipients</div>
                <div className="text-xs text-gray-500 mb-2">Jump to a person by Roll No or Employee ID</div>
                <div className="space-y-2">
                  <AddQuickRecipient students={students} teachers={teachers} onAdd={(type, id)=>{
                    if (type==='student') { const s=new Set(selectedStudents); s.add(id); setSelectedStudents(s); }
                    if (type==='teacher') { const s=new Set(selectedTeachers); s.add(id); setSelectedTeachers(s); }
                  }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function AddQuickRecipient({ students, teachers, onAdd }) {
  const [val, setVal] = useState("");
  return (
    <div>
      <input placeholder="RollNo or EmployeeID" value={val} onChange={(e)=>setVal(e.target.value)} className="w-full border rounded px-2 py-1 mb-2" />
      <div className="flex gap-2">
        <button onClick={()=>{
          const v=String(val||"").trim();
          if(!v) return;
          const st = students.find(s=>String(s.roll_no).trim()===v);
          if(st) { onAdd('student', st.id); setVal(''); return; }
          const t = teachers.find(t2=>String(t2.employee_id).trim()===v);
          if(t) { onAdd('teacher', t.id); setVal(''); return; }
          alert('Not found');
        }} className="px-3 py-1 border rounded">Add</button>
        <button onClick={()=>{ setVal(''); }} className="px-3 py-1 border rounded">Clear</button>
      </div>
    </div>
  );
}

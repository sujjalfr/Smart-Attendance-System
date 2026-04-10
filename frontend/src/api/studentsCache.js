import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
const CACHE_KEY = "students_cache_v1";
const TTL = 60 * 1000; // 60 seconds

function now() {
  return new Date().getTime();
}

function simplifyStudent(d) {
  return {
    id: d.id,
    name: d.name,
    roll_no: d.roll_no,
    batch: d.batch,
    department: d.department,
    class_group: d.class_group,
    image: d.image,
    face_encoding: d.face_encoding,
    qr_code: d.qr_code,
  };
}

export async function getStudents({ force = false } = {}) {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!force && raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.ts && parsed.ts + TTL > now() && Array.isArray(parsed.data)) {
          return parsed.data;
        }
      } catch (e) {
        // fallthrough to fetch
      }
    }

    const r = await axios.get(`${API_BASE}/api/students/?page_size=1000`);
    const studentsData = r.data.results || r.data || [];
    const data = (Array.isArray(studentsData) ? studentsData : []).map(simplifyStudent);
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: now(), data }));
    } catch (e) {
      // ignore storage errors
    }
    return data;
  } catch (err) {
    console.error("studentsCache: failed to fetch students", err);
    // try to return stale cache if present
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.data)) return parsed.data;
      }
    } catch (e) {}
    return [];
  }
}

export function clearStudentsCache() {
  try { sessionStorage.removeItem(CACHE_KEY); } catch (e) {}
}

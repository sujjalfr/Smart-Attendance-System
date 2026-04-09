import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ManualRollInput from "../components/common/ManualRollInput";
import FaceScan from "../components/FaceScan/FaceScan";
import AttendanceResult from "../components/Attendance/AttendanceResult";
import { formatTimeForDisplay } from "../utils/helpers";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

function getAdminPin() {
  return localStorage.getItem("admin_pin") || "12345";
}

const AttendancePage = () => {
  const [step, setStep] = useState("choose");
  const [rollNo, setRollNo] = useState("");
  const [autoScan, setAutoScan] = useState(true);
  const [lastAttendance, setLastAttendance] = useState(null);
  const [showExitPinModal, setShowExitPinModal] = useState(false);
  const [exitPin, setExitPin] = useState("");
  const [exitError, setExitError] = useState("");
  const [recentList, setRecentList] = useState([]);
  const navigate = useNavigate();

  useEffect(() => { if (autoScan) setStep("face"); else setStep("choose"); }, [autoScan]);

  useEffect(() => {
    const fetchRecent = async () => {
      try { const r = await fetch(`${API_BASE}/api/attendance/recent/`); const data = await r.json(); if (data?.recent) setRecentList(data.recent || []); } catch (e) {}
    };
    fetchRecent();
    const id = setInterval(fetchRecent, 5000);
    return () => clearInterval(id);
  }, []);

  const handleManualSubmit = (roll) => { setRollNo(roll); setStep("face"); };
  const handleFaceScanResult = (r) => { setLastAttendance(r); };
  const handleRescanFace = () => { setLastAttendance(null); setStep("face"); };
  const handleReenterRoll = () => { setLastAttendance(null); setRollNo(""); setStep("manual"); };

  const attemptServerAuth = async (pin, timeoutMs = 2000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(`${API_BASE}/api/admin/auth/`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ pin }), signal: controller.signal });
      clearTimeout(id);
      const data = await resp.json();
      return data?.token ? { ok: true } : { ok: false, error: data?.error };
    } catch (e) {
      clearTimeout(id);
      return { ok: false, unreachable: true };
    }
  };

  const handleAdminEnter = async () => {
    setExitError("");
    if (!/^[0-9]{5}$/.test(exitPin)) { setExitError("Enter a 5-digit numeric code"); return; }

    // Immediate local PIN check so user gets instant redirect when offline or using dev PIN
    if (exitPin === getAdminPin()) {
      try { sessionStorage.setItem("admin_authenticated", "1"); } catch {}
      setShowExitPinModal(false);
      setExitPin("");
      setExitError("");
      // Fire-and-forget server auth to sync token if server reachable
      attemptServerAuth(exitPin).catch(() => {});
      navigate("/home");
      return;
    }

    // If local PIN didn't match, try server (with timeout). Show errors accordingly.
    const res = await attemptServerAuth(exitPin);
    if (res.ok) { setShowExitPinModal(false); setExitPin(""); setExitError(""); navigate("/home"); return; }
    if (res.unreachable) { setExitError("Server unreachable and local PIN did not match"); return; }
    setExitError(res.error || "Invalid PIN");
  };

  return (
    <div className="min-h-screen flex items-start justify-center bg-gray-50 p-4">
      {showExitPinModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-black/50 absolute inset-0" onClick={() => setShowExitPinModal(false)} />
          <div className="bg-white p-4 rounded shadow-md z-60 w-80">
            <div className="mb-3 font-semibold">Enter 5-digit PIN</div>
            <div className="mb-3 text-center font-mono text-xl tracking-widest">{`${"•".repeat(exitPin.length)}${"○".repeat(5 - exitPin.length)}`}</div>
            {exitError && <div className="text-sm text-red-600 mb-2">{exitError}</div>}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {['1','2','3','4','5','6','7','8','9'].map(n => (<button key={n} onClick={() => setExitPin(p => (p + n).slice(0,5))} className="px-3 py-2 border rounded">{n}</button>))}
              <button onClick={() => setExitPin("")} className="px-3 py-2 border rounded">C</button>
              <button onClick={() => setExitPin(p => (p + '0').slice(0,5))} className="px-3 py-2 border rounded">0</button>
              <button onClick={() => setExitPin(p => p.slice(0,-1))} className="px-3 py-2 border rounded">⌫</button>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowExitPinModal(false)} className="px-3 py-1 border rounded">Cancel</button>
              <button onClick={handleAdminEnter} className="px-3 py-1 bg-blue-600 text-white rounded">Enter</button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-8xl flex gap-4">
        <div className="w-1/5 bg-white rounded-lg shadow p-3 flex flex-col gap-3">
          <div className="flex justify-between items-center"><h3 className="font-semibold">Controls</h3><button onClick={() => setShowExitPinModal(true)} className="px-3 py-1 bg-red-500 text-white rounded">Exit</button></div>
          <button onClick={() => setAutoScan(p => !p)} className={`px-3 py-1 rounded text-sm font-bold ${autoScan ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>{autoScan ? 'Auto Scan: ON' : 'Auto Scan: OFF'}</button>
          <button onClick={() => { setRollNo(''); setStep('manual'); }} className="px-3 py-1 rounded text-sm bg-gray-200">Manual RollNo</button>
          {/* Removed redundant Stop AutoScan button - toggling Auto Scan is handled by the Auto Scan control above */}
          <div className="mt-auto text-sm text-gray-600">Tip: Place camera at eye level for best results.</div>
        </div>
        <div className="w-3/5 bg-white rounded-lg shadow p-4 flex flex-col items-start">
          {step === 'manual' && <ManualRollInput onSubmit={handleManualSubmit} />}
          {(step === 'face' || autoScan) && <FaceScan onResult={handleFaceScanResult} autoScan={autoScan} showRecent={false} videoWidth={800} videoHeight={560} rollNo={rollNo} />}
          {lastAttendance && <div className={`mt-3 p-2 rounded text-sm ${lastAttendance.success ? 'bg-green-100' : 'bg-yellow-100'}`}>{lastAttendance.error ? <div>Result: {lastAttendance.error}</div> : <div>Attendance marked for {lastAttendance.name || ''} ({lastAttendance.rollNo || ''})</div>}</div>}
        </div>

        <div className="w-1/5 bg-white rounded-lg shadow p-3 flex flex-col">
          <h3 className="font-semibold mb-2">Recently Marked</h3>
          <div className="flex-1 overflow-y-auto space-y-2">
            {recentList && recentList.filter(r => r && r.startsWith && r.startsWith('Attendance marked')).length ? recentList.filter(r => r && r.startsWith && r.startsWith('Attendance marked')).map((item, idx) => (<div key={idx} className="p-1 border rounded bg-white shadow-sm"><div className="text-sm">{item}</div></div>)) : <div className="text-sm text-gray-500">No recent attendance</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;

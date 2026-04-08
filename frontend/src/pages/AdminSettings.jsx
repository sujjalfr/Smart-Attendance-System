import React, { useEffect, useState } from "react";
import Sidebar from "../components/Admin/Sidebar";
import axios from "axios";

export default function AdminSettings() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settings, setSettings] = useState({
    requireFaceEncoding: true,
    autoGenerateQR: true,
    attendanceThreshold: 75,
    adminEmail: "",
  });
  const [currPin, setCurrPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinMsg, setPinMsg] = useState("");
  // focused field for keypad: "current" | "new" | "confirm"
  const [focusedPinField, setFocusedPinField] = useState("current");

  const handleKeypad = (digit) => {
    const append = (v, setV) => setV((s) => (s + digit).slice(0, 5));
    if (focusedPinField === "current") append(currPin, setCurrPin);
    else if (focusedPinField === "new") append(newPin, setNewPin);
    else if (focusedPinField === "confirm") append(confirmPin, setConfirmPin);
  };
  const handleBackspace = () => {
    if (focusedPinField === "current") setCurrPin((s) => s.slice(0, -1));
    else if (focusedPinField === "new") setNewPin((s) => s.slice(0, -1));
    else if (focusedPinField === "confirm")
      setConfirmPin((s) => s.slice(0, -1));
  };
  const handleClear = () => {
    if (focusedPinField === "current") setCurrPin("");
    else if (focusedPinField === "new") setNewPin("");
    else if (focusedPinField === "confirm") setConfirmPin("");
  };
  const canSavePin =
    /^\d{5}$/.test(currPin) && /^\d{5}$/.test(newPin) && newPin === confirmPin;

  const DEFAULT_PIN = "12345";
  function getAdminPin() {
    return localStorage.getItem("admin_pin") || DEFAULT_PIN;
  }
  function setAdminPin(pin) {
    localStorage.setItem("admin_pin", pin);
  }

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("admin_settings") || "null",
      );
      if (saved) setSettings(saved);
    } catch (e) {}
  }, []);

  function save() {
    localStorage.setItem("admin_settings", JSON.stringify(settings));
    alert("Settings saved");
  }

  async function changePin() {
    setPinMsg("");
    if (!/^\d{5}$/.test(newPin)) {
      setPinMsg("New PIN must be 5 digits");
      return;
    }
    if (newPin !== confirmPin) {
      setPinMsg("PINs do not match");
      return;
    }
    try {
      const resp = await axios.post(
        `${process.env.VITE_API_BASE || "http://127.0.0.1:8000"}/api/admin/pin/`,
        {
          current_pin: currPin,
          pin: newPin,
        },
      );
      if (resp.data && resp.data.message) {
        setPinMsg(resp.data.message || "PIN updated");
        // fetch token after update to keep client authenticated
        try {
          const auth = await axios.post(
            `${process.env.VITE_API_BASE || "http://127.0.0.1:8000"}/api/admin/auth/`,
            { pin: newPin },
          );
          if (auth.data && auth.data.token) {
            localStorage.setItem("admin_token", auth.data.token);
            try {
              sessionStorage.setItem("admin_authenticated", "1");
            } catch (e) {}
          }
        } catch {}
      }
    } catch (e) {
      // fallback: show error and do not change
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.detail ||
        "Failed to update PIN";
      setPinMsg(String(msg));
    } finally {
      setCurrPin("");
      setNewPin("");
      setConfirmPin("");
    }
  }

  return (
    <div className="flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-semibold mb-4">Admin Settings</h1>
          {/* 
          <div className="bg-white p-4 rounded shadow space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Require Face Encoding</div>
                <div className="text-sm text-gray-500">If enabled, uploaded faces will be encoded for recognition.</div>
              </div>
              <input
                type="checkbox"
                checked={settings.requireFaceEncoding}
                onChange={(e) => setSettings((s) => ({ ...s, requireFaceEncoding: e.target.checked }))}
                className="w-5 h-5"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Auto-generate QR</div>
                <div className="text-sm text-gray-500">Automatically create student QR codes on save.</div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoGenerateQR}
                onChange={(e) => setSettings((s) => ({ ...s, autoGenerateQR: e.target.checked }))}
                className="w-5 h-5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Attendance Threshold (%)</label>
              <input
                type="number"
                value={settings.attendanceThreshold}
                onChange={(e) => setSettings((s) => ({ ...s, attendanceThreshold: Number(e.target.value || 0) }))}
                className="mt-1 block w-32 border rounded px-2 py-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Admin Contact Email</label>
              <input
                type="email"
                value={settings.adminEmail}
                onChange={(e) => setSettings((s) => ({ ...s, adminEmail: e.target.value }))}
                className="mt-1 block w-full border rounded px-3 py-2"
                placeholder="admin@school.edu"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => window.location.reload()} className="px-3 py-2 border rounded">Reset</button>
              <button onClick={save} className="px-3 py-2 bg-blue-600 text-white rounded">Save Settings</button>
            </div>
          </div> 
          */}

          <div className="bg-white p-4 rounded shadow mt-4">
            <h2 className="font-semibold mb-2">Admin PIN</h2>
            <div className="text-sm text-gray-500 mb-3">
              Change the 5-digit admin PIN used to access admin pages.
            </div>
            <div className="grid grid-cols-1 gap-2 mb-3">
              {/* Masked displays (click to focus) */}
              <div className="flex gap-2 items-center">
                <div className="w-36">
                  <div className="text-xs text-gray-600">Current PIN</div>
                  <button
                    type="button"
                    onClick={() => setFocusedPinField("current")}
                    className={`w-full text-center px-3 py-2 border rounded font-mono ${focusedPinField === "current" ? "ring-2 ring-blue-400" : ""}`}
                  >
                    {`${"•".repeat(currPin.length)}${"○".repeat(5 - currPin.length)}`}
                  </button>
                </div>
                <div className="w-36">
                  <div className="text-xs text-gray-600">New PIN</div>
                  <button
                    type="button"
                    onClick={() => setFocusedPinField("new")}
                    className={`w-full text-center px-3 py-2 border rounded font-mono ${focusedPinField === "new" ? "ring-2 ring-blue-400" : ""}`}
                  >
                    {`${"•".repeat(newPin.length)}${"○".repeat(5 - newPin.length)}`}
                  </button>
                </div>
                <div className="w-36">
                  <div className="text-xs text-gray-600">Confirm</div>
                  <button
                    type="button"
                    onClick={() => setFocusedPinField("confirm")}
                    className={`w-full text-center px-3 py-2 border rounded font-mono ${focusedPinField === "confirm" ? "ring-2 ring-blue-400" : ""}`}
                  >
                    {`${"•".repeat(confirmPin.length)}${"○".repeat(5 - confirmPin.length)}`}
                  </button>
                </div>
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-2 justify-center">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                  <button
                    key={d}
                    onClick={() => handleKeypad(d)}
                    className="px-4 py-3 rounded border text-lg bg-gray-50"
                  >
                    {d}
                  </button>
                ))}
                <button
                  onClick={handleClear}
                  className="px-4 py-3 rounded border text-sm bg-yellow-50"
                >
                  Clear
                </button>
                <button
                  onClick={() => handleKeypad("0")}
                  className="px-4 py-3 rounded border text-lg bg-gray-50"
                >
                  0
                </button>
                <button
                  onClick={handleBackspace}
                  className="px-4 py-3 rounded border text-sm bg-yellow-50"
                >
                  ⌫
                </button>
              </div>
              {pinMsg && (
                <div className="text-sm text-red-600 mt-2">{pinMsg}</div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setCurrPin("");
                    setNewPin("");
                    setConfirmPin("");
                    setPinMsg("");
                  }}
                  className="px-3 py-1 border rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={changePin}
                  disabled={!canSavePin}
                  className={`px-3 py-1 rounded text-white ${canSavePin ? "bg-green-600" : "bg-gray-300 cursor-not-allowed"}`}
                >
                  Change PIN
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

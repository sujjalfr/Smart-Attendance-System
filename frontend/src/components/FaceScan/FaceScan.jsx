import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

const FaceScan = ({ onResult, autoScan = false }) => {
  const webcamRef = useRef(null);
  const processingRef = useRef(false);
  const mountedRef = useRef(true);
  const lastSuccessRef = useRef(0);
  const COOLDOWN_MS = 3000;
  const [isCapturing, setIsCapturing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopCamera(); // ensure camera stopped on unmount
    };
  }, []);

  useEffect(() => {
    if (autoScan) {
      setIsCapturing(true);
    }
  }, [autoScan]);

  

  const stopCamera = () => {
    try {
      const cam = webcamRef.current;
      const video = cam && cam.video;
      if (video && video.srcObject) {
        const tracks = video.srcObject.getTracks() || [];
        tracks.forEach((t) => {
          try { t.stop(); } catch { /* ignore */ }
        });
        // detach
        try { video.srcObject = null; } catch {}
      }
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    if (!isCapturing) return;
    let pollId = null;
    const intervalId = setInterval(async () => {
      if (!mountedRef.current) return;
      // throttle after a recent successful mark
      if (Date.now() - lastSuccessRef.current < COOLDOWN_MS) return;
      if (processingRef.current) return;
      if (!webcamRef.current) return;
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) return;
      processingRef.current = true;
      setLoading(true);
      try {
        const blob = await (await fetch(imageSrc)).blob();
        const formData = new FormData();
        formData.append("image", blob, "face.jpg");

        const resp = await axios.post(
          `${API_BASE}/api/attendance/`,
          formData,
          {
            headers: { Accept: "application/json" },
            validateStatus: () => true, // handle non-2xx manually
          },
        );

        const data = resp.data;
        if (resp.status < 200 || resp.status >= 300) {
          console.error("Attendance API error", resp.status, data);
        }

        if (resp.status >= 200 && resp.status < 300) {
          if (data?.message && data.message.startsWith("Attendance marked")) {
            if (!mountedRef.current) return;
            // For autoScan keep camera running; add a short cooldown to avoid duplicate marks
            if (autoScan) {
              lastSuccessRef.current = Date.now();
              // keep processing locked for cooldown
              setLoading(false);
              setTimeout(() => {
                processingRef.current = false;
              }, COOLDOWN_MS);
              onResult({
                success: true,
                name: data.name || data.message.split("for ")[1] || "",
                rollNo: data.roll_no || null,
                class: data.class || null,
                batch: data.batch || null,
                department: data.department || null,
                time: data.time || null,
              });
            } else {
              setIsCapturing(false);
              onResult({
                success: true,
                name: data.name || data.message.split("for ")[1] || "",
                rollNo: data.roll_no || null,
                class: data.class || null,
                batch: data.batch || null,
                department: data.department || null,
                time: data.time || null,
              });
            }
            return;
          }
          if (data?.message && data.message.startsWith("Attendance already marked")) {
            // If autoScan, ignore and continue scanning; for manual show result
            if (!mountedRef.current) return;
            if (autoScan) {
              processingRef.current = false;
              setLoading(false);
              return;
            }
            setIsCapturing(false);
            onResult({
              success: false,
              error: data.message,
              name: data.name || "",
              rollNo: data.roll_no || null,
              class: data.class || null,
              batch: data.batch || null,
              department: data.department || null,
              time: data.time || null,
            });
            return;
          }
          if (data?.error === "No face detected in image") {
            // transient - keep scanning; do NOT surface in recent UI
            console.debug("No face detected (ignored for UI):", data);
            processingRef.current = false;
            setLoading(false);
            return;
          }
          if (!autoScan) {
            setIsCapturing(false);
            onResult({
              success: false,
              error: data?.error || data?.message || "Unknown response",
            });
          } else {
            console.warn("FaceScan (auto): unexpected 2xx payload", data);
            processingRef.current = false;
            setLoading(false);
          }
        } else {
          // non-2xx
          const errMsg =
            data?.error ||
            data?.message ||
            resp.statusText ||
            `HTTP ${resp.status}`;
          if (errMsg === "No face detected in image") {
            // transient - keep scanning; do NOT surface in recent UI
            console.debug("No face detected (ignored for UI):", errMsg);
            processingRef.current = false;
            setLoading(false);
            return;
          }
          if (!autoScan) {
            setIsCapturing(false);
            onResult({ success: false, error: errMsg });
          } else {
            console.warn(
              "FaceScan (auto): non-2xx response",
              resp.status,
              errMsg,
            );
            processingRef.current = false;
            setLoading(false);
          }
        }
      } catch (err) {
        if (!autoScan) {
          setIsCapturing(false);
          onResult({ success: false, error: "Network error: " + err.message });
        } else {
          console.warn("FaceScan (auto) network error:", err);
          processingRef.current = false;
          setLoading(false);
        }
      }
    }, 1000);

    return () => {
      clearInterval(intervalId);
      if (pollId) clearInterval(pollId);
    };
  }, [isCapturing, onResult, autoScan]);

  // Poll recent attendance on mount so UI shows stacked recent items even when not scanning
  useEffect(() => {
    let poll = setInterval(async () => {
      try {
        const r = await axios.get(`${API_BASE}/api/attendance/recent/`);
        if (r?.data?.recent) setRecent(r.data.recent || []);
      } catch (e) {
        // ignore
      }
    }, 2000);
    // initial fetch
    (async () => {
      try {
        const r = await axios.get(`${API_BASE}/api/attendance/recent/`);
        if (r?.data?.recent) setRecent(r.data.recent || []);
      } catch (e) {}
    })();
    return () => clearInterval(poll);
  }, []);

  return (
    <div className="flex flex-col items-center">
      <h2 className="mb-4 text-lg font-semibold">Scan Face</h2>
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width={320}
        height={240}
        videoConstraints={{ facingMode: "user" }}
        style={{ width: "100%", transform: "scaleX(-1)" }}
        className="rounded-lg shadow mb-4"
      />
      {!isCapturing && !autoScan && (
        <button
          className="btn btn-primary mb-4"
          onClick={() => setIsCapturing(true)}
        >
          Start Face Scan
        </button>
      )}
      {loading && <p className="text-blue-500">Scanning face...</p>}
      <div className="w-full max-w-md mt-4">
        <h3 className="font-semibold">Recent attendance (most recent on top)</h3>
        <div className="mt-2 bg-white shadow rounded p-2" style={{maxHeight: 240, overflowY: 'auto'}}>
          {recent && recent.filter(r => r && r.startsWith && r.startsWith('Attendance marked')).length ? (
            recent
              .filter(r => r && r.startsWith && r.startsWith('Attendance marked'))
              .map((item, idx) => (
                <div key={idx} className="text-sm py-1 border-b last:border-b-0">
                  {item}
                </div>
              ))
          ) : (
            <div className="text-sm text-gray-500">No recent attendance</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FaceScan;

import React, { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ChainedSelects from "./ChainedSelects";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

export default function AddStudent() {
  const [form, setForm] = useState({ name: "", roll_no: "" });
  const [deptBatchClass, setDeptBatchClass] = useState({
    deptId: "",
    batchId: "",
    classGroupId: "",
  });
  const [preview, setPreview] = useState(null);
  const [imageBlob, setImageBlob] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [msg, setMsg] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  const handleChainedChange = useCallback((vals) => setDeptBatchClass(vals), []);

  // When a class group is selected, fetch its batch/department and auto-fill those fields
  useEffect(() => {
    let mounted = true;
    async function fillFromClassGroup() {
      const classId = deptBatchClass.classGroupId;
      if (!classId) return;
      try {
        const resp = await axios.get(`${API_BASE}/api/classgroups/`);
        if (!mounted) return;
        const list = resp.data || [];
        const found =
          list.find((c) => String(c.id) === String(classId)) ||
          list.find((c) => String(c.id) === String(classId?.id));
        if (found) {
          setDeptBatchClass((s) => ({
            ...s,
            deptId: String(found.department_id || found.department || "") || s.deptId,
            batchId: String(found.batch_id || found.batch || "") || s.batchId,
            classGroupId: String(classId),
          }));
        }
      } catch (e) {
        console.warn("Could not auto-fill dept/batch from class group", e);
      }
    }
    fillFromClassGroup();
    return () => {
      mounted = false;
    };
  }, [deptBatchClass.classGroupId]);

  useEffect(() => {
    let stream;
    if (!showCamera) return;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (e) {
        console.error("Camera error", e);
        setMsg("Unable to access camera");
        setShowCamera(false);
      }
    })();
    return () => {
      stream?.getTracks?.().forEach((t) => t.stop());
    };
  }, [showCamera]);

  function handleCapture() {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 480;
    const ctx = c.getContext("2d");
    ctx.drawImage(v, 0, 0, c.width, c.height);
    c.toBlob((blob) => {
      if (!blob) return;
      setImageBlob(blob);
      const url = URL.createObjectURL(blob);
      setPreview(url);
      setShowCamera(false);
    }, "image/jpeg", 0.9);
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageBlob(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    if (!form.name || !form.roll_no) {
      setMsg("Name and roll are required");
      return;
    }

    // If only classGroupId selected, try to auto-fill department_id & batch_id
    let deptIdToSend = deptBatchClass.deptId;
    let batchIdToSend = deptBatchClass.batchId;
    const classGroupIdToSend = deptBatchClass.classGroupId;
    if (classGroupIdToSend && (!deptIdToSend || !batchIdToSend)) {
      try {
        const resp = await axios.get(`${API_BASE}/api/classgroups/`);
        const list = resp.data || [];
        const found = list.find((c) => String(c.id) === String(classGroupIdToSend));
        if (found) {
          deptIdToSend = deptIdToSend || String(found.department_id || "");
          batchIdToSend = batchIdToSend || String(found.batch_id || "");
        }
      } catch (err) {
        // silent fallback: proceed without auto-fill
        console.warn("Could not fetch classgroups to auto-fill dept/batch", err);
      }
    }

    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("roll_no", form.roll_no);
    // backend serializer expects department_id / batch_id / class_group_id
    if (deptIdToSend) fd.append("department_id", deptIdToSend);
    if (batchIdToSend) fd.append("batch_id", batchIdToSend);
    if (classGroupIdToSend) fd.append("class_group_id", classGroupIdToSend);
    if (imageBlob) {
      const filename = `${form.roll_no || "student"}.jpg`;
      fd.append("image", imageBlob, filename);
    }

    try {
      const token = localStorage.getItem("admin_token");
      const headers = token ? { Authorization: `Token ${token}` } : {};
      // POST to DRF students endpoint so FK fields are saved properly
      const url = `${API_BASE}/api/students/`;
      const resp = await axios.post(url, fd, { headers });
      const created = resp?.data;
      const roll = created?.roll_no || form.roll_no;
      navigate(`/admin/student/${roll}`);
    } catch (err) {
      console.error("Add student failed", err);
      const em = err?.response?.data?.detail || err?.response?.data || err.message;
      setMsg(String(em || "Failed to add student"));
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Add Student</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded shadow">
        <div>
          <label className="block text-sm">Name</label>
          <input
            className="w-full border px-3 py-2 rounded"
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className="block text-sm">Roll No</label>
          <input
            className="w-full border px-3 py-2 rounded"
            value={form.roll_no}
            onChange={(e) => setForm((s) => ({ ...s, roll_no: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Department / Batch / Class</label>
            <ChainedSelects onChange={handleChainedChange} />
        </div>

        <div>
          <label className="block text-sm mb-1">Photo</label>
          <div className="flex gap-2 items-center">
            <input type="file" accept="image/*" onChange={handleFile} />
            <button type="button" onClick={() => setShowCamera((s) => !s)} className="px-3 py-1 border rounded">
              {showCamera ? "Close Camera" : "Use Camera"}
            </button>
            {preview && (
              <img src={preview} alt="preview" className="w-20 h-20 object-cover border rounded" />
            )}
          </div>
          {showCamera && (
            <div className="mt-2">
              <video ref={videoRef} autoPlay playsInline className="w-full max-w-sm border rounded" />
              <div className="mt-2">
                <button type="button" onClick={handleCapture} className="px-3 py-1 bg-blue-600 text-white rounded">Capture</button>
                <canvas ref={canvasRef} style={{ display: "none" }} />
              </div>
            </div>
          )}
        </div>

        {msg && <div className="text-sm text-red-600">{msg}</div>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => navigate(-1)} className="px-3 py-1 border rounded">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">Save</button>
        </div>
      </form>
    </div>
  );
}
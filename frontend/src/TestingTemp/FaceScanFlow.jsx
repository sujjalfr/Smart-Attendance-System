import React, { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
// import AdminUI from './AdminUI';
const API_URL = "http://127.0.0.1:8000/attendance/";
const ADMIN_PIN = "1234";

const FaceScanFlow = () => {
  const [step, setStep] = useState("choose");
  const [rollNo, setRollNo] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [result, setResult] = useState(null);
  const webcamRef = useRef(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");

  // For continuous capture
  const [isCapturing, setIsCapturing] = useState(false);
  const processingRef = useRef(false); // avoid race conditions

  // helper to stop camera
  const stopCamera = () => {
    try {
      const video = webcamRef.current && webcamRef.current.video;
      if (video && video.srcObject) {
        const tracks = video.srcObject.getTracks() || [];
        tracks.forEach((t) => {
          try { t.stop(); } catch {}
        });
        try { video.srcObject = null } catch {}
      }
    } catch {}
  };

  // ensure camera is stopped when leaving face step or unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    let intervalId;
    if (step === "face") {
      setIsCapturing(true);
      processingRef.current = false;
      intervalId = setInterval(async () => {
        if (
          webcamRef.current &&
          !processingRef.current &&
          isCapturing &&
          rollNo
        ) {
          processingRef.current = true;
          const imageSrc = webcamRef.current.getScreenshot();
          if (!imageSrc) {
            processingRef.current = false;
            return;
          }
          try {
            const blob = await (await fetch(imageSrc)).blob();
            const formData = new FormData();
            formData.append("roll_no", rollNo);
            formData.append("image", blob, "face.jpg");
            const response = await fetch(API_URL, {
              method: "POST",
              body: formData,
            });
            const data = await response.json();
            if (data.message && data.message.startsWith("Attendance marked")) {
              setResult({
                success: true,
                name: data.message.split("for ")[1],
                rollNo,
              });
              setIsCapturing(false);
            } else if (data.error === "No face detected in image") {
              // No face, keep scanning
              processingRef.current = false;
            } else {
              setResult({
                success: false,
                error: data.error || data.message,
              });
              setIsCapturing(false);
            }
          } catch {
            setResult({ success: false, error: "Network error" });
            setIsCapturing(false);
          }
        }
      }, 500);
    }
    // when leaving face step, ensure camera is stopped
    if (step !== "face") stopCamera();

    return () => {
      // cleanup interval and stop camera
      if (intervalId) clearInterval(intervalId);
      stopCamera();
    };
  }, [step, rollNo, isCapturing]);

  const handleExitClick = () => setShowPinModal(true);

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      setIsAdmin(true);
      setShowPinModal(false);
      setError("");
    } else {
      setError("Incorrect Pin. Access Denied.");
    }
  };

  if (isAdmin) {
    return <AdminUI />;
  }

  return (
    <div>
      <button
        style={{ position: "absolute", top: 10, right: 10 }}
        onClick={handleExitClick}
      >
        Exit
      </button>
      {showPinModal && (
        <div className="modal">
          <form onSubmit={handlePinSubmit}>
            <label>
              Enter Admin PIN:
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoFocus
              />
            </label>
            <button type="submit">Enter</button>
            {error && <div style={{ color: "red" }}>{error}</div>}
          </form>
        </div>
      )}
      {step === "choose" && (
        <div>
          <h2>Choose Input Method</h2>
          <button onClick={() => setStep("manual")}>Enter Roll No Manually</button>
          <button onClick={() => setStep("face")}>Scan Face</button>
        </div>
      )}
      {step === "manual" && (
        <form onSubmit={handleManualSubmit}>
          <h2>Enter Roll No</h2>
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Roll No"
            required
          />
          <button type="submit">Submit</button>
          <button type="button" onClick={() => setStep("choose")}>
            Back
          </button>
        </form>
      )}
      {step === "face" && (
        <div>
          <h2>Scan Face for Roll No: {rollNo}</h2>
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            width={320}
            height={240}
            videoconstraints={{ facingMode: "user" }}
          />
          <br />
          <p>
            {isCapturing
              ? "Scanning for face... Please look at the camera."
              : "Stopped."}
          </p>
        </div>
      )}
      {result && (
        <div>
          {result.success ? (
            <div>
              <h3>Face scan success!</h3>
              <p>Name: {result.name}</p>
              <p>Roll No: {result.rollNo}</p>
              <button
                onClick={() => {
                  setResult(null);
                  setStep("choose");
                  setRollNo("");
                }}
              >
                Start Over
              </button>
            </div>
          ) : (
            <div>
              <h3>Face scan failed!</h3>
              <p>{result.error}</p>
              <button
                className="px-4 py-2 bg-green-500 text-white rounded"
                onClick={() => {
                  setResult(null);
                  setStep("face");
                  setIsCapturing(true);
                }}
              >
                Rescan Face
              </button>
              <button
                className="px-4 py-2 bg-green-500 text-white rounded"
                onClick={() => {
                  setResult(null);
                  setStep("manual");
                  setRollNo("");
                }}
              >
                Re-enter Roll No
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function AdminUI() {
  return (
    <div>
      <h2>Admin Panel</h2>
      <button>Add Student</button>
      <button>Manage Students</button>
      <button>Manage Attendance</button>
      {/* Add other admin features here */}
    </div>
  );
}

export default FaceScanFlow;

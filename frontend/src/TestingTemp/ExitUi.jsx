import React, { useState } from "react";

const ADMIN_PIN = "1234"; // Replace with secure storage in production

function ExitUi() {
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");

  const handleExitClick = () => setShowPinModal(true);

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      setIsAdmin(true);
      setShowPinModal(false);
      setError("");
    } else {
      setError("Incorrect PIN. Access denied.");
    }
  };

  if (isAdmin) {
    return <AdminUI />;
  }

  return (
    <div>
      <button style={{ position: "absolute", top: 10, right: 10 }} onClick={handleExitClick}>
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
      {/* Main app content here */}
    </div>
  );
}

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

export default ExitUi;

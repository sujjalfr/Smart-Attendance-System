import React from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Admin/Sidebar";
import AddTeacher from "../components/Admin/TeacherManagement/AddTeacher";

export default function AdminAddTeacher() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const navigate = useNavigate();

  return (
    <div className="flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 p-6">
        <div className="max-w-full mx-0">
          <AddTeacher onCancel={() => navigate(-1)} onCreated={(t) => { /* navigation handled by AddTeacher */ }} />
        </div>
      </main>
    </div>
  );
}

import React from "react";
import Sidebar from "../components/Admin/Sidebar";
import ManageTeacher from "../components/Admin/TeacherManagement/ManageTeacher";

export default function AdminTeachers() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  return (
    <div className="flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 p-6">
        <div className="max-w-full mx-0">
          <ManageTeacher />
        </div>
      </main>
    </div>
  );
}

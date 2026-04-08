import React from "react";
import Sidebar from "../components/Admin/Sidebar";
import ManageStudent from "../components/Admin/StudentManagement/ManageStudent";

export default function AdminStudentsPage() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  return (
    <div className="flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <ManageStudent />
        </div>
      </main>
    </div>
  );
}

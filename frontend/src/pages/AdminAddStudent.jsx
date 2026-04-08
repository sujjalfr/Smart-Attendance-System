import React from "react";
import Sidebar from "../components/Admin/Sidebar";
import AddStudent from "../components/Admin/StudentManagement/AddStudent";

export default function AdminAddStudent() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  return (
    <div className="flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <AddStudent />
        </div>
      </main>
    </div>
  );
}

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// import FaceScan from './TestingTemp/FaceScan'
// import FaceScanFlow from './TestingTemp/FaceScanFlow'
// import ExitUi from './FaceScanFlowTemp/ExitUi'
import AttendancePage from './pages/AttendancePage'
import HomePage from './pages/HomePage'
import AdminDashboard  from './pages/AdminDashboard'
import AdminStudentsPage from './pages/AdminStudents'
import AdminTeachers from './pages/AdminTeachers'
import AdminSendEmail from './pages/AdminSendEmail'
import AdminAddTeacher from './pages/AdminAddTeacher'
import AdminSettings from './pages/AdminSettings'
import StudentDetail from './pages/StudentDetail'
import TeacherDetail from './pages/TeacherDetail'
import AddStudent from "./components/Admin/StudentManagement/AddStudent";
import AdminLookups from "./pages/AdminLookups";

// NEW: RequireAdmin wrapper
import RequireAdmin from "./components/Admin/RequireAdmin";

function App() {

  return (
    <div className="app-container">
    <Router>
         <Routes>
            <Route path="/" element={<AttendancePage />} />
            <Route path="/home" element={<HomePage />} />

            {/* Protected admin routes */}
            <Route path="/admin" element={
              <RequireAdmin>
                <AdminDashboard />
              </RequireAdmin>
            } />
            <Route path="/admin/lookups" element={
              <RequireAdmin>
                <AdminLookups />
              </RequireAdmin>
            } />
            <Route path="/admin/students" element={
              <RequireAdmin>
                <AdminStudentsPage />
              </RequireAdmin>
            } />
            <Route path="/admin/teachers" element={
              <RequireAdmin>
                <AdminTeachers />
              </RequireAdmin>
            } />
            <Route path="/admin/students/add" element={
              <RequireAdmin>
                <AddStudent />
              </RequireAdmin>
            } />
            <Route path="/admin/teachers/add" element={
              <RequireAdmin>
                <AdminAddTeacher />
              </RequireAdmin>
            } />
            <Route path="/admin/send-email" element={
              <RequireAdmin>
                <AdminSendEmail />
              </RequireAdmin>
            } />
            <Route path="/admin/settings" element={
              <RequireAdmin>
                <AdminSettings />
              </RequireAdmin>
            } />
            <Route path="/admin/student" element={
              <RequireAdmin>
                <StudentDetail />
              </RequireAdmin>
            } />
            <Route path="/admin/student/:rollNo" element={
              <RequireAdmin>
                <StudentDetail />
              </RequireAdmin>
            } />
            <Route path="/admin/teacher/:employeeId" element={
              <RequireAdmin>
                <TeacherDetail />
              </RequireAdmin>
            } />
         </Routes>
    </Router>
    </div>
  )
}

export default App

    // <>
    //   {/* <FaceScan /> */}
    //   {/* <FaceScanFlow />*/}
    //   {/* <ExitUi />*/}
    //   <AttendancePage />
    // </>
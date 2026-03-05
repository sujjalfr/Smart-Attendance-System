import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// import FaceScan from './TestingTemp/FaceScan'
// import FaceScanFlow from './TestingTemp/FaceScanFlow'
// import ExitUi from './FaceScanFlowTemp/ExitUi'
import AttendancePage from './pages/AttendancePage'
import HomePage from './pages/HomePage'
import AdminDashboard  from './pages/AdminDashboard'
import AdminStudentsPage from './pages/AdminStudents'
import AdminSettings from './pages/AdminSettings'
import StudentDetail from './pages/StudentDetail'
import AddStudent from "./components/Admin/StudentManagement/AddStudent";
import AdminLookups from "./pages/AdminLookups";

// NEW: RequireAdmin wrapper
import RequireAdmin from "./components/Admin/RequireAdmin";

function App() {

  return (
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
            <Route path="/admin/students/add" element={
              <RequireAdmin>
                <AddStudent />
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
         </Routes>
    </Router>
  )
}

export default App

    // <>
    //   {/* <FaceScan /> */}
    //   {/* <FaceScanFlow />*/}
    //   {/* <ExitUi />*/}
    //   <AttendancePage />
    // </>
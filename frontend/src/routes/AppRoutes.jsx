import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout.jsx'
import useAuth, { getDashboardPath } from '../hooks/useAuth.js'
import ProtectedRoute from './ProtectedRoute.jsx'
import RoleRoute from './RoleRoute.jsx'
import Login from '../pages/Login.jsx'
import AdminDashboard from '../pages/admin/Dashboard.jsx'
import AdminTimetable from '../pages/admin/Timetable.jsx'
import AdminExams from '../pages/admin/Exams.jsx'
import CoordinatorDashboard from '../pages/coordinator/Dashboard.jsx'
import StudentDashboard from '../pages/student/Dashboard.jsx'
import StudentTimetable from '../pages/student/Timetable.jsx'
import StudentExams from '../pages/student/Exams.jsx'
import FacultyDashboard from '../pages/faculty/Dashboard.jsx'
import FacultyTimetable from '../pages/faculty/Timetable.jsx'
import ClubDashboard from '../pages/club/Dashboard.jsx'
import ClubBookings from '../pages/club/Bookings.jsx'
import Notifications from '../pages/Notifications.jsx'
import Assistant from '../pages/Assistant.jsx'
import AdminBookings from '../pages/admin/Bookings.jsx'
import AdminDisruptions from '../pages/admin/Disruptions.jsx'
import AdminScenarios from '../pages/admin/Scenarios.jsx'
import AdminConflicts from '../pages/admin/Conflicts.jsx'
import AdminDatasetManagement from '../pages/admin/DatasetManagement.jsx'
import AdminRooms from '../pages/admin/Rooms.jsx'
import AdminFaculty from '../pages/admin/Faculty.jsx'
import AdminAnalytics from '../pages/admin/Analytics.jsx'
import AdminAuditLogs from '../pages/admin/AuditLogs.jsx'
import AdminSettings from '../pages/admin/Settings.jsx'
import CoordinatorBookings from '../pages/coordinator/Bookings.jsx'
import StudentEvents from '../pages/student/Events.jsx'
import StudentNextClass from '../pages/student/NextClass.jsx'
import FacultyClasses from '../pages/faculty/Classes.jsx'
import Landing from '../pages/Landing.jsx'
import Register from '../pages/Register.jsx'

function LoginRoute() {
  const { isAuthenticated, role } = useAuth()
  return isAuthenticated ? <Navigate to={getDashboardPath(role)} replace /> : <Login />
}

function RegisterRoute() {
  const { isAuthenticated, role } = useAuth()
  return isAuthenticated ? <Navigate to={getDashboardPath(role)} replace /> : <Register />
}

function NotFound() {
  return <main className="mx-auto max-w-xl px-6 py-20 text-center"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">CIT CampusFlow</p><h1 className="mt-3 text-2xl font-semibold text-slate-900">Page not found</h1><p className="mt-2 text-sm text-slate-600">That page isn’t available.</p><a className="mt-5 inline-flex text-sm font-semibold text-teal-800 hover:text-teal-950" href="/">Return to your workspace</a></main>
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/register" element={<RegisterRoute />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="notifications" element={<Notifications />} />
          <Route element={<RoleRoute allowedRoles={['ADMIN','DEPARTMENT_COORDINATOR','FACULTY']} />}>
            <Route path="assistant" element={<Assistant />} />
          </Route>
          <Route path="/admin" element={<RoleRoute allowedRoles={['ADMIN']} />}>
            <Route index element={<AdminDashboard />} />
            <Route path="timetable" element={<AdminTimetable />} />
            <Route path="exams" element={<AdminExams />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="disruptions" element={<AdminDisruptions />} />
            <Route path="scenarios" element={<AdminScenarios />} />
            <Route path="conflicts" element={<AdminConflicts />} />
            <Route path="dataset" element={<AdminDatasetManagement />} />
            <Route path="rooms" element={<AdminRooms />} />
            <Route path="faculty" element={<AdminFaculty />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="audit" element={<AdminAuditLogs />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          <Route path="/coordinator" element={<RoleRoute allowedRoles={['DEPARTMENT_COORDINATOR']} />}>
            <Route index element={<CoordinatorDashboard />} />
            <Route path="bookings" element={<CoordinatorBookings />} />
            <Route path="timetable" element={<AdminTimetable />} />
            <Route path="conflicts" element={<AdminConflicts />} />
            <Route path="rooms" element={<AdminRooms />} />
            <Route path="faculty" element={<AdminFaculty />} />
          </Route>
          <Route path="/student" element={<RoleRoute allowedRoles={['STUDENT']} />}>
            <Route index element={<StudentDashboard />} />
            <Route path="timetable" element={<StudentTimetable />} />
            <Route path="exams" element={<StudentExams />} />
            <Route path="events" element={<StudentEvents />} />
            <Route path="next-class" element={<StudentNextClass />} />
          </Route>
          <Route path="/faculty" element={<RoleRoute allowedRoles={['FACULTY']} />}>
            <Route index element={<FacultyDashboard />} />
            <Route path="timetable" element={<FacultyTimetable />} />
            <Route path="classes" element={<FacultyClasses />} />
          <Route path="bookings" element={<ClubBookings />} />
            <Route path="rooms" element={<AdminRooms />} />
          </Route>
          <Route path="/club" element={<RoleRoute allowedRoles={['CLUB_REPRESENTATIVE']} />}>
            <Route index element={<ClubDashboard />} />
            <Route path="bookings" element={<ClubBookings />} />
          </Route>
        </Route>
      </Route>
      <Route path="/" element={<Landing />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}




import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

// Layouts
import AuthLayout from '@/components/layout/AuthLayout'
import DashboardLayout from '@/components/layout/DashboardLayout'

// Auth pages
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'

// Patient pages
import PatientDashboard from '@/pages/patient/Dashboard'
import RecoveryLog from '@/pages/patient/RecoveryLog'
import CarePlan from '@/pages/patient/CarePlan'
import Medications from '@/pages/patient/Medications'
import Exercises from '@/pages/patient/Exercises'
import Appointments from '@/pages/patient/Appointments'
import Documents from '@/pages/patient/Documents'
import AIAssistant from '@/pages/patient/AIAssistant'
import WeeklyReport from '@/pages/patient/WeeklyReport'

// Doctor pages
import DoctorDashboard from '@/pages/doctor/Dashboard'
import PatientList from '@/pages/doctor/PatientList'
import PatientDetail from '@/pages/doctor/PatientDetail'
import CarePlanBuilder from '@/pages/doctor/CarePlanBuilder'

// Caregiver pages
import CaregiverDashboard from '@/pages/caregiver/Dashboard'
import CaregiverPatientList from '@/pages/caregiver/PatientList'
import CaregiverPatientDetail from '@/pages/caregiver/PatientDetail'

// Admin pages
import AdminDashboard from '@/pages/admin/Dashboard'

// Guards
import PrivateRoute from '@/components/auth/PrivateRoute'
import RoleRoute from '@/components/auth/RoleRoute'

export default function App() {
  const { user } = useAuthStore()

  return (
    <Routes>
      {/* Public auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected patient routes */}
      <Route element={<PrivateRoute />}>
        <Route element={<RoleRoute roles={['patient']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard"           element={<PatientDashboard />} />
            <Route path="/recovery-log"        element={<RecoveryLog />} />
            <Route path="/care-plan"           element={<CarePlan />} />
            <Route path="/medications"         element={<Medications />} />
            <Route path="/exercises"           element={<Exercises />} />
            <Route path="/appointments"        element={<Appointments />} />
            <Route path="/documents"           element={<Documents />} />
            <Route path="/ai-assistant"        element={<AIAssistant />} />
            <Route path="/weekly-report"       element={<WeeklyReport />} />
          </Route>
        </Route>

        {/* Protected doctor routes */}
        <Route element={<RoleRoute roles={['doctor']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/doctor/dashboard"           element={<DoctorDashboard />} />
            <Route path="/doctor/patients"            element={<PatientList />} />
            <Route path="/doctor/patients/:patientId" element={<PatientDetail />} />
            <Route path="/doctor/care-plans/new"      element={<CarePlanBuilder />} />
          </Route>
        </Route>

        {/* Protected admin routes */}
        <Route element={<RoleRoute roles={['admin']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Route>
        </Route>

        {/* Protected caregiver routes */}
        <Route element={<RoleRoute roles={['caregiver']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/caregiver/dashboard"           element={<CaregiverDashboard />} />
            <Route path="/caregiver/patients"            element={<CaregiverPatientList />} />
            <Route path="/caregiver/patients/:patientId" element={<CaregiverPatientDetail />} />
          </Route>
        </Route>
      </Route>

      {/* Default redirects */}
      <Route path="/" element={
        user
          ? <Navigate to={
              user.role === 'doctor'    ? '/doctor/dashboard' :
              user.role === 'admin'     ? '/admin/dashboard' :
              user.role === 'caregiver' ? '/caregiver/dashboard' :
              '/dashboard'
            } replace />
          : <Navigate to="/login" replace />
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

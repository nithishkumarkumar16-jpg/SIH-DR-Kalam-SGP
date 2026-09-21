import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "./ScrollToTop";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/Auth/ProtectedRoute";

// Auth & Role-Based Components
import Login from "./components/Auth/Login";
import RegisterStudent from "./components/Auth/RegisterStudent";
import ActivateAccount from "./components/Auth/ActivateAccount";
import StudentProfile from "./components/Student/StudentProfile";
import StudentApplication from "./components/Student/StudentApplication";
import ApplicationStatusTimeline from "./components/Student/ApplicationStatusTimeline";
import DeficiencyManager from "./components/Student/DeficiencyManager";
import CollegeDashboard from "./components/College/CollegeDashboard";
import MinistryDashboard from "./components/Ministry/MinistryDashboard";

// Existing SGP Student Guidance Components
import Dashboard from "./components/Dashboard/Dashboard";
import DocumentUpload from "./components/DocumentUpload/DocumentUpload";
import ScholarshipImportants from "./components/ScholarshipImportants/ScholarshipImportants";
import ReadinessDashboard from "./components/ReadinessDashboard/ReadinessDashboard";
import EligibilityEngine from "./components/EligibilityEngine/EligibilityEngine";
import RenewalAlert from "./components/RenewalAlert/RenewalAlert";
import Reports from "./components/Reports/Reports";
import ScholarshipChat from "./components/ScholarshipChat/ScholarshipChat";
import NSPReadiness from "./components/NSPReadiness/NSPReadiness";
import "./App.css";

function App() {
  return (
    <Router>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          {/* Public / Core Navigation */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegisterStudent />} />
          <Route path="/activate-account" element={<ActivateAccount />} />

          {/* Existing SGP Guidance & Tool Routes */}
          <Route path="/documents" element={<DocumentUpload />} />
          <Route path="/scholarship" element={<ScholarshipImportants />} />
          <Route path="/readiness" element={<ReadinessDashboard />} />
          <Route path="/eligibility" element={<EligibilityEngine />} />
          <Route path="/renewal" element={<RenewalAlert />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/nsp" element={<NSPReadiness />} />

          {/* Student Role-Protected Routes */}
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute allowedRoles={["STUDENT"]}>
                <StudentProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/application"
            element={
              <ProtectedRoute allowedRoles={["STUDENT"]}>
                <StudentApplication />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/status"
            element={
              <ProtectedRoute allowedRoles={["STUDENT"]}>
                <ApplicationStatusTimeline />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/deficiencies"
            element={
              <ProtectedRoute allowedRoles={["STUDENT"]}>
                <DeficiencyManager />
              </ProtectedRoute>
            }
          />

          {/* College Role-Protected Routes */}
          <Route
            path="/college/dashboard"
            element={
              <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "COLLEGE_STAFF"]}>
                <CollegeDashboard />
              </ProtectedRoute>
            }
          />

          {/* Ministry Role-Protected Routes */}
          <Route
            path="/ministry/dashboard"
            element={
              <ProtectedRoute allowedRoles={["MINISTRY_ADMIN", "MINISTRY_REVIEWER", "MINISTRY_APPROVER"]}>
                <MinistryDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <ScholarshipChat />
      </AuthProvider>
    </Router>
  );
}

export default App;


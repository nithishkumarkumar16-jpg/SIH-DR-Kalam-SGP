import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", fontFamily: "sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>Verifying Portal Authentication...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return (
      <div style={{ maxWidth: "600px", margin: "60px auto", padding: "30px", background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: "12px", textAlign: "center", fontFamily: "sans-serif" }}>
        <div style={{ fontSize: "40px", marginBottom: "10px" }}>🚫</div>
        <h2 style={{ color: "#991b1b", margin: "0 0 10px 0" }}>Access Restricted</h2>
        <p style={{ color: "#7f1d1d", fontSize: "14px", lineHeight: "1.5" }}>
          Your current account role (<strong>{user?.role}</strong>) does not have authorization to view this portal area.
        </p>
        <div style={{ marginTop: "20px" }}>
          <a
            href="/dashboard"
            style={{ display: "inline-block", padding: "10px 20px", background: "#02065cff", color: "#fff", textDecoration: "none", borderRadius: "8px", fontWeight: 700, fontSize: "13px" }}
          >
            Return to Main Portal
          </a>
        </div>
      </div>
    );
  }

  return children;
}

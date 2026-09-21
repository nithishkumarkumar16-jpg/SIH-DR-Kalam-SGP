import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [activeTab, setActiveTab] = useState("STUDENT"); // STUDENT | COLLEGE | MINISTRY
  const [email, setEmail] = useState("student@sgp.gov.in");
  const [password, setPassword] = useState("Student@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cooldown, setCooldown] = useState(0);

  // Live countdown timer for rate-limit cooldown
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleTabChange = (tab) => {
    if (loading) return;
    setActiveTab(tab);
    setError(null);
    if (tab === "STUDENT") {
      setEmail("student@sgp.gov.in");
      setPassword("Student@123");
    } else if (tab === "COLLEGE") {
      setEmail("college@sgp.gov.in");
      setPassword("College@123");
    } else if (tab === "MINISTRY") {
      setEmail("ministry@sgp.gov.in");
      setPassword("Ministry@123");
    }
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (loading || cooldown > 0) return; // Prevent duplicate submissions or submitting during cooldown

    setLoading(true);
    setError(null);

    try {
      const user = await login(email, password, activeTab);
      if (user.role === "STUDENT") {
        navigate("/dashboard");
      } else if (user.role.startsWith("COLLEGE")) {
        navigate("/college/dashboard");
      } else if (user.role.startsWith("MINISTRY")) {
        navigate("/ministry/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      if (err.status === 429) {
        const waitTime = err.retryAfter || 60;
        setCooldown(waitTime);
        setError(`Too many login attempts. Please wait ${waitTime}s before retrying.`);
      } else {
        setError(err.message || "Failed to log in. Please check credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-top-brand">
        <img src="/sgp-emblem.png" alt="SGP Emblem" className="login-brand-logo" />
        <div>
          <h1>Scholarship Guidance Platform (SGP)</h1>
          <p>National Portal for Scholarship &amp; Fellowship Management (SIH 2026)</p>
        </div>
      </div>

      <div className="login-card-container">
        {/* Role Portal Tabs */}
        <div className="portal-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === "STUDENT" ? "active" : ""}`}
            onClick={() => handleTabChange("STUDENT")}
          >
            🎓 Student Portal
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "COLLEGE" ? "active" : ""}`}
            onClick={() => handleTabChange("COLLEGE")}
          >
            🏛️ College Portal
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "MINISTRY" ? "active" : ""}`}
            onClick={() => handleTabChange("MINISTRY")}
          >
            🇮🇳 Ministry Portal
          </button>
        </div>

        {/* Card Body */}
        <div className="login-card">
          <div className="login-card-header">
            <h2>
              {activeTab === "STUDENT" && "Student Login"}
              {activeTab === "COLLEGE" && "College Staff & Administrator Login"}
              {activeTab === "MINISTRY" && "Ministry Scrutiny & Approver Login"}
            </h2>
            <p>
              {activeTab === "STUDENT" && "Access your scholarship applications, document verification, and status timeline."}
              {activeTab === "COLLEGE" && "Verify student bonafide records, inspect OCR extractions, and forward applications."}
              {activeTab === "MINISTRY" && "National & state monitoring, scheme scrutiny, selection awards, and payment tracking."}
            </p>
          </div>

          {error && <div className="login-error-box">⚠️ {error}</div>}

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label>Official Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@sgp.gov.in"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>

            <button type="submit" className="submit-login-btn" disabled={loading || cooldown > 0}>
              {cooldown > 0
                ? `⏳ Rate-limited (Retry in ${cooldown}s)`
                : loading
                ? "Authenticating..."
                : `Sign In to ${activeTab.charAt(0) + activeTab.slice(1).toLowerCase()} Portal →`}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="quick-demo-section">
            <span className="quick-demo-title">⚡ Quick-Fill Demo Credentials:</span>
            <div className="quick-demo-buttons">
              <button
                type="button"
                className="demo-pill-btn"
                disabled={loading || cooldown > 0}
                onClick={() => {
                  if (loading || cooldown > 0) return;
                  setActiveTab("STUDENT");
                  setEmail("student@sgp.gov.in");
                  setPassword("Student@123");
                }}
              >
                👤 Student (Priya M - ST)
              </button>
              <button
                type="button"
                className="demo-pill-btn"
                disabled={loading || cooldown > 0}
                onClick={() => {
                  if (loading || cooldown > 0) return;
                  setActiveTab("COLLEGE");
                  setEmail("college@sgp.gov.in");
                  setPassword("College@123");
                }}
              >
                🏛️ College Admin (GCT)
              </button>
              <button
                type="button"
                className="demo-pill-btn"
                disabled={loading || cooldown > 0}
                onClick={() => {
                  if (loading || cooldown > 0) return;
                  setActiveTab("MINISTRY");
                  setEmail("reviewer@sgp.gov.in");
                  setPassword("Reviewer@123");
                }}
              >
                🔍 Ministry Reviewer
              </button>
              <button
                type="button"
                className="demo-pill-btn"
                disabled={loading || cooldown > 0}
                onClick={() => {
                  if (loading || cooldown > 0) return;
                  setActiveTab("MINISTRY");
                  setEmail("ministry@sgp.gov.in");
                  setPassword("Ministry@123");
                }}
              >
                👑 Ministry Admin
              </button>
            </div>
          </div>

          <div className="login-card-footer">
            {activeTab === "STUDENT" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <p>
                  Received an invitation from your college?{" "}
                  <Link to="/activate-account" style={{ fontWeight: 700, color: "#059669" }}>
                    Activate Invited Account &amp; Set Password →
                  </Link>
                </p>
                <p>
                  New student self-registration? <Link to="/register">Create Student Account</Link>
                </p>
              </div>
            ) : (
              <p>Institutional access restricted. Unauthorized access is monitored.</p>
            )}
            <Link to="/dashboard" className="return-home-link">
              ← Return to SGP Main Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

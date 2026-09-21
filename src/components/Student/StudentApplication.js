import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiRequest } from "../../utils/api";
import LanguageSelector from "../LanguageSelector/LanguageSelector";
import "./StudentApplication.css";

export default function StudentApplication() {
  const navigate = useNavigate();
  const location = useLocation();

  const [applications, setApplications] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [appsData, schemesData] = await Promise.all([
        apiRequest("/api/student/applications"),
        apiRequest("/api/common/schemes"),
      ]);
      setApplications(appsData?.applications || []);
      const fetchedSchemes = schemesData?.schemes || [];
      setSchemes(fetchedSchemes);

      const params = new URLSearchParams(location.search);
      const schemeQuery = (params.get("scheme") || "").toLowerCase().trim();

      if (schemeQuery && fetchedSchemes.length > 0) {
        const matched = fetchedSchemes.find(
          s => (s.schemeId && s.schemeId.toLowerCase().includes(schemeQuery)) ||
               (s.schemeName && s.schemeName.toLowerCase().includes(schemeQuery)) ||
               (s.schemeCode && s.schemeCode.toLowerCase().includes(schemeQuery))
        );
        if (matched) {
          setSelectedSchemeId(matched.schemeId);
        } else {
          setSelectedSchemeId(fetchedSchemes[0].schemeId);
        }
      } else if (fetchedSchemes.length > 0) {
        setSelectedSchemeId(fetchedSchemes[0].schemeId);
      }
    } catch (err) {
      setError("Failed to load application data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApplication = async (e) => {
    e.preventDefault();
    if (!selectedSchemeId) return;
    setError(null);
    setMessage(null);

    try {
      await apiRequest("/api/student/applications", {
        method: "POST",
        body: JSON.stringify({ schemeId: selectedSchemeId }),
      });
      setMessage("Scholarship application initiated successfully!");
      loadData();
    } catch (err) {
      setError("Failed to initiate application: " + err.message);
    }
  };

  const handleSubmitApplication = async (appId) => {
    if (!window.confirm("Are you ready to submit this application to your college for official bonafide verification?")) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await apiRequest(`/api/student/applications/${appId}/submit`, {
        method: "POST",
      });
      setMessage("Application submitted successfully to your college!");
      loadData();
    } catch (err) {
      setError("Submission failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="student-app-page">
      <header className="app-header">
        <div className="app-header-container">
          <div className="brand" onClick={() => navigate("/dashboard")} style={{ cursor: "pointer" }}>
            <img src="/sgp-emblem.png" alt="SGP Emblem" />
            <div>
              <h2>Scholarship Guidance Platform</h2>
              <p>Application Lifecycle &amp; Pre-Submission Management</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="nav-back-btn" onClick={() => navigate("/dashboard")}>
              ← Back to Dashboard
            </button>
            <LanguageSelector />
          </div>
        </div>
      </header>

      <main className="app-main-container">
        <div className="app-hero">
          <div>
            <h1>Scholarship Applications</h1>
            <p>Manage your scheme applications, document verification results, and status transitions.</p>
          </div>
          <button className="btn-secondary" onClick={() => navigate("/student/profile")}>
            👤 View My Profile
          </button>
        </div>

        {message && <div className="alert alert-success">✅ {message}</div>}
        {error && <div className="alert alert-error">⚠️ {error}</div>}

        {/* INITIATE NEW APPLICATION */}
        <div className="create-app-card">
          <h3>➕ Start a New Scholarship / Fellowship Application</h3>
          <p>Select an approved government scheme to generate an official SGP tracking record.</p>
          <form onSubmit={handleCreateApplication} className="create-form">
            <select
              value={selectedSchemeId}
              onChange={(e) => setSelectedSchemeId(e.target.value)}
              className="scheme-select"
            >
              {schemes.map((s) => (
                <option key={s.schemeId} value={s.schemeId}>
                  [{s.schemeType}] {s.schemeName} (Income Ceiling: ₹{s.maxIncome.toLocaleString("en-IN")})
                </option>
              ))}
            </select>
            <button type="submit" className="start-app-btn">
              Create Application Draft →
            </button>
          </form>
        </div>

        {/* EXISTING APPLICATIONS */}
        <div className="apps-list-section">
          <h2>My Active Applications ({applications.length})</h2>

          {loading ? (
            <p style={{ color: "#64748b" }}>Loading applications...</p>
          ) : applications.length === 0 ? (
            <div className="empty-apps-box">
              <div style={{ fontSize: "36px", marginBottom: "10px" }}>📄</div>
              <h4>No applications yet</h4>
              <p>Select a scheme above to start your scholarship application draft.</p>
            </div>
          ) : (
            <div className="apps-grid">
              {applications.map((app) => {
                const schemeObj = schemes.find((s) => s.schemeId === app.schemeId);
                const isDraft = ["DRAFT", "CORRECTION_REQUIRED", "RESUBMITTED"].includes(app.applicationStatus);

                return (
                  <div key={app.applicationId} className="app-card">
                    <div className="app-card-top">
                      <div>
                        <span className="app-id-pill">{app.applicationId}</span>
                        <h3 className="scheme-title">{schemeObj?.schemeName || app.schemeId}</h3>
                      </div>
                      <span className={`status-badge status-${app.applicationStatus.toLowerCase()}`}>
                        {app.applicationStatus.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="app-meta-row">
                      <div>
                        <span className="meta-lbl">Current Stage:</span>
                        <strong className="meta-val">{app.currentStage}</strong>
                      </div>
                      <div>
                        <span className="meta-lbl">Action In Charge:</span>
                        <strong className="meta-val">{app.whoMustAct}</strong>
                      </div>
                      <div>
                        <span className="meta-lbl">OCR Verification:</span>
                        <span className={`doc-pill doc-${app.documentVerificationStatus.toLowerCase()}`}>
                          {app.documentVerificationStatus}
                        </span>
                      </div>
                      <div>
                        <span className="meta-lbl">Eligibility:</span>
                        <span className={`doc-pill doc-${app.eligibilityStatus.toLowerCase()}`}>
                          {app.eligibilityStatus}
                        </span>
                      </div>
                    </div>

                    <div className="next-action-callout">
                      <strong>Next Action:</strong> {app.nextAction}
                    </div>

                    <div className="app-actions-bar">
                      <button
                        type="button"
                        className="btn-track"
                        onClick={() => navigate("/student/status")}
                      >
                        📊 View Status Timeline
                      </button>

                      <button
                        type="button"
                        className="btn-verify"
                        onClick={() => navigate("/documents")}
                      >
                        📑 Upload / OCR Check
                      </button>

                      {app.applicationStatus === "CORRECTION_REQUIRED" && (
                        <button
                          type="button"
                          className="btn-deficiency"
                          onClick={() => navigate("/student/deficiencies")}
                        >
                          ⚠️ Resolve Deficiencies ({app.openDeficienciesCount || 1})
                        </button>
                      )}

                      {isDraft && (
                        <button
                          type="button"
                          className="btn-submit"
                          disabled={submitting}
                          onClick={() => handleSubmitApplication(app.applicationId)}
                        >
                          🚀 Submit to College
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

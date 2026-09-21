import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../utils/api";
import LanguageSelector from "../LanguageSelector/LanguageSelector";
import "./ApplicationStatusTimeline.css";

const TIMELINE_STAGES = [
  { key: "DRAFT", label: "Application Created", icon: "📝" },
  { key: "DOCUMENT_VERIFICATION", label: "Documents Uploaded & OCR", icon: "📑" },
  { key: "ELIGIBILITY_CONFIRMED", label: "Eligibility Pre-Check", icon: "🎯" },
  { key: "COLLEGE_REVIEW", label: "College Verification", icon: "🏛️" },
  { key: "CORRECTION_REQUIRED", label: "Correction / Resubmission", icon: "⚠️" },
  { key: "MINISTRY_SCRUTINY", label: "Ministry Scrutiny", icon: "🇮🇳" },
  { key: "SELECTION", label: "Selection Committee", icon: "⭐" },
  { key: "SANCTIONED", label: "Award & Sanction", icon: "📜" },
  { key: "PAID", label: "DBT Payment Credit", icon: "💳" },
  { key: "COMPLETED", label: "Renewal / Completion", icon: "🎓" },
];

export default function ApplicationStatusTimeline() {
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState("");
  const [appDetails, setAppDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("/api/student/applications")
      .then((data) => {
        if (data?.applications && data.applications.length > 0) {
          setApplications(data.applications);
          setSelectedAppId(data.applications[0].applicationId);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedAppId) return;
    setLoading(true);
    apiRequest(`/api/student/applications/${selectedAppId}`)
      .then((data) => {
        setAppDetails(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedAppId]);

  const app = appDetails?.application;
  const history = appDetails?.statusHistory || [];
  const verifications = appDetails?.verifications || [];

  // Determine stage progression
  const getStageStatus = (stageKey) => {
    if (!app) return "upcoming";
    const current = app.applicationStatus;

    if (current === "PAID") return "completed";
    if (stageKey === "DRAFT") return "completed";

    if (stageKey === "DOCUMENT_VERIFICATION") {
      return verifications.length > 0 ? "completed" : (current === "DRAFT" ? "current" : "completed");
    }
    if (stageKey === "ELIGIBILITY_CONFIRMED") {
      return app.eligibilityStatus === "ELIGIBLE" ? "completed" : "current";
    }
    if (stageKey === "COLLEGE_REVIEW") {
      if (["SUBMITTED", "COLLEGE_REVIEW"].includes(current)) return "current";
      if (["CORRECTION_REQUIRED", "MINISTRY_SCRUTINY", "SELECTED", "SANCTIONED", "PAID"].includes(current)) return "completed";
      return "upcoming";
    }
    if (stageKey === "CORRECTION_REQUIRED") {
      if (current === "CORRECTION_REQUIRED") return "alert";
      if (["RESUBMITTED", "MINISTRY_SCRUTINY", "SELECTED", "PAID"].includes(current)) return "completed";
      return "upcoming";
    }
    if (stageKey === "MINISTRY_SCRUTINY") {
      if (current === "MINISTRY_SCRUTINY") return "current";
      if (["SELECTED", "SANCTIONED", "PAID"].includes(current)) return "completed";
      return "upcoming";
    }
    if (stageKey === "SELECTION") {
      if (["SELECTED", "SANCTIONED", "PAID"].includes(current)) return "completed";
      if (current === "NOT_SELECTED") return "alert";
      return "upcoming";
    }
    if (stageKey === "PAID") {
      return current === "PAID" ? "completed" : "upcoming";
    }

    return "upcoming";
  };

  return (
    <div className="status-page">
      <header className="status-header">
        <div className="status-header-container">
          <div className="brand" onClick={() => navigate("/dashboard")} style={{ cursor: "pointer" }}>
            <img src="/sgp-emblem.png" alt="SGP Emblem" />
            <div>
              <h2>Scholarship Guidance Platform</h2>
              <p>End-to-End Application Status Timeline</p>
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

      <main className="status-main-container">
        {/* APP SELECTOR */}
        {applications.length > 1 && (
          <div className="app-select-bar">
            <label>Select Application to Track:</label>
            <select value={selectedAppId} onChange={(e) => setSelectedAppId(e.target.value)}>
              {applications.map((a) => (
                <option key={a.applicationId} value={a.applicationId}>
                  {a.applicationId} ({a.schemeId}) — {a.applicationStatus}
                </option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#64748b" }}>Loading timeline...</div>
        ) : !app ? (
          <div style={{ textAlign: "center", padding: "60px", background: "#fff", borderRadius: "12px" }}>
            <h3>No Application Selected</h3>
            <p>Initiate an application from the applications page.</p>
            <button className="nav-back-btn" style={{ background: "#02065c" }} onClick={() => navigate("/student/application")}>
              View Applications
            </button>
          </div>
        ) : (
          <div>
            {/* TOP KPI STATUS CARD */}
            <div className="status-kpi-card">
              <div className="kpi-top">
                <div>
                  <span className="app-badge">{app.applicationId}</span>
                  <h2>{appDetails?.scheme?.schemeName || app.schemeId}</h2>
                  <p className="sub-txt">
                    Institution: <strong>{appDetails?.college?.collegeName || app.collegeId}</strong> &bull; Academic Year: <strong>{app.academicYear}</strong>
                  </p>
                </div>
                <div className="kpi-status-box">
                  <span className="kpi-lbl">Official Current Status</span>
                  <div className={`status-pill pill-${app.applicationStatus.toLowerCase()}`}>
                    {app.applicationStatus.replace(/_/g, " ")}
                  </div>
                </div>
              </div>

              <div className="action-strip">
                <div className="strip-col">
                  <span>Current Stage</span>
                  <strong>{app.currentStage}</strong>
                </div>
                <div className="strip-col">
                  <span>Who Must Act</span>
                  <strong style={{ color: "#2563eb" }}>{app.whoMustAct}</strong>
                </div>
                <div className="strip-col">
                  <span>Next Action</span>
                  <strong>{app.nextAction}</strong>
                </div>
                <div className="strip-col">
                  <span>Last Updated</span>
                  <strong>{new Date(app.lastUpdatedAt || app.createdAt).toLocaleDateString()}</strong>
                </div>
              </div>
            </div>

            {/* DEFICIENCY ALERT BANNER */}
            {app.applicationStatus === "CORRECTION_REQUIRED" && (
              <div className="deficiency-banner">
                <div style={{ fontSize: "28px" }}>⚠️</div>
                <div style={{ flex: 1 }}>
                  <h4>Deficiency / Correction Required by College</h4>
                  <p>Your college authority flagged document or identity discrepancies. Please resolve them to proceed.</p>
                </div>
                <button
                  type="button"
                  className="def-action-btn"
                  onClick={() => navigate("/student/deficiencies")}
                >
                  Resolve Deficiencies →
                </button>
              </div>
            )}

            {/* OFFICIAL GOVERNMENT PORTAL STATUS TRACKING (Part 11) */}
            <div className="external-portal-card">
              <div className="ext-hd">
                <h3>🏛️ Official Government Portal Tracking</h3>
                <span className="portal-sync-badge">Manual Authorized Status</span>
              </div>
              <p style={{ fontSize: "12.5px", color: "#64748b", margin: "0 0 14px 0" }}>
                Tracks status updates from central/state portals (e.g. NSP scholarships.gov.in or State Welfare).
              </p>

              <div className="ext-grid">
                <div>
                  <span className="ext-lbl">External Application ID</span>
                  <strong className="ext-val">{app.externalApplicationId || "Not registered yet"}</strong>
                </div>
                <div>
                  <span className="ext-lbl">Portal Source</span>
                  <strong className="ext-val">{app.externalPortalSource || "National Scholarship Portal (NSP)"}</strong>
                </div>
                <div>
                  <span className="ext-lbl">External Status</span>
                  <strong className="ext-val" style={{ color: "#059669" }}>
                    {app.externalStatus ? app.externalStatus.replace(/_/g, " ") : "Pending Verification"}
                  </strong>
                </div>
                <div>
                  <span className="ext-lbl">Last Checked</span>
                  <strong className="ext-val">
                    {app.externalLastChecked ? new Date(app.externalLastChecked).toLocaleDateString() : "Recently"}
                  </strong>
                </div>
              </div>

              {app.externalEvidence && (
                <div className="ext-evidence">
                  <strong>Verification Evidence / Reference:</strong> {app.externalEvidence}
                </div>
              )}
            </div>

            {/* 10-STAGE TIMELINE TRACKER */}
            <div className="timeline-section-card">
              <h3>Lifecycle Status Progression</h3>
              <div className="timeline-track">
                {TIMELINE_STAGES.map((stg, idx) => {
                  const state = getStageStatus(stg.key);
                  return (
                    <div key={stg.key} className={`timeline-node state-${state}`}>
                      <div className="node-icon-circle">
                        {stg.icon}
                      </div>
                      <div className="node-info">
                        <strong>{stg.label}</strong>
                        <span className="node-tag">
                          {state === "completed" && "Completed"}
                          {state === "current" && "In Progress"}
                          {state === "alert" && "Action Required"}
                          {state === "upcoming" && "Pending"}
                        </span>
                      </div>
                      {idx < TIMELINE_STAGES.length - 1 && <div className="node-connector"></div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AUDIT & STATUS HISTORY */}
            <div className="history-section-card">
              <h3>📜 Official Status Audit History ({history.length})</h3>
              {history.length === 0 ? (
                <p style={{ color: "#64748b" }}>No status transitions recorded yet.</p>
              ) : (
                <div className="history-list">
                  {history.map((h, i) => (
                    <div key={i} className="history-item">
                      <div className="history-dot"></div>
                      <div className="history-content">
                        <div className="history-top">
                          <strong>{h.newStatus.replace(/_/g, " ")}</strong>
                          <span className="history-time">{new Date(h.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="history-reason">{h.reason}</p>
                        <span className="history-meta">
                          Changed by: <em>{h.changedByRole}</em> &bull; Source: {h.source}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

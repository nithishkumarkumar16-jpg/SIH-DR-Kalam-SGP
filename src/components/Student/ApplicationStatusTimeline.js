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
  { key: "MINISTRY_SCRUTINY", label: "Ministry Scrutiny", icon: "🏢" },
  { key: "SELECTION", label: "Selection Committee", icon: "⭐" },
  { key: "SANCTIONED", label: "Award & Sanction", icon: "📜" },
  { key: "PAID", label: "DBT Payment Credit", icon: "💳" },
  { key: "COMPLETED", label: "Renewal / Completion", icon: "🎓" },
];

const STAGE_OPTIONS = [
  { key: "COLLEGE_REVIEW", label: "In Process — College Verification", category: "in_process", icon: "🏛️", desc: "Institutional credentials & bonafide checking in progress" },
  { key: "CORRECTION_REQUIRED", label: "Document Issues — Correction Required", category: "document_issues", icon: "⚠️", desc: "Document discrepancies flagged, resubmission needed" },
  { key: "MINISTRY_SCRUTINY", label: "In Process — Ministry Scrutiny", category: "in_process", icon: "🏢", desc: "State/Ministry scrutiny verification in progress" },
  { key: "SELECTION", label: "In Process — Selection Committee", category: "in_process", icon: "⭐", desc: "Merit ranking and quota assessment" },
  { key: "SANCTIONED", label: "Process / Approved — Award & Sanction", category: "process", icon: "📜", desc: "Formal scholarship award letter and sanction generated" },
  { key: "PAID", label: "Process / DBT Payment Credit", category: "process", icon: "💳", desc: "Direct Benefit Transfer credited to Aadhaar bank account" },
  { key: "COMPLETED", label: "Process / Completed — Renewal Active", category: "process", icon: "🎓", desc: "Application cycle completed; track renewal window" },
  { key: "DRAFT", label: "Application Created (Draft)", category: "draft", icon: "📝", desc: "Initial application created" },
  { key: "DOCUMENT_VERIFICATION", label: "Documents Uploaded & OCR", category: "docs", icon: "📑", desc: "Certificates uploaded and verified via OCR" },
  { key: "ELIGIBILITY_CONFIRMED", label: "Eligibility Pre-Check Confirmed", category: "eligibility", icon: "🎯", desc: "Eligibility rules verified against scheme criteria" },
];

export default function ApplicationStatusTimeline() {
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState("");
  const [appDetails, setAppDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // Manual Status Selection & Automated Admin Sync State
  const [manualStage, setManualStage] = useState("COLLEGE_REVIEW");
  const [manualNote, setManualNote] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualSuccessMsg, setManualSuccessMsg] = useState(null);
  const [manualErrorMsg, setManualErrorMsg] = useState(null);

  // Status Issue Reporting Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [issueType, setIssueType] = useState("Status Not Updated");
  const [reportMessage, setReportMessage] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(null);
  const [reportError, setReportError] = useState(null);

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
        if (data?.application?.lifecycleStage) {
          setManualStage(data.application.lifecycleStage);
        } else if (data?.application?.applicationStatus) {
          setManualStage(data.application.applicationStatus);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedAppId]);

  const handleManualStatusChange = async (targetStage = manualStage, customNote = manualNote) => {
    if (!selectedAppId) return;
    try {
      setManualSubmitting(true);
      setManualErrorMsg(null);
      setManualSuccessMsg(null);

      const res = await apiRequest(`/api/student/applications/${selectedAppId}/lifecycle-status`, {
        method: "POST",
        body: JSON.stringify({
          lifecycleStage: targetStage,
          note: customNote || `Student manual selection: ${targetStage}`,
        }),
      });

      // Update local state immediately
      if (res?.application) {
        setAppDetails((prev) => ({
          ...prev,
          application: res.application,
          statusHistory: [
            ...(prev?.statusHistory || []),
            {
              newStatus: targetStage,
              reason: customNote || `Manual status update to ${targetStage}`,
              changedByRole: "STUDENT",
              source: "STUDENT_MANUAL_SELECTION",
              timestamp: new Date().toISOString(),
            },
          ],
        }));
      }

      // Broadcast to other tabs/windows (College/Ministry Admin Portals)
      try {
        if (typeof BroadcastChannel !== "undefined") {
          const bc = new BroadcastChannel("sgp_lifecycle_sync");
          bc.postMessage({
            type: "LIFECYCLE_UPDATED",
            applicationId: selectedAppId,
            newStage: targetStage,
            timestamp: Date.now(),
          });
          bc.close();
        }
        localStorage.setItem(
          "sgp_lifecycle_sync_event",
          JSON.stringify({
            applicationId: selectedAppId,
            newStage: targetStage,
            timestamp: Date.now(),
          })
        );
      } catch (bcErr) {}

      const foundLabel = STAGE_OPTIONS.find((s) => s.key === targetStage)?.label || targetStage;
      setManualSuccessMsg(`Status successfully updated to "${foundLabel}"! Automatically updated in Admin Portal.`);
      setManualNote("");
    } catch (err) {
      setManualErrorMsg(err.message || "Failed to update lifecycle status.");
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleReportStatusSubmit = async (e) => {
    e.preventDefault();
    if (!reportMessage.trim()) {
      setReportError("Please enter details describing the status discrepancy.");
      return;
    }
    try {
      setReportSubmitting(true);
      setReportError(null);
      const res = await apiRequest("/api/student/tickets", {
        method: "POST",
        body: JSON.stringify({
          requestType: "STATUS_UPDATE_REQUEST",
          applicationId: app.applicationId,
          issueType,
          category: "Application Status",
          subject: `Status Issue: ${issueType} (${app.applicationId})`,
          message: reportMessage.trim(),
          officialStatusAtSubmission: app.applicationStatus,
        }),
      });
      setReportSuccess({
        ticketId: res?.ticket?.ticketId || "SGP-STATUS-XXXX",
        message: res?.message || "Status update request submitted successfully",
      });
      setReportMessage("");
    } catch (err) {
      setReportError(err.message || "Failed to submit status request.");
    } finally {
      setReportSubmitting(false);
    }
  };

  const app = appDetails?.application;
  const history = appDetails?.statusHistory || [];
  const verifications = appDetails?.verifications || [];

  // Determine stage progression
  const getStageStatus = (stageKey) => {
    if (!app) return "upcoming";

    // 1. If manual lifecycleStage is explicitly set by admin:
    if (app.lifecycleStage) {
      const activeIdx = TIMELINE_STAGES.findIndex((s) => s.key === app.lifecycleStage);
      const thisIdx = TIMELINE_STAGES.findIndex((s) => s.key === stageKey);
      if (activeIdx !== -1 && thisIdx !== -1) {
        if (thisIdx < activeIdx) return "completed";
        if (thisIdx === activeIdx) {
          if (stageKey === "CORRECTION_REQUIRED") return "alert";
          if (stageKey === "COMPLETED") return "completed";
          return "current";
        }
        return "upcoming";
      }
    }

    // 2. Fallback to existing applicationStatus calculation if no manual lifecycle set:
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
    if (stageKey === "SANCTIONED") {
      if (["SANCTIONED", "PAID"].includes(current)) return "completed";
      return "upcoming";
    }
    if (stageKey === "PAID") {
      return current === "PAID" ? "completed" : "upcoming";
    }
    if (stageKey === "COMPLETED") {
      return current === "COMPLETED" ? "completed" : "upcoming";
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
            <button className="sgp-header-btn sgp-header-btn-secondary nav-back-btn" onClick={() => navigate("/dashboard")}>
              ← Back to Dashboard
            </button>
            <button className="sgp-header-btn sgp-header-btn-ghost" onClick={() => navigate("/student/tickets")}>
              🎫 Need Help?
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
                  <div style={{ marginTop: "8px" }}>
                    <button
                      type="button"
                      className="btn-report-status"
                      onClick={() => {
                        setShowReportModal(true);
                        setReportSuccess(null);
                        setReportError(null);
                      }}
                      title="Report discrepancy or request official status update"
                    >
                      ⚠️ Report Status Issue
                    </button>
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
                  <strong>{new Date(app.lifecycleLastUpdated || app.lastUpdatedAt || app.createdAt).toLocaleString()}</strong>
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
              <div className="timeline-card-header">
                <div>
                  <h3>Lifecycle Status Progression</h3>
                  <p style={{ margin: "4px 0 0 0", fontSize: "12.5px", color: "#64748b" }}>
                    Click any stage or use the manual selector below to update lifecycle status with automated synchronization to Admin Portals.
                  </p>
                </div>
                <span className="live-sync-pill">🟢 Automated Admin Sync Active</span>
              </div>

              <div className="timeline-track">
                {TIMELINE_STAGES.map((stg, idx) => {
                  const state = getStageStatus(stg.key);
                  const isSelected = manualStage === stg.key;
                  return (
                    <div
                      key={stg.key}
                      className={`timeline-node state-${state} ${isSelected ? "selected-node" : ""}`}
                      onClick={() => {
                        setManualStage(stg.key);
                        setManualSuccessMsg(null);
                        setManualErrorMsg(null);
                      }}
                      title={`Click to select "${stg.label}" for manual update`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setManualStage(stg.key);
                        }
                      }}
                    >
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

              {/* MANUAL LIFECYCLE SELECTION PANEL */}
              <div className="manual-lifecycle-panel">
                <div className="manual-lifecycle-top">
                  <div>
                    <h4>🎛️ Manual Lifecycle Status Selection &amp; Automated Admin Sync</h4>
                    <p>
                      Manually select or transition lifecycle status (In Process, Document Issues, Process / Sanctioned, etc.). Changes automatically update in the College and Ministry Admin Portals.
                    </p>
                  </div>
                </div>

                {manualSuccessMsg && (
                  <div className="manual-success-alert">
                    <span style={{ fontSize: "18px" }}>✅</span>
                    <div style={{ flex: 1 }}>
                      <strong>Status Updated &amp; Admin Synced!</strong>
                      <p style={{ margin: "2px 0 0 0" }}>{manualSuccessMsg}</p>
                    </div>
                    <button type="button" className="alert-close-btn" onClick={() => setManualSuccessMsg(null)}>✕</button>
                  </div>
                )}

                {manualErrorMsg && (
                  <div className="manual-error-alert">
                    <span style={{ fontSize: "18px" }}>⚠️</span>
                    <div style={{ flex: 1 }}>
                      <strong>Update Error</strong>
                      <p style={{ margin: "2px 0 0 0" }}>{manualErrorMsg}</p>
                    </div>
                    <button type="button" className="alert-close-btn" onClick={() => setManualErrorMsg(null)}>✕</button>
                  </div>
                )}

                {/* Quick Presets Bar */}
                <div className="manual-presets-bar">
                  <span className="presets-lbl">Quick Presets:</span>
                  <button
                    type="button"
                    className={`preset-chip chip-in-process ${manualStage === "COLLEGE_REVIEW" ? "active" : ""}`}
                    onClick={() => {
                      setManualStage("COLLEGE_REVIEW");
                      handleManualStatusChange("COLLEGE_REVIEW", "Student manual selection: In Process (College Verification)");
                    }}
                    disabled={manualSubmitting}
                    title="Set to In Process (College Review)"
                  >
                    🔄 In Process
                  </button>
                  <button
                    type="button"
                    className={`preset-chip chip-doc-issues ${manualStage === "CORRECTION_REQUIRED" ? "active" : ""}`}
                    onClick={() => {
                      setManualStage("CORRECTION_REQUIRED");
                      handleManualStatusChange("CORRECTION_REQUIRED", "Student manual selection: Document Issues / Correction Required");
                    }}
                    disabled={manualSubmitting}
                    title="Set to Document Issues / Correction Required"
                  >
                    ⚠️ Document Issues
                  </button>
                  <button
                    type="button"
                    className={`preset-chip chip-scrutiny ${manualStage === "MINISTRY_SCRUTINY" ? "active" : ""}`}
                    onClick={() => {
                      setManualStage("MINISTRY_SCRUTINY");
                      handleManualStatusChange("MINISTRY_SCRUTINY", "Student manual selection: In Process (Ministry Scrutiny)");
                    }}
                    disabled={manualSubmitting}
                    title="Set to In Process (Ministry Scrutiny)"
                  >
                    🏢 Ministry Scrutiny
                  </button>
                  <button
                    type="button"
                    className={`preset-chip chip-process ${manualStage === "SANCTIONED" ? "active" : ""}`}
                    onClick={() => {
                      setManualStage("SANCTIONED");
                      handleManualStatusChange("SANCTIONED", "Student manual selection: Process / Awarded (Sanctioned)");
                    }}
                    disabled={manualSubmitting}
                    title="Set to Process / Sanctioned"
                  >
                    📜 Process (Sanctioned)
                  </button>
                  <button
                    type="button"
                    className={`preset-chip chip-paid ${manualStage === "PAID" ? "active" : ""}`}
                    onClick={() => {
                      setManualStage("PAID");
                      handleManualStatusChange("PAID", "Student manual selection: Process / DBT Payment Credit");
                    }}
                    disabled={manualSubmitting}
                    title="Set to Process / DBT Paid"
                  >
                    💳 Process (DBT Paid)
                  </button>
                  <button
                    type="button"
                    className={`preset-chip chip-completed ${manualStage === "COMPLETED" ? "active" : ""}`}
                    onClick={() => {
                      setManualStage("COMPLETED");
                      handleManualStatusChange("COMPLETED", "Student manual selection: Process / Completed");
                    }}
                    disabled={manualSubmitting}
                    title="Set to Process / Completed"
                  >
                    🎓 Process (Completed)
                  </button>
                </div>

                {/* Form row for dropdown & custom note */}
                <div className="manual-form-grid">
                  <div className="form-item">
                    <label htmlFor="manualStageSelect">
                      Select Lifecycle Stage / Status:
                    </label>
                    <select
                      id="manualStageSelect"
                      value={manualStage}
                      onChange={(e) => setManualStage(e.target.value)}
                      disabled={manualSubmitting}
                    >
                      {STAGE_OPTIONS.map((stg) => (
                        <option key={stg.key} value={stg.key}>
                          {stg.icon} {stg.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-item">
                    <label htmlFor="manualNoteInput">
                      Reason / Update Note (Optional):
                    </label>
                    <input
                      type="text"
                      id="manualNoteInput"
                      placeholder="e.g. Discrepancy fixed, certificates re-uploaded, or verified..."
                      value={manualNote}
                      onChange={(e) => setManualNote(e.target.value)}
                      disabled={manualSubmitting}
                    />
                  </div>

                  <div className="form-action">
                    <button
                      type="button"
                      className="btn-apply-manual"
                      onClick={() => handleManualStatusChange(manualStage, manualNote)}
                      disabled={manualSubmitting}
                    >
                      {manualSubmitting ? "Syncing to Admin..." : "⚡ Update & Sync to Admin"}
                    </button>
                  </div>
                </div>
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

      {/* REPORT STATUS ISSUE / REQUEST UPDATE MODAL */}
      {showReportModal && app && (
        <div className="timeline-modal-overlay" onClick={() => !reportSubmitting && setShowReportModal(false)}>
          <div className="timeline-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="timeline-modal-header">
              <div>
                <h3>⚠️ Report Status Issue / Request Update</h3>
                <p>Submit an audited status update request to College &amp; Ministry verification officers.</p>
              </div>
              <button
                type="button"
                className="timeline-modal-close"
                disabled={reportSubmitting}
                onClick={() => setShowReportModal(false)}
              >
                ✕
              </button>
            </div>

            {reportSuccess ? (
              <div className="report-success-state">
                <div className="report-success-icon">✅</div>
                <h4>Request Submitted Successfully!</h4>
                <p>{reportSuccess.message}</p>
                <div className="report-tracking-box">
                  <span>Tracking Reference ID:</span>
                  <strong>{reportSuccess.ticketId}</strong>
                </div>
                <p className="report-info-note">
                  Your request has been routed to your College Verification Officer and Ministry Authority.
                  You can track replies and official updates in Support Tickets.
                </p>
                <div className="timeline-modal-actions" style={{ justifyContent: "center" }}>
                  <button
                    type="button"
                    className="sgp-header-btn sgp-header-btn-secondary"
                    onClick={() => {
                      setShowReportModal(false);
                      setReportSuccess(null);
                    }}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="sgp-header-btn sgp-header-btn-primary"
                    onClick={() => navigate("/student/tickets")}
                  >
                    🎫 View in Support Tickets →
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleReportStatusSubmit}>
                <div className="report-meta-summary">
                  <div>
                    <span className="lbl">Application ID</span>
                    <strong>{app.applicationId}</strong>
                  </div>
                  <div>
                    <span className="lbl">Scholarship Scheme</span>
                    <strong>{appDetails?.scheme?.schemeName || app.schemeId}</strong>
                  </div>
                  <div>
                    <span className="lbl">Current Official Status</span>
                    <strong className="status-highlight">{app.applicationStatus.replace(/_/g, " ")}</strong>
                  </div>
                </div>

                {reportError && <div className="report-error-msg">{reportError}</div>}

                <div className="report-form-group">
                  <label htmlFor="issueTypeSelect">
                    Status Issue Type <span className="req">*</span>
                  </label>
                  <select
                    id="issueTypeSelect"
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    required
                  >
                    <option value="In Process / Delay in Processing">In Process / Delay in Processing</option>
                    <option value="Document Issues / Correction Needed">Document Issues / Correction Needed</option>
                    <option value="Status Not Updated">Status Not Updated</option>
                    <option value="Documents Already Submitted">Documents Already Submitted</option>
                    <option value="Verification Completed but Status Pending">Verification Completed but Status Pending</option>
                    <option value="Correction Already Submitted">Correction Already Submitted</option>
                    <option value="Application Information Incorrect">Application Information Incorrect</option>
                    <option value="Government Portal Status Different">Government Portal Status Different</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="report-form-group">
                  <label htmlFor="reportMessageInput">
                    Description &amp; Discrepancy Details <span className="req">*</span>
                  </label>
                  <textarea
                    id="reportMessageInput"
                    rows="4"
                    value={reportMessage}
                    onChange={(e) => setReportMessage(e.target.value)}
                    placeholder="Describe what occurred (e.g. college verified certificates on Monday, government portal shows approved, but SGP still displays College Review)..."
                    required
                  />
                </div>

                <div className="report-disclaimer">
                  ℹ️ <strong>Note:</strong> Students cannot directly mutate official lifecycle status. Submitting this request creates an audited ticket with reference <code>SGP-STATUS-XXXX</code> visible to College and Ministry authorities for resolution.
                </div>

                <div className="timeline-modal-actions">
                  <button
                    type="button"
                    className="sgp-header-btn sgp-header-btn-secondary"
                    disabled={reportSubmitting}
                    onClick={() => setShowReportModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-submit-report"
                    disabled={reportSubmitting}
                  >
                    {reportSubmitting ? "Submitting Request..." : "🚀 Submit Status Request"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

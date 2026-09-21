import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../utils/api";
import LanguageSelector from "../LanguageSelector/LanguageSelector";
import "./DeficiencyManager.css";

export default function DeficiencyManager() {
  const navigate = useNavigate();

  const [deficiencies, setDeficiencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState({});
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDeficiencies();
  }, []);

  const loadDeficiencies = async () => {
    try {
      setLoading(true);
      const data = await apiRequest("/api/student/deficiencies");
      setDeficiencies(data?.deficiencies || []);
    } catch (err) {
      setError("Failed to load deficiencies: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (defId) => {
    const note = resolutionNotes[defId] || "";
    if (!note.trim()) {
      alert("Please enter a resolution note or specify what was corrected.");
      return;
    }

    setResolvingId(defId);
    setError(null);
    setMessage(null);

    try {
      await apiRequest(`/api/student/deficiencies/${defId}/resolve`, {
        method: "PUT",
        body: JSON.stringify({ resolutionNote: note.trim() }),
      });
      setMessage("Deficiency marked as corrected. Your college has been updated.");
      loadDeficiencies();
    } catch (err) {
      setError("Failed to resolve deficiency: " + err.message);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="def-page">
      <header className="def-header">
        <div className="def-header-container">
          <div className="brand" onClick={() => navigate("/dashboard")} style={{ cursor: "pointer" }}>
            <img src="/sgp-emblem.png" alt="SGP Emblem" />
            <div>
              <h2>Scholarship Guidance Platform</h2>
              <p>Deficiency Tracking &amp; Correction Workflow</p>
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

      <main className="def-main-container">
        <div className="def-hero">
          <div>
            <h1>Application Deficiencies &amp; Corrections</h1>
            <p>Review and resolve items flagged during OCR verification or College inspection.</p>
          </div>
          <button className="btn-upload" onClick={() => navigate("/documents")}>
            📑 Re-Check Documents with OCR
          </button>
        </div>

        {message && <div className="alert alert-success">✅ {message}</div>}
        {error && <div className="alert alert-error">⚠️ {error}</div>}

        {loading ? (
          <p style={{ color: "#64748b" }}>Loading deficiencies...</p>
        ) : deficiencies.length === 0 ? (
          <div className="empty-def-box">
            <div style={{ fontSize: "42px", marginBottom: "10px" }}>🎉</div>
            <h3>No Deficiencies Found!</h3>
            <p>All your document verifications and application items are in good standing.</p>
            <button className="nav-back-btn" style={{ background: "#02065c", marginTop: "12px" }} onClick={() => navigate("/student/status")}>
              Check Application Status
            </button>
          </div>
        ) : (
          <div className="def-list">
            {deficiencies.map((def) => {
              const isOpen = def.status === "OPEN";

              return (
                <div key={def.deficiencyId} className={`def-card ${isOpen ? "def-card-open" : "def-card-resolved"}`}>
                  <div className="def-card-top">
                    <div>
                      <span className="def-id-tag">{def.deficiencyId}</span>
                      <span className={`severity-badge sev-${def.severity.toLowerCase()}`}>{def.severity}</span>
                      <span className="type-badge">{def.type.replace(/_/g, " ")}</span>
                    </div>
                    <span className={`status-pill pill-${def.status.toLowerCase()}`}>{def.status}</span>
                  </div>

                  <h3 className="def-desc">{def.description}</h3>
                  <div className="def-meta">
                    <span>Application: <strong>{def.applicationId}</strong></span>
                    <span>Document: <strong>{def.documentType || "General"}</strong></span>
                    <span>Flagged by: <strong>{def.createdByRole}</strong> ({new Date(def.createdAt).toLocaleDateString()})</span>
                  </div>

                  {isOpen ? (
                    <div className="def-resolve-box">
                      <label>Correction &amp; Resolution Note for College:</label>
                      <textarea
                        rows={2}
                        placeholder="Explain what was updated or re-uploaded (e.g. Uploaded updated Income certificate with parent income clarification)"
                        value={resolutionNotes[def.deficiencyId] || ""}
                        onChange={(e) => setResolutionNotes({ ...resolutionNotes, [def.deficiencyId]: e.target.value })}
                      />
                      <div className="def-btn-row">
                        <button
                          type="button"
                          className="btn-resolve"
                          disabled={resolvingId === def.deficiencyId}
                          onClick={() => handleResolve(def.deficiencyId)}
                        >
                          {resolvingId === def.deficiencyId ? "Submitting..." : "✔️ Submit Correction"}
                        </button>
                        <button
                          type="button"
                          className="btn-doc-link"
                          onClick={() => navigate("/documents")}
                        >
                          Upload Document Scan
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="def-resolved-info">
                      <strong>Resolution Note:</strong> {def.resolutionNote || "Resolved"}
                      <span style={{ display: "block", fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                        Resolved at: {new Date(def.resolvedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

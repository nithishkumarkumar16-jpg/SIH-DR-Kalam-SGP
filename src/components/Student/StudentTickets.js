import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiRequest } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import LanguageSelector from "../LanguageSelector/LanguageSelector";
import "./StudentTickets.css";

const CATEGORIES = [
  "Scholarship Query",
  "Document Issue",
  "Eligibility Question",
  "Application Status",
  "Correction / Resubmission",
  "Payment / Award",
  "Technical Issue",
  "Other",
];

export default function StudentTickets() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New Ticket Form State
  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState("Scholarship Query");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState(null);

  // Active / Expanded ticket for replying
  const [expandedTicketId, setExpandedTicketId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest("/api/student/tickets");
      setTickets(data?.tickets || []);
    } catch (err) {
      setError(err.message || "Failed to load support tickets.");
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    try {
      const data = await apiRequest("/api/student/applications");
      const apps = data?.applications || [];
      setApplications(apps);

      // Check query param for preselected app
      const params = new URLSearchParams(location.search);
      const preselectedAppId = params.get("appId");
      if (preselectedAppId) {
        setApplicationId(preselectedAppId);
        setShowModal(true);
      } else if (apps.length > 0) {
        setApplicationId(apps[0].applicationId);
      }
    } catch (e) {
      // Non-blocking
    }
  };

  useEffect(() => {
    loadTickets();
    loadApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      alert("Please provide both a subject and a query message.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiRequest("/api/student/tickets", {
        method: "POST",
        body: JSON.stringify({
          category,
          subject: subject.trim(),
          message: message.trim(),
          applicationId: applicationId || null,
        }),
      });

      const newTicketId = res?.ticket?.ticketId || "SGP-TKT-XXXX";
      setSuccessBanner(`Ticket submitted successfully. Your Ticket ID is ${newTicketId}.`);
      setSubject("");
      setMessage("");
      setShowModal(false);
      await loadTickets();
      setExpandedTicketId(newTicketId);
    } catch (err) {
      alert("Failed to submit ticket: " + (err.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (tId) => {
    if (!replyText.trim()) return;
    try {
      setReplySubmitting(true);
      await apiRequest(`/api/student/tickets/${tId}/reply`, {
        method: "POST",
        body: JSON.stringify({ reply: replyText.trim() }),
      });
      setReplyText("");
      await loadTickets();
    } catch (err) {
      alert("Failed to send reply: " + err.message);
    } finally {
      setReplySubmitting(false);
    }
  };

  return (
    <div className="student-tickets-page">
      {/* HEADER */}
      <header className="student-tickets-header">
        <div className="student-tickets-header-container">
          <div className="brand" onClick={() => navigate("/dashboard")} style={{ cursor: "pointer" }}>
            <img src="/sgp-emblem.png" alt="SGP Emblem" />
            <div>
              <h2>Scholarship Guidance Platform</h2>
              <p>Student Helpdesk &amp; Support Ticket System</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="sgp-header-btn sgp-header-btn-secondary" onClick={() => navigate("/dashboard")}>
              ← Back to Dashboard
            </button>
            <button className="sgp-header-btn sgp-header-btn-ghost" onClick={() => navigate("/student/status")}>
              📊 Application Status
            </button>
            <button className="sgp-header-btn sgp-header-btn-danger" onClick={logout}>
              Sign Out
            </button>
            <LanguageSelector />
          </div>
        </div>
      </header>

      <main className="student-tickets-main">
        {/* BANNER NOTIFICATION */}
        {successBanner && (
          <div className="ticket-alert-success">
            <span>✅ {successBanner}</span>
            <button onClick={() => setSuccessBanner(null)} className="alert-dismiss-btn">✕</button>
          </div>
        )}

        {/* HERO / ACTION TOP BAR */}
        <div className="tickets-top-card">
          <div className="top-card-text">
            <h2>Need Help with Your Scholarship?</h2>
            <p>
              Submit your inquiry or grievance regarding document verification, scheme eligibility, deficiency correction, or payment status. Our designated college and ministry authorities will review and respond directly to your ticket.
            </p>
          </div>
          <button className="btn-raise-ticket" onClick={() => setShowModal(true)}>
            ➕ Raise a Support Ticket
          </button>
        </div>

        {/* TICKETS LIST SECTION */}
        <div className="tickets-list-card">
          <div className="tickets-list-header">
            <div>
              <h3>Your Submitted Tickets ({tickets.length})</h3>
              <p>Track live status, administrative responses, and resolution history.</p>
            </div>
            <button className="btn-refresh-tickets" onClick={loadTickets} disabled={loading}>
              🔄 {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {loading ? (
            <div className="tickets-loading-state">⏳ Loading your support tickets...</div>
          ) : error ? (
            <div className="tickets-error-state">❌ {error}</div>
          ) : tickets.length === 0 ? (
            <div className="tickets-empty-state">
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎫</div>
              <h4>No Support Tickets Submitted</h4>
              <p>You haven't submitted any queries or issues yet. Click "Raise a Support Ticket" above if you need assistance.</p>
              <button className="btn-raise-ticket-inline" onClick={() => setShowModal(true)}>
                Raise Your First Ticket
              </button>
            </div>
          ) : (
            <div className="ticket-cards-grid">
              {tickets.map((t) => {
                const isExpanded = expandedTicketId === t.ticketId;
                const statusLower = (t.status || "open").toLowerCase().replace(/_/g, "-");
                const replies = t.replies || [];

                return (
                  <div key={t.ticketId} className="student-ticket-item">
                    <div className="ticket-item-header">
                      <div className="ticket-id-category">
                        <span className="ticket-id-tag">{t.ticketId}</span>
                        <span className="ticket-category-tag">{t.category}</span>
                        {t.issueType && (
                          <span style={{ fontSize: "11px", background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>
                            ⚠️ {t.issueType}
                          </span>
                        )}
                        {t.applicationId && (
                          <span className="ticket-app-ref" title="Referenced Application">
                            App: {t.applicationId}
                          </span>
                        )}
                      </div>
                      <span className={`status-pill pill-${statusLower}`}>
                        {t.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <h4 className="ticket-subject">{t.subject}</h4>
                    <p className="ticket-message-preview">{t.message}</p>

                    <div className="ticket-meta-row">
                      <span>📅 Filed: {new Date(t.createdAt).toLocaleDateString()}</span>
                      <span>⏱️ Updated: {new Date(t.updatedAt || t.createdAt).toLocaleDateString()}</span>
                      {t.repliedBy && (
                        <span className="ticket-replied-badge">
                          💬 Response from: {t.repliedBy}
                        </span>
                      )}
                    </div>

                    {/* Admin Latest Response Preview */}
                    {t.latestReply && !isExpanded && (
                      <div className="ticket-response-box">
                        <strong>Official Response:</strong>
                        <p>{t.latestReply}</p>
                      </div>
                    )}

                    {/* Toggle Conversation Details */}
                    <div className="ticket-actions-bar">
                      <button
                        className="btn-toggle-conversation"
                        onClick={() => setExpandedTicketId(isExpanded ? null : t.ticketId)}
                      >
                        {isExpanded ? "▲ Hide Conversation" : `💬 View Full Conversation (${replies.length || (t.latestReply ? 2 : 1)})`}
                      </button>
                    </div>

                    {/* EXPANDED CONVERSATION THREAD */}
                    {isExpanded && (
                      <div className="ticket-thread-section">
                        <h5 className="thread-title">Conversation History</h5>
                        <div className="thread-messages">
                          {replies.length > 0 ? (
                            replies.map((r, rIdx) => {
                              const isStudent = r.senderRole === "STUDENT";
                              return (
                                <div
                                  key={rIdx}
                                  className={`thread-bubble ${isStudent ? "bubble-student" : "bubble-admin"}`}
                                >
                                  <div className="bubble-header">
                                    <strong>{r.sender || (isStudent ? "You" : "Support Officer")}</strong>
                                    <span>{new Date(r.timestamp).toLocaleString()}</span>
                                  </div>
                                  <p className="bubble-body">{r.message}</p>
                                </div>
                              );
                            })
                          ) : (
                            <>
                              <div className="thread-bubble bubble-student">
                                <div className="bubble-header">
                                  <strong>You (Student)</strong>
                                  <span>{new Date(t.createdAt).toLocaleString()}</span>
                                </div>
                                <p className="bubble-body">{t.message}</p>
                              </div>
                              {t.latestReply && (
                                <div className="thread-bubble bubble-admin">
                                  <div className="bubble-header">
                                    <strong>{t.repliedBy || "Authority Officer"}</strong>
                                    <span>{t.latestReplyAt ? new Date(t.latestReplyAt).toLocaleString() : "Recently"}</span>
                                  </div>
                                  <p className="bubble-body">{t.latestReply}</p>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Inline Student Reply Box */}
                        {t.status !== "CLOSED" && (
                          <div className="thread-reply-form">
                            <textarea
                              rows={2}
                              placeholder="Type a follow-up reply or clarification for the administrator..."
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                            />
                            <div className="thread-reply-btn-row">
                              <button
                                className="btn-send-reply"
                                disabled={replySubmitting || !replyText.trim()}
                                onClick={() => handleSendReply(t.ticketId)}
                              >
                                {replySubmitting ? "Sending..." : "Send Reply"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* RAISE SUPPORT TICKET MODAL */}
      {showModal && (
        <div className="ticket-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="ticket-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>Raise a Support Ticket</h3>
              <button className="ticket-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateTicket} className="ticket-modal-form">
              <div className="form-group">
                <label>Issue Category *</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {applications.length > 0 && (
                <div className="form-group">
                  <label>Related Application (Optional)</label>
                  <select value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
                    <option value="">-- General Inactivity / No Specific Application --</option>
                    {applications.map((a) => (
                      <option key={a.applicationId} value={a.applicationId}>
                        {a.applicationId} ({a.schemeId}) — {a.applicationStatus}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Why is my application still under college verification?"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Message / Query *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Please describe your question or issue in detail. Include relevant certificate names, dates, or deficiency notes..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div className="ticket-modal-actions">
                <button
                  type="button"
                  className="sgp-header-btn sgp-header-btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sgp-header-btn sgp-header-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Submit Support Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { apiRequest, downloadExcel } from "../../utils/api";
import LanguageSelector from "../LanguageSelector/LanguageSelector";
import { FunnelChart } from "../Common/AnalyticsCharts";
import { ErrorBoundary } from "../Common/ErrorBoundary";
import { formatINR, formatCount, formatPercent, formatDateSafe } from "../../utils/formatters";
import "./MinistryDashboard.css";

export default function MinistryDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState("OVERVIEW"); // OVERVIEW | ANALYTICS | COLLEGES | APPLICATIONS | PAYMENTS | SCHEMES | REPORT_BUILDER | TICKETS | AUDIT
  const [stats, setStats] = useState(null);
  const [colleges, setColleges] = useState([]);
  const [applications, setApplications] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [paymentsData, setPaymentsData] = useState({ payments: [], summary: {} });
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Analytics state (Phase 2 & 3)
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);

  // Selection Preview state (Phase 4.6)
  const [selectionPreviewModalOpen, setSelectionPreviewModalOpen] = useState(false);
  const [selectionPreviewLoading, setSelectionPreviewLoading] = useState(false);
  const [selectionPreviewData, setSelectionPreviewData] = useState(null);
  const [selectionApprovalComments, setSelectionApprovalComments] = useState("");
  const [selectionApproving, setSelectionApproving] = useState(false);

  // Rule Impact Preview state (Phase 4.7)
  const [ruleImpactModalOpen, setRuleImpactModalOpen] = useState(false);
  const [ruleImpactLoading, setRuleImpactLoading] = useState(false);
  const [ruleImpactData, setRuleImpactData] = useState(null);
  const [impactScheme, setImpactScheme] = useState(null);
  const [proposedRuleChanges, setProposedRuleChanges] = useState({
    maxIncome: 300000,
    minPassMarks: 55,
  });

  // Report Builder state (Phase 4.8)
  const [reportBuilderData, setReportBuilderData] = useState(null);
  const [reportBuilderLoading, setReportBuilderLoading] = useState(false);

  // Delay Alerts state (Phase 4.3)
  const [delayAlertsResult, setDelayAlertsResult] = useState(null);
  const [delayAlertsLoading, setDelayAlertsLoading] = useState(false);

  // Filters
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedCollegeId, setSelectedCollegeId] = useState("");
  const [selectedSchemeId, setSelectedSchemeId] = useState("");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("2026-2027");
  const [statusFilter, setStatusFilter] = useState("");

  // Scrutiny Modal
  const [scrutinyApp, setScrutinyApp] = useState(null);
  const [scrutinyModalOpen, setScrutinyModalOpen] = useState(false);
  const [scrutinyComments, setScrutinyComments] = useState("");
  const [selectionDecision, setSelectionDecision] = useState("SELECTED");
  const [sanctionedAmt, setSanctionedAmt] = useState(54000);
  const [actionLoading, setActionLoading] = useState(false);

  // External Portal Update Modal
  const [externalModalOpen, setExternalModalOpen] = useState(false);
  const [extStatusApp, setExtStatusApp] = useState(null);
  const [extAppId, setExtAppId] = useState("");
  const [extSource, setExtSource] = useState("National Scholarship Portal (scholarships.gov.in)");
  const [extStatus, setExtStatus] = useState("UNDER_VERIFICATION");
  const [extEvidence, setExtEvidence] = useState("");

  // Create College Modal
  const [createCollegeModalOpen, setCreateCollegeModalOpen] = useState(false);
  const [newCol, setNewCol] = useState({
    collegeId: "",
    collegeName: "",
    institutionType: "Government Engineering College",
    district: "Salem",
    state: "Tamil Nadu",
    contactEmail: "",
    contactPhone: "",
  });

  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState(null);
  const [exportError, setExportError] = useState(null);

  // Admin Table state
  const [adminRecords, setAdminRecords] = useState([]);
  const [adminPage, setAdminPage] = useState(1);
  const [adminTotalPages, setAdminTotalPages] = useState(1);
  const [adminTotalCount, setAdminTotalCount] = useState(0);
  const [adminLoading, setAdminLoading] = useState(false);

  // Scheme Configuration state
  const [editingScheme, setEditingScheme] = useState(null);
  const [schemeModalOpen, setSchemeModalOpen] = useState(false);
  const [schemeForm, setSchemeForm] = useState({
    schemeId: "",
    schemeName: "",
    schemeType: "CENTRAL",
    ministry: "Ministry of Tribal Affairs / MoE",
    description: "",
    targetCategory: "ALL",
    academicLevels: "ug, pg",
    maxIncome: 250000,
    academicYear: "2026-2027",
    ruleVersion: "2026.1",
    applicationDeadline: "2026-10-31",
    collegeVerificationDeadline: "2026-11-15",
    ministryScrutinyDeadline: "2026-11-30",
    minAttendance: 75,
    minPassMarks: 50,
    selectionMethod: "MERIT_AND_MEANS",
    guidelineReference: "SGP Official Directive 2026/Vol.4",
  });

  // Support Tickets state
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketReplyText, setTicketReplyText] = useState("");
  const [activeTicket, setActiveTicket] = useState(null);

  useEffect(() => {
    loadMinistryData();
    loadMinistryAnalytics();
    if (activeTab === "ADMIN_TABLE") loadAdminTable(1);
    if (activeTab === "TICKETS") loadMinistryTickets();
    if (activeTab === "ANALYTICS") loadMinistryAnalytics();
    if (activeTab === "REPORT_BUILDER") loadReportBuilder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedState, selectedDistrict, selectedCollegeId, selectedSchemeId, selectedAcademicYear, statusFilter, paymentStatusFilter, activeTab]);

  const handleExportExcel = async () => {
    try {
      setExportLoading(true);
      setExportError(null);
      setExportMessage("Preparing Excel...");
      const q = new URLSearchParams({
        ...(selectedSchemeId && { schemeId: selectedSchemeId }),
        ...(selectedAcademicYear && { academicYear: selectedAcademicYear }),
        ...(selectedState && { state: selectedState }),
        ...(selectedCollegeId && { collegeId: selectedCollegeId }),
        ...(statusFilter && { status: statusFilter }),
        ...(paymentStatusFilter && { paymentStatus: paymentStatusFilter }),
      });
      const res = await downloadExcel(`/api/ministry/export-excel?${q.toString()}`, "SGP_Ministry_Export.xlsx");
      setExportMessage(`Exported ${res.recordsCount || applications.length} authorized records across 5 sheets successfully.`);
      setTimeout(() => setExportMessage(null), 6000);
    } catch (err) {
      console.error("Export error:", err);
      setExportError("Excel export failed: " + (err.message || "Unknown error"));
      setTimeout(() => setExportError(null), 6000);
    } finally {
      setExportLoading(false);
    }
  };

  const loadMinistryAnalytics = async (customFilters = {}) => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      const q = new URLSearchParams({
        ...(customFilters.schemeId || selectedSchemeId ? { schemeId: customFilters.schemeId || selectedSchemeId } : {}),
        ...(customFilters.academicYear || selectedAcademicYear ? { academicYear: customFilters.academicYear || selectedAcademicYear } : { academicYear: "2026-2027" }),
        ...(customFilters.state || selectedState ? { state: customFilters.state || selectedState } : {}),
        ...(customFilters.collegeId || selectedCollegeId ? { collegeId: customFilters.collegeId || selectedCollegeId } : {}),
        ...(customFilters.status || statusFilter ? { status: customFilters.status || statusFilter } : {}),
      });
      const data = await apiRequest(`/api/ministry/analytics?${q.toString()}`);
      setAnalyticsData(data);
    } catch (err) {
      console.error("Failed to load ministry analytics:", err);
      setAnalyticsError(err.message || "Failed to load national analytics");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleRunDelayCheck = async () => {
    try {
      setDelayAlertsLoading(true);
      setDelayAlertsResult(null);
      const res = await apiRequest("/api/ministry/alerts/check-delays", { method: "POST" });
      setDelayAlertsResult(res);
      alert(`Statutory delay audit executed. Scanned ${res.totalApplicationsScanned || 0} applications across ${res.schemesEvaluated || 0} schemes. Delay alerts sent: ${res.alertsDispatched || 0}.`);
    } catch (err) {
      alert("Delay check failed: " + err.message);
    } finally {
      setDelayAlertsLoading(false);
    }
  };

  const handleOpenSelectionPreview = async () => {
    try {
      setSelectionPreviewLoading(true);
      setSelectionPreviewModalOpen(true);
      const schemeToPreview = selectedSchemeId || (schemes.length > 0 ? schemes[0].schemeId : "SCH-NFST-01");
      const res = await apiRequest("/api/ministry/selection-preview", {
        method: "POST",
        body: JSON.stringify({ schemeId: schemeToPreview, academicYear: selectedAcademicYear || "2026-2027" }),
      });
      setSelectionPreviewData(res);
      setSelectionApprovalComments("");
    } catch (err) {
      alert("Selection preview failed: " + err.message);
      setSelectionPreviewModalOpen(false);
    } finally {
      setSelectionPreviewLoading(false);
    }
  };

  const handleApproveSelection = async () => {
    if (!selectionApprovalComments.trim()) {
      alert("Please provide the statutory approval notes and committee sanction reference.");
      return;
    }
    if (!window.confirm("Authorize official human approval for draft selection list? This will update candidate statuses to SELECTED and generate formal award orders.")) {
      return;
    }
    try {
      setSelectionApproving(true);
      const candidateIds = (selectionPreviewData?.previewResults?.selectedCandidates || []).map((c) => c.applicationId);
      const res = await apiRequest("/api/ministry/selection-approve", {
        method: "POST",
        body: JSON.stringify({
          applicationIds: candidateIds,
          approvalNotes: selectionApprovalComments.trim(),
        }),
      });
      alert(res.message || "Selection list approved and sanitized successfully.");
      setSelectionPreviewModalOpen(false);
      loadMinistryData();
      loadMinistryAnalytics();
    } catch (err) {
      alert("Selection approval failed: " + err.message);
    } finally {
      setSelectionApproving(false);
    }
  };

  const handleOpenRuleImpact = async (scheme) => {
    try {
      setImpactScheme(scheme);
      setRuleImpactModalOpen(true);
      setRuleImpactLoading(true);
      const res = await apiRequest(`/api/ministry/schemes/${scheme.schemeId}/preview-rule-impact`, {
        method: "POST",
        body: JSON.stringify({
          proposedChanges: {
            maxIncome: Number(scheme.maxIncome || 250000) + 50000,
            minPassMarks: Number(scheme.minPassMarks || 50),
          },
        }),
      });
      setRuleImpactData(res);
      setProposedRuleChanges({
        maxIncome: Number(scheme.maxIncome || 250000) + 50000,
        minPassMarks: Number(scheme.minPassMarks || 50),
      });
    } catch (err) {
      alert("Rule impact preview failed: " + err.message);
      setRuleImpactModalOpen(false);
    } finally {
      setRuleImpactLoading(false);
    }
  };

  const handleRecalculateRuleImpact = async (e) => {
    e.preventDefault();
    if (!impactScheme) return;
    try {
      setRuleImpactLoading(true);
      const res = await apiRequest(`/api/ministry/schemes/${impactScheme.schemeId}/preview-rule-impact`, {
        method: "POST",
        body: JSON.stringify({ proposedChanges: proposedRuleChanges }),
      });
      setRuleImpactData(res);
    } catch (err) {
      alert("Failed to recalculate rule impact: " + err.message);
    } finally {
      setRuleImpactLoading(false);
    }
  };

  const loadReportBuilder = async () => {
    try {
      setReportBuilderLoading(true);
      const q = new URLSearchParams({
        ...(selectedSchemeId && { schemeId: selectedSchemeId }),
        ...(selectedAcademicYear && { academicYear: selectedAcademicYear }),
        ...(selectedState && { state: selectedState }),
        ...(selectedCollegeId && { collegeId: selectedCollegeId }),
        ...(statusFilter && { status: statusFilter }),
      });
      const res = await apiRequest(`/api/ministry/report-builder?${q.toString()}`);
      setReportBuilderData(res);
    } catch (err) {
      console.error("Report builder load error:", err);
    } finally {
      setReportBuilderLoading(false);
    }
  };

  const loadAdminTable = async (page = 1) => {
    try {
      setAdminLoading(true);
      const q = new URLSearchParams({
        page,
        limit: 15,
        ...(selectedSchemeId && { schemeId: selectedSchemeId }),
        ...(selectedState && { state: selectedState }),
        ...(selectedCollegeId && { collegeId: selectedCollegeId }),
        ...(statusFilter && { status: statusFilter }),
      });
      const data = await apiRequest(`/api/ministry/admin-table?${q.toString()}`);
      setAdminRecords(data?.records || []);
      setAdminPage(data?.page || 1);
      setAdminTotalPages(data?.totalPages || 1);
      setAdminTotalCount(data?.total || 0);
    } catch (err) {
      console.error("Failed to load ministry admin table:", err);
    } finally {
      setAdminLoading(false);
    }
  };

  const loadMinistryTickets = async () => {
    try {
      setTicketsLoading(true);
      const data = await apiRequest("/api/ministry/tickets");
      setTickets(data?.tickets || []);
    } catch (err) {
      console.error("Failed to load ministry tickets:", err);
    } finally {
      setTicketsLoading(false);
    }
  };

  const handleTicketReply = async (ticketId) => {
    if (!ticketReplyText.trim()) return;
    try {
      await apiRequest(`/api/ministry/tickets/${ticketId}/reply`, {
        method: "POST",
        body: JSON.stringify({ reply: ticketReplyText.trim(), status: "WAITING_FOR_STUDENT" }),
      });
      alert("Reply sent to student.");
      setTicketReplyText("");
      setActiveTicket(null);
      loadMinistryTickets();
    } catch (err) {
      alert("Failed to reply: " + err.message);
    }
  };

  const openSchemeConfig = (scheme) => {
    setEditingScheme(scheme);
    setSchemeForm({
      schemeId: scheme?.schemeId || "",
      schemeName: scheme?.schemeName || "",
      schemeType: scheme?.schemeType || "CENTRAL",
      ministry: scheme?.ministry || "Ministry of Tribal Affairs / MoE",
      description: scheme?.description || "",
      targetCategory: Array.isArray(scheme?.targetCategory) ? scheme.targetCategory.join(", ") : "ALL",
      academicLevels: Array.isArray(scheme?.academicLevels) ? scheme.academicLevels.join(", ") : "ug, pg",
      maxIncome: scheme?.maxIncome || 250000,
      academicYear: "2026-2027",
      ruleVersion: scheme?.rules?.ruleVersion || "2026.1",
      applicationDeadline: scheme?.rules?.deadlines?.applicationDeadline ? new Date(scheme.rules.deadlines.applicationDeadline).toISOString().split("T")[0] : "2026-10-31",
      collegeVerificationDeadline: scheme?.rules?.deadlines?.collegeVerificationDeadline ? new Date(scheme.rules.deadlines.collegeVerificationDeadline).toISOString().split("T")[0] : "2026-11-15",
      ministryScrutinyDeadline: scheme?.rules?.deadlines?.ministryScrutinyDeadline ? new Date(scheme.rules.deadlines.ministryScrutinyDeadline).toISOString().split("T")[0] : "2026-11-30",
      minAttendance: scheme?.rules?.continuationRules?.minAttendance || 75,
      minPassMarks: scheme?.rules?.continuationRules?.minPassMarks || 50,
      selectionMethod: scheme?.rules?.selectionRules?.method || "MERIT_AND_MEANS",
      guidelineReference: "SGP Official Directive 2026/Vol.4",
    });
    setSchemeModalOpen(true);
  };

  const handleSaveSchemeRule = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await apiRequest("/api/ministry/schemes", {
        method: "POST",
        body: JSON.stringify({
          schemeId: schemeForm.schemeId,
          schemeName: schemeForm.schemeName,
          schemeType: schemeForm.schemeType,
          ministry: schemeForm.ministry,
          description: schemeForm.description,
          targetCategory: schemeForm.targetCategory.split(",").map(s => s.trim()),
          academicLevels: schemeForm.academicLevels.split(",").map(s => s.trim()),
          maxIncome: Number(schemeForm.maxIncome),
          academicYear: schemeForm.academicYear,
          ruleVersion: schemeForm.ruleVersion,
          guidelineReference: schemeForm.guidelineReference,
          deadlines: {
            applicationDeadline: new Date(schemeForm.applicationDeadline),
            collegeVerificationDeadline: new Date(schemeForm.collegeVerificationDeadline),
            ministryScrutinyDeadline: new Date(schemeForm.ministryScrutinyDeadline),
          },
          selectionRules: {
            method: schemeForm.selectionMethod,
          },
          continuationRules: {
            minAttendance: Number(schemeForm.minAttendance),
            minPassMarks: Number(schemeForm.minPassMarks),
          },
        }),
      });
      alert("Scheme rules and versioning saved successfully.");
      setSchemeModalOpen(false);
      loadMinistryData();
    } catch (err) {
      alert("Failed to save scheme: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const loadMinistryData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (selectedState) queryParams.set("state", selectedState);
      if (selectedDistrict) queryParams.set("district", selectedDistrict);
      if (selectedCollegeId) queryParams.set("collegeId", selectedCollegeId);
      if (selectedSchemeId) queryParams.set("schemeId", selectedSchemeId);
      if (selectedAcademicYear) queryParams.set("academicYear", selectedAcademicYear);
      if (statusFilter) queryParams.set("status", statusFilter);

      const [statsRes, collegesRes, appsRes, schemesRes, paymentsRes] = await Promise.all([
        apiRequest(`/api/ministry/stats?${queryParams.toString()}`),
        apiRequest("/api/ministry/colleges"),
        apiRequest(`/api/ministry/applications?${queryParams.toString()}`),
        apiRequest("/api/ministry/schemes"),
        apiRequest(`/api/ministry/payments?${queryParams.toString()}`),
      ]);

      setStats(statsRes?.stats || null);
      setColleges(collegesRes?.colleges || []);
      setApplications(appsRes?.applications || []);
      setSchemes(schemesRes?.schemes || []);
      setPaymentsData(paymentsRes || { payments: [], summary: {} });

      if (user?.role === "MINISTRY_ADMIN") {
        const auditRes = await apiRequest("/api/ministry/audit-logs?limit=50").catch(() => ({ logs: [] }));
        setAuditLogs(auditRes?.logs || []);
      }
    } catch (err) {
      console.error("Ministry dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleScrutinySubmit = async (e) => {
    e.preventDefault();
    if (!scrutinyComments.trim()) {
      alert("Official scrutiny remarks are required.");
      return;
    }

    try {
      setActionLoading(true);
      // If user is approver or admin, execute official selection decision
      if (["MINISTRY_APPROVER", "MINISTRY_ADMIN"].includes(user?.role)) {
        await apiRequest(`/api/ministry/applications/${scrutinyApp.applicationId}/selection`, {
          method: "POST",
          body: JSON.stringify({
            decision: selectionDecision,
            reason: scrutinyComments.trim(),
            sanctionedAmount: sanctionedAmt,
          }),
        });
        alert(`Application decision recorded: ${selectionDecision}`);
      } else {
        await apiRequest(`/api/ministry/applications/${scrutinyApp.applicationId}/scrutiny`, {
          method: "POST",
          body: JSON.stringify({ comments: scrutinyComments.trim() }),
        });
        alert("Ministry scrutiny remarks recorded.");
      }

      setScrutinyModalOpen(false);
      loadMinistryData();
    } catch (err) {
      alert("Action failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExternalStatusSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await apiRequest(`/api/applications/${extStatusApp.applicationId}/external-status`, {
        method: "POST",
        body: JSON.stringify({
          externalApplicationId: extAppId.trim(),
          externalPortalSource: extSource.trim(),
          externalStatus: extStatus,
          evidenceReference: extEvidence.trim(),
        }),
      });
      alert("Government portal status updated and audited.");
      setExternalModalOpen(false);
      loadMinistryData();
    } catch (err) {
      alert("Update failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCollege = async (e) => {
    e.preventDefault();
    try {
      await apiRequest("/api/ministry/colleges", {
        method: "POST",
        body: JSON.stringify(newCol),
      });
      alert("New college record created successfully.");
      setCreateCollegeModalOpen(false);
      setNewCol({
        collegeId: "",
        collegeName: "",
        institutionType: "Government Engineering College",
        district: "Salem",
        state: "Tamil Nadu",
        contactEmail: "",
        contactPhone: "",
      });
      loadMinistryData();
    } catch (err) {
      alert("Failed to create college: " + err.message);
    }
  };

  const handlePaymentConfirm = async (paymentId, amount) => {
    const utr = prompt("Enter bank transaction reference / UTR / PFMS Scroll number for confirmed DBT credit:", `UTR-2026-${Math.floor(100000 + Math.random() * 900000)}`);
    if (!utr) return;

    try {
      await apiRequest(`/api/ministry/payments/${paymentId}/update-status`, {
        method: "POST",
        body: JSON.stringify({
          paymentStatus: "CONFIRMED",
          paidAmount: amount,
          paymentReference: utr.trim(),
          source: "PFMS_DISPATCH_CONFIRMED",
        }),
      });
      alert("Payment status updated to CONFIRMED and student notified!");
      loadMinistryData();
    } catch (err) {
      alert("Payment update failed: " + err.message);
    }
  };

  return (
    <div className="ministry-page">
      {/* HEADER */}
      <header className="ministry-header">
        <div className="ministry-header-container">
          <div className="brand">
            <img src="/sgp-emblem.png" alt="SGP Emblem" />
            <div>
              <h2>Ministry of Tribal Affairs &amp; Higher Education Portal</h2>
              <p>National Scholarship &amp; Fellowship Scrutiny, Selection &amp; Monitoring Dashboard (SIH 2026)</p>
            </div>
          </div>
          <div className="header-actions">
            <span className="user-badge">
              🇮🇳 {user?.email} ({user?.role})
            </span>
            <button className="btn-logout" style={{ background: "#1e293b" }} onClick={() => navigate("/dashboard")}>
              Main Dashboard
            </button>
            <button className="btn-logout" onClick={logout}>Sign Out</button>
            <LanguageSelector />
          </div>
        </div>
      </header>

      <main className="ministry-main-container">
        {loading && <div style={{ color: "#2563eb", fontSize: "13px", fontWeight: 600, padding: "8px 0" }}>🔄 Loading national scholarship statistics &amp; records...</div>}

        {/* 1. STATISTICAL KPI SUMMARY CARDS */}
        <div className="summary-grid">
          <div className="stat-card">
            <span className="stat-val">{stats?.totalColleges ?? "—"}</span>
            <span className="stat-lbl">Total Colleges</span>
          </div>
          <div className="stat-card">
            <span className="stat-val">{stats?.totalStudents ?? "—"}</span>
            <span className="stat-lbl">Total Students</span>
          </div>
          <div className="stat-card stat-blue">
            <span className="stat-val">{stats?.totalApplications ?? "—"}</span>
            <span className="stat-lbl">Total Applications</span>
          </div>
          <div className="stat-card stat-amber">
            <span className="stat-val">{stats?.pendingVerification ?? "—"}</span>
            <span className="stat-lbl">Pending Verification</span>
          </div>
          <div className="stat-card stat-red">
            <span className="stat-val">{stats?.deficiencyCases ?? "—"}</span>
            <span className="stat-lbl">Deficiency Cases</span>
          </div>
          <div className="stat-card stat-teal">
            <span className="stat-val">{stats?.verified ?? "—"}</span>
            <span className="stat-lbl">Verified Bonafide</span>
          </div>
          <div className="stat-card stat-purple">
            <span className="stat-val">{stats?.selectionPending ?? "—"}</span>
            <span className="stat-lbl">Selection Pending</span>
          </div>
          <div className="stat-card stat-green">
            <span className="stat-val">{stats?.selected ?? "—"}</span>
            <span className="stat-lbl">Selected &amp; Sanctioned</span>
          </div>
          <div className="stat-card">
            <span className="stat-val">{stats?.notSelected ?? "—"}</span>
            <span className="stat-lbl">Not Selected</span>
          </div>
          <div className="stat-card stat-gold">
            <span className="stat-val">{stats?.awarded ?? "—"}</span>
            <span className="stat-lbl">Award Letters</span>
          </div>
          <div className="stat-card stat-green">
            <span className="stat-val">{stats?.paymentConfirmed ?? "—"}</span>
            <span className="stat-lbl">DBT Paid Confirmed</span>
          </div>
          <div className="stat-card">
            <span className="stat-val">{stats?.continuation ?? "—"}</span>
            <span className="stat-lbl">Renewal / Continuation</span>
          </div>
        </div>

        {/* 2. MULTI-CRITERIA FILTER BAR */}
        <div className="multi-filter-card">
          <div className="filter-title-row">
            <h4>🔎 National / State Multi-Dimension Scrutiny Filters</h4>
            {(selectedState || selectedDistrict || selectedCollegeId || selectedSchemeId || statusFilter || paymentStatusFilter) && (
              <button
                className="btn-clear-all"
                onClick={() => {
                  setSelectedState("");
                  setSelectedDistrict("");
                  setSelectedCollegeId("");
                  setSelectedSchemeId("");
                  setStatusFilter("");
                  setPaymentStatusFilter("");
                }}
              >
                Reset All Filters
              </button>
            )}
          </div>
          <div className="filter-selects-grid">
            <div>
              <label>Scholarship Scheme</label>
              <select value={selectedSchemeId} onChange={(e) => setSelectedSchemeId(e.target.value)}>
                <option value="">All Schemes ({schemes.length})</option>
                {schemes.map((s) => (
                  <option key={s.schemeId} value={s.schemeId}>
                    [{s.schemeType}] {s.schemeId}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Academic Year</label>
              <select value={selectedAcademicYear} onChange={(e) => setSelectedAcademicYear(e.target.value)}>
                <option value="">All Academic Years</option>
                <option value="2026-2027">2026-2027</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2024-2025">2024-2025</option>
              </select>
            </div>

            <div>
              <label>State</label>
              <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)}>
                <option value="">All States (India)</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Kerala">Kerala</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Andhra Pradesh">Andhra Pradesh</option>
              </select>
            </div>

            <div>
              <label>Institution / College</label>
              <select value={selectedCollegeId} onChange={(e) => setSelectedCollegeId(e.target.value)}>
                <option value="">All Colleges ({colleges.length})</option>
                {colleges.map((c) => (
                  <option key={c.collegeId} value={c.collegeId}>
                    {c.collegeName} ({c.district})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Application Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="COLLEGE_REVIEW">College Review</option>
                <option value="CORRECTION_REQUIRED">Deficiency Flagged</option>
                <option value="MINISTRY_SCRUTINY">Ministry Scrutiny</option>
                <option value="SELECTED">Selected / Sanctioned</option>
                <option value="PAID">DBT Paid Confirmed</option>
              </select>
            </div>

            <div>
              <label>Payment Status</label>
              <select value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)}>
                <option value="">All Payment Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed Paid</option>
                <option value="FAILED">Failed</option>
                <option value="REVERSED">Reversed</option>
                <option value="UNKNOWN">Unknown</option>
              </select>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="min-tabs" aria-label="Ministry Dashboard Navigation">
          <button
            className={`tab-btn ${activeTab === "ANALYTICS" ? "active" : ""}`}
            onClick={() => setActiveTab("ANALYTICS")}
          >
            📈 National Analytics
          </button>
          <button
            className={`tab-btn ${activeTab === "OVERVIEW" ? "active" : ""}`}
            onClick={() => setActiveTab("OVERVIEW")}
          >
            📊 Scrutiny &amp; Applications ({applications.length})
          </button>
          <button
            className={`tab-btn ${activeTab === "COLLEGES" ? "active" : ""}`}
            onClick={() => setActiveTab("COLLEGES")}
          >
            🏛️ College Monitoring ({colleges.length})
          </button>
          <button
            className={`tab-btn ${activeTab === "ADMIN_TABLE" ? "active" : ""}`}
            onClick={() => setActiveTab("ADMIN_TABLE")}
          >
            📊 Admin Master Table
          </button>
          <button
            className={`tab-btn ${activeTab === "PAYMENTS" ? "active" : ""}`}
            onClick={() => setActiveTab("PAYMENTS")}
          >
            💳 DBT Payments ({paymentsData.payments?.length || 0})
          </button>
          <button
            className={`tab-btn ${activeTab === "SCHEMES" ? "active" : ""}`}
            onClick={() => setActiveTab("SCHEMES")}
          >
            ⚙️ Scheme Configuration ({schemes.length})
          </button>
          <button
            className={`tab-btn ${activeTab === "REPORT_BUILDER" ? "active" : ""}`}
            onClick={() => setActiveTab("REPORT_BUILDER")}
          >
            📑 Statutory Reports
          </button>
          <button
            className={`tab-btn ${activeTab === "TICKETS" ? "active" : ""}`}
            onClick={() => setActiveTab("TICKETS")}
          >
            🎫 Support Tickets ({tickets.length})
          </button>
          {user?.role === "MINISTRY_ADMIN" && (
            <button
              className={`tab-btn ${activeTab === "AUDIT" ? "active" : ""}`}
              onClick={() => setActiveTab("AUDIT")}
            >
              📜 Audit Trail ({auditLogs.length})
            </button>
          )}
        </div>

        {/* ERROR BOUNDARY WRAPPING ACTIVE TAB CONTENT */}
        <ErrorBoundary title="Ministry Portal View Error">
        {/* TAB 0: ADVANCED NATIONAL ANALYTICS (Phase 2 & 3) */}
        {activeTab === "ANALYTICS" && (
          <div className="analytics-tab-container">
            {/* Context, Data Quality & Jurisdiction Banner */}
            <div className="analytics-meta-banner">
              <div className="meta-left">
                <span className="live-dot">●</span>
                <strong>National Ministry Analytics Engine (SIH26239)</strong>
                <span className="meta-sub">
                  Database: {analyticsData?.dataQuality?.trackingMethod || "Scrutiny Cluster Replica"} &bull; Sample: {analyticsData?.metadata?.sampleSize || 0} applications
                </span>
              </div>
              <div className="meta-right">
                <span className="meta-time">
                  Freshness: {analyticsData?.dataQuality?.lastSyncTimestamp ? new Date(analyticsData.dataQuality.lastSyncTimestamp).toLocaleTimeString() : "Live"}
                </span>
                <button
                  type="button"
                  className="btn-refresh-analytics"
                  onClick={() => loadMinistryAnalytics()}
                  disabled={analyticsLoading}
                >
                  {analyticsLoading ? "🔄 Syncing..." : "🔄 Refresh"}
                </button>
              </div>
            </div>

            {/* Jurisdiction Boundary Note */}
            <div className="jurisdiction-pill-banner">
              🛡️ <strong>Authorized Jurisdiction Scoping:</strong> Showing records strictly within user's authenticated scope ({analyticsData?.metadata?.jurisdictionScope || "National Level Authorization"}). Records beyond authorized institutional boundaries are excluded.
            </div>

            {analyticsLoading && (
              <div className="analytics-loading-box">
                ⏳ Computing server-side aggregations for national scholarship registry...
              </div>
            )}

            {analyticsError && (
              <div className="analytics-error-box">
                ❌ {analyticsError}
              </div>
            )}

            {/* 10. Recorded Budget Overview (Displayed ONLY when budget is available) */}
            {analyticsData?.budgetOverview?.hasBudget && (
              <div className="budget-overview-card">
                <div className="budget-card-hd">
                  <div>
                    <h4>💰 Recorded Statutory Budget Overview &bull; FY {analyticsData.budgetOverview.financialYear}</h4>
                    <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                      Scheme: <strong>{analyticsData.budgetOverview.schemeName}</strong> &bull; Ministry: {analyticsData.budgetOverview.ministry}
                    </p>
                  </div>
                  <span className="badge-verified">Budget Tracked</span>
                </div>
                <div className="budget-metrics-grid">
                  <div className="b-metric-box">
                    <label>Allocated Budget</label>
                    <span>{formatINR(analyticsData.budgetOverview.allocatedBudget)}</span>
                  </div>
                  <div className="b-metric-box">
                    <label>Utilized / Disbursed</label>
                    <span style={{ color: "#059669" }}>{formatINR(analyticsData.budgetOverview.utilizedBudget)}</span>
                  </div>
                  <div className="b-metric-box">
                    <label>Remaining Balance</label>
                    <span style={{ color: "#2563eb" }}>{formatINR(analyticsData.budgetOverview.remainingBudget)}</span>
                  </div>
                  <div className="b-metric-box">
                    <label>Utilization Rate</label>
                    <span style={{ color: (analyticsData.budgetOverview.utilizationRate || 0) > 80 ? "#dc2626" : "#0f172a" }}>
                      {formatPercent(analyticsData.budgetOverview.utilizationRate)}
                    </span>
                  </div>
                </div>
                <div className="budget-progress-bar-bg">
                  <div
                    className="budget-progress-bar-fill"
                    style={{ width: `${Math.min(100, analyticsData.budgetOverview.utilizationRate || 0)}%` }}
                  />
                </div>
              </div>
            )}

            {/* 1. NFST / NOS Scheme Comparison (Phase 2.1) */}
            <div className="table-card">
              <div className="card-top-bar" style={{ padding: "16px 20px" }}>
                <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>⚖️ NFST / NOS Central Scheme Performance Comparison</h4>
                <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                  Side-by-side comparative analysis of National Fellowship for Higher Education (NFST) and National Overseas Scholarship (NOS).
                </p>
              </div>
              <div className="table-responsive-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Scheme Identifier &amp; Name</th>
                      <th>Total Applications</th>
                      <th>Reviews Completed</th>
                      <th>Completion Rate</th>
                      <th>Selected Awards</th>
                      <th>Total Sanctioned</th>
                      <th>Confirmed Disbursed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analyticsData?.schemeComparison || []).map((sc) => (
                      <tr key={sc.schemeId}>
                        <td>
                          <strong>{sc.schemeName || sc.schemeId}</strong>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>{sc.schemeId}</div>
                        </td>
                        <td><strong>{formatCount(sc.totalApplications)}</strong></td>
                        <td>{formatCount(sc.collegeVerifiedCount ?? sc.completedReviews ?? sc.verifiedCount)}</td>
                        <td>
                          <span className="badge-verified">{formatPercent(sc.verificationRate ?? sc.reviewCompletionRate)}</span>
                        </td>
                        <td><span className="cat-pill">{formatCount(sc.selectedCount)}</span></td>
                        <td>{formatINR(sc.totalSanctionedAmount ?? sc.sanctionedAmount)}</td>
                        <td style={{ color: "#059669", fontWeight: 700 }}>
                          {formatINR(sc.totalConfirmedPaid ?? sc.disbursedAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Workflow Stage Durations (Average & Median Time) */}
            <div className="review-time-cards-grid">
              <div className="time-metric-card">
                <div className="time-card-title">🏫 College Verification Turnaround</div>
                <div className="time-card-val">
                  {analyticsData?.stageDurations?.collegeVerification?.meanDays ?? "N/A"} <span className="time-unit">Mean Days</span>
                </div>
                <div className="time-card-desc">
                  Median: <strong>{analyticsData?.stageDurations?.collegeVerification?.medianDays ?? "N/A"} Days</strong> &bull; Completed case duration
                </div>
              </div>
              <div className="time-metric-card">
                <div className="time-card-title">🏛️ Ministry Scrutiny Turnaround</div>
                <div className="time-card-val">
                  {analyticsData?.stageDurations?.ministryScrutiny?.meanDays ?? "N/A"} <span className="time-unit">Mean Days</span>
                </div>
                <div className="time-card-desc">
                  Median: <strong>{analyticsData?.stageDurations?.ministryScrutiny?.medianDays ?? "N/A"} Days</strong> &bull; Committee sign-off speed
                </div>
              </div>
              <div className="time-metric-card">
                <div className="time-card-title">💳 DBT Disbursement Turnaround</div>
                <div className="time-card-val">
                  {analyticsData?.stageDurations?.disbursement?.meanDays ?? "N/A"} <span className="time-unit">Mean Days</span>
                </div>
                <div className="time-card-desc">
                  Median: <strong>{analyticsData?.stageDurations?.disbursement?.medianDays ?? "N/A"} Days</strong> &bull; Payment gateway release
                </div>
              </div>
            </div>

            {/* 4. Application Cohort Funnel */}
            <FunnelChart
              title="National Application Cohort Funnel"
              subtitle="Conversion of application cohort across key statutory lifecycle stages (Sample size: cohort applications)"
              stages={analyticsData?.cohortFunnel?.stages || []}
              cohortTotal={analyticsData?.cohortFunnel?.cohortTotal || 0}
            />

            {/* 5. Sanctioned vs Confirmed Paid Amounts (Strict institutional vs student separation & reversals) */}
            <div className="table-card">
              <div className="card-top-bar" style={{ padding: "16px 20px" }}>
                <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>💳 Sanctioned vs Confirmed Paid Amounts (Component Breakdown)</h4>
                <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                  Institutional fee payments kept strictly separate from direct student DBT. Handles partial payments and audited reversals.
                </p>
              </div>
              <div className="disbursement-breakdown-grid">
                <div className="disb-card disb-sanctioned">
                  <span className="disb-lbl">Total Sanctioned Amount</span>
                  <span className="disb-amt">{formatINR(analyticsData?.disbursementOverview?.totalSanctionedAmount)}</span>
                  <span className="disb-sub">100% of approved awards</span>
                </div>
                <div className="disb-card disb-student">
                  <span className="disb-lbl">Direct Student DBT Confirmed</span>
                  <span className="disb-amt">{formatINR(analyticsData?.disbursementOverview?.studentDirectPayments?.amount)}</span>
                  <span className="disb-sub">{formatCount(analyticsData?.disbursementOverview?.studentDirectPayments?.transactionCount)} Student Account Txns</span>
                </div>
                <div className="disb-card disb-inst">
                  <span className="disb-lbl">Institutional Fee Confirmed</span>
                  <span className="disb-amt">{formatINR(analyticsData?.disbursementOverview?.institutionalFeePayments?.amount)}</span>
                  <span className="disb-sub">{formatCount(analyticsData?.disbursementOverview?.institutionalFeePayments?.transactionCount)} College Tuition Txns</span>
                </div>
                <div className="disb-card disb-net">
                  <span className="disb-lbl">Net Paid Rate</span>
                  <span className="disb-amt" style={{ color: "#059669" }}>{formatPercent(analyticsData?.disbursementOverview?.paidPercentage)}</span>
                  <span className="disb-sub">
                    {formatCount(analyticsData?.disbursementOverview?.partialPayments?.count)} Partials &bull; {formatCount(analyticsData?.disbursementOverview?.reversals?.count)} Reversals Handled
                  </span>
                </div>
              </div>
            </div>

            {/* 2 & 6. College Review Completion, Overdue Rates & Student Payment Coverage */}
            <div className="table-card">
              <div className="card-top-bar" style={{ padding: "16px 20px" }}>
                <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>🏛️ College-Level Review Completion, Overdue Rates &amp; Payment Coverage</h4>
                <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                  Displays both counts and rates with sample sizes. Colleges are evaluated by turnaround and coverage rather than raw volume alone.
                </p>
              </div>
              <div className="table-responsive-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>College Name &amp; District</th>
                      <th>Total Apps</th>
                      <th>Completed Reviews</th>
                      <th>Review Completion (%)</th>
                      <th>Overdue Cases</th>
                      <th>Overdue Rate (%)</th>
                      <th>Approved for DBT</th>
                      <th>Paid Students</th>
                      <th>Payment Coverage (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analyticsData?.collegePerformance || []).map((cp) => (
                      <tr key={cp.collegeId}>
                        <td>
                          <strong>{cp.collegeName}</strong>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>{cp.district} ({cp.collegeId})</div>
                        </td>
                        <td><strong>{formatCount(cp.totalApplications)}</strong></td>
                        <td>{formatCount(cp.completedReviews)}</td>
                        <td>
                          <span className="badge-verified">{formatPercent(cp.reviewCompletionRate)}</span>
                        </td>
                        <td>
                          {(cp.overdueCases || cp.overdueCount) > 0 ? (
                            <span className="badge-flagged">⚠️ {cp.overdueCases || cp.overdueCount}</span>
                          ) : (
                            <span style={{ color: "#059669" }}>0</span>
                          )}
                        </td>
                        <td>{formatPercent(cp.overdueRate)}</td>
                        <td>{formatCount(cp.studentsApprovedForPayment)}</td>
                        <td><strong style={{ color: "#059669" }}>{formatCount(cp.studentsConfirmedPaid)}</strong></td>
                        <td>
                          <span className="cat-pill">{formatPercent(cp.studentPaymentCoverageRate)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 7 & 8. Multi-Year Continuation Reviews & Reviewer Workload */}
            <div className="charts-two-col-grid">
              {/* Progress Report & Continuation Review Tracking */}
              <div className="table-card">
                <div className="card-top-bar" style={{ padding: "16px 20px" }}>
                  <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 800 }}>🔄 Progress Report &amp; Continuation Tracking</h4>
                  <p style={{ margin: "2px 0 0 0", fontSize: "11.5px", color: "#64748b" }}>
                    Annual renewal milestone tracking for multi-year research scholars and degree candidates.
                  </p>
                </div>
                <div style={{ padding: "16px 20px" }}>
                  <div className="import-stat-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    <div className="stat-box box-green">
                      <span>{analyticsData?.continuationTracking?.clearedContinuation || 0}</span>
                      <label>Continuation Cleared</label>
                    </div>
                    <div className="stat-box box-amber">
                      <span>{analyticsData?.continuationTracking?.pendingReview || 0}</span>
                      <label>Pending Annual Review</label>
                    </div>
                    <div className="stat-box box-blue">
                      <span>{analyticsData?.continuationTracking?.progressReportsSubmitted || 0}</span>
                      <label>Reports Received</label>
                    </div>
                    <div className="stat-box box-red">
                      <span>{analyticsData?.continuationTracking?.deficienciesFlagged || 0}</span>
                      <label>Discrepancies Flagged</label>
                    </div>
                  </div>
                  <div style={{ marginTop: "12px", fontSize: "12px", color: "#475569" }}>
                    Total Scholars On Ongoing Scheme: <strong>{analyticsData?.continuationTracking?.totalScholarsOnScheme || 0}</strong>
                  </div>
                </div>
              </div>

              {/* Reviewer Workload */}
              <div className="table-card">
                <div className="card-top-bar" style={{ padding: "16px 20px" }}>
                  <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 800 }}>👤 Ministry Reviewer Workload Allocation</h4>
                  <p style={{ margin: "2px 0 0 0", fontSize: "11.5px", color: "#64748b" }}>
                    Scrutiny officer assignments and overdue pending backlogs.
                  </p>
                </div>
                <div className="table-responsive-container">
                  <table className="data-table" style={{ fontSize: "12px" }}>
                    <thead>
                      <tr>
                        <th>Officer Name</th>
                        <th>Assigned</th>
                        <th>Completed</th>
                        <th>Pending</th>
                        <th>Overdue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(analyticsData?.reviewerWorkload || []).map((rw) => (
                        <tr key={rw.reviewerId}>
                          <td><strong>{rw.reviewerName}</strong></td>
                          <td>{rw.assignedCount}</td>
                          <td><span className="badge-verified">{rw.completedCount}</span></td>
                          <td>{rw.pendingCount}</td>
                          <td>
                            {rw.overdueCount > 0 ? (
                              <span className="badge-flagged">{rw.overdueCount}</span>
                            ) : (
                              <span style={{ color: "#059669" }}>0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 9. Data Quality & Freshness Indicators */}
            <div className="table-card">
              <div className="card-top-bar" style={{ padding: "16px 20px" }}>
                <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>🔍 Data Quality, Freshness &amp; OCR Inspection Metrics</h4>
                <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                  System telemetry, client OCR confidence breakdown, and database sync status. Zero synthetic extrapolations.
                </p>
              </div>
              <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                <div className="b-metric-box">
                  <label>Database Status</label>
                  <span style={{ fontSize: "16px", color: "#059669" }}>● {analyticsData?.dataQuality?.databaseReplica || "Primary Online"}</span>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>Read-through operational database</div>
                </div>
                <div className="b-metric-box">
                  <label>OCR High Confidence (&gt;90%)</label>
                  <span style={{ fontSize: "20px", color: "#059669" }}>{analyticsData?.dataQuality?.ocrConfidenceDistribution?.highConfidence || 0} Docs</span>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>Verified automatic pass</div>
                </div>
                <div className="b-metric-box">
                  <label>OCR Moderate (80-90%)</label>
                  <span style={{ fontSize: "20px", color: "#d97706" }}>{analyticsData?.dataQuality?.ocrConfidenceDistribution?.moderateConfidence || 0} Docs</span>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>Recommended human check</div>
                </div>
                <div className="b-metric-box">
                  <label>OCR Uncertain (&lt;80%)</label>
                  <span style={{ fontSize: "20px", color: "#dc2626" }}>{analyticsData?.dataQuality?.ocrConfidenceDistribution?.lowConfidence || 0} Docs</span>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>Mandatory visual verification</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB REPORT_BUILDER: STATUTORY REPORT BUILDER (Phase 4.8) */}
        {activeTab === "REPORT_BUILDER" && (
          <div className="table-card" style={{ padding: "24px" }}>
            <div className="card-top-bar" style={{ padding: 0, marginBottom: "18px" }}>
              <div>
                <h3>📑 National Statutory Report Builder</h3>
                <p>
                  Export the currently filtered summaries, audit parameters, data coverage, and institutional aggregates.
                  Preserves export permissions and sensitive-data exclusions.
                </p>
              </div>
            </div>

            {/* Filter Definitions Box */}
            <div className="report-filter-def-box">
              <div style={{ fontWeight: 700, marginBottom: "8px", fontSize: "13px" }}>Active Filter Definitions &amp; Scope:</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", fontSize: "12px" }}>
                <div>Scheme: <strong>{selectedSchemeId || "All Schemes (NFST & NOS)"}</strong></div>
                <div>Academic Year: <strong>{selectedAcademicYear || "2026-2027"}</strong></div>
                <div>State: <strong>{selectedState || "All Authorized States"}</strong></div>
                <div>Institution: <strong>{selectedCollegeId || "All Authorized Colleges"}</strong></div>
                <div>Status Filter: <strong>{statusFilter || "All Active Statuses"}</strong></div>
                <div>Generation Time: <strong>{new Date().toLocaleString()}</strong></div>
              </div>
            </div>

            <div style={{ margin: "20px 0", display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn-action-primary"
                onClick={handleExportExcel}
                disabled={exportLoading}
              >
                {exportLoading ? "Preparing Excel..." : "📥 Download Full OpenXML Excel (.xlsx)"}
              </button>
              <button
                type="button"
                className="btn-action-secondary"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(reportBuilderData || analyticsData, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `SGP_Statutory_Report_${new Date().toISOString().split("T")[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                📄 Export Structured JSON Audit Data
              </button>
            </div>

            {reportBuilderLoading ? (
              <div style={{ textAlign: "center", padding: "30px", color: "#2563eb", fontWeight: 600 }}>
                ⏳ Compiling statutory aggregate reports...
              </div>
            ) : (
              <div className="table-responsive-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Report Metric Component</th>
                      <th>Recorded Aggregate Value</th>
                      <th>Data Source &amp; Authority</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Total Scrutinized Applications</strong></td>
                      <td>{formatCount(reportBuilderData?.summary?.totalApplications || analyticsData?.metadata?.sampleSize || 0)}</td>
                      <td>National Operational MongoDB Registry</td>
                    </tr>
                    <tr>
                      <td><strong>Direct Student DBT Sanctioned</strong></td>
                      <td>{formatINR(analyticsData?.disbursementOverview?.studentDirectPayments?.amount)}</td>
                      <td>PFMS / DBT Mission Integration Ledger</td>
                    </tr>
                    <tr>
                      <td><strong>Institutional Fee Payments Sanctioned</strong></td>
                      <td>{formatINR(analyticsData?.disbursementOverview?.institutionalFeePayments?.amount)}</td>
                      <td>College Bonafide Accounts System</td>
                    </tr>
                    <tr>
                      <td><strong>Review Completion Rate</strong></td>
                      <td>{analyticsData?.summaryCards?.collegeReviewsCompleted?.completionRate || 100}%</td>
                      <td>Institutional Scrutiny Gateway</td>
                    </tr>
                    <tr>
                      <td><strong>Sensitive Data Exclusions</strong></td>
                      <td><span className="badge-verified">Protected (Bank details masked, PII preserved)</span></td>
                      <td>SGP Statutory Privacy Policy 2026</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: SCRUTINY & APPLICATIONS QUEUE */}
        {activeTab === "OVERVIEW" && (
          <div className="min-table-card">
            <div className="card-top-bar">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h3>Applications for Ministry Scrutiny &amp; Selection</h3>
                  <p>Examine forwarded institutional verifications, inspect OCR fields, and record official selection decisions.</p>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn-action-primary"
                    onClick={handleOpenSelectionPreview}
                    title="Simulate selection quota based on statutory criteria"
                  >
                    🎯 Run Selection Preview
                  </button>
                  <button
                    type="button"
                    className="btn-action-secondary"
                    onClick={handleRunDelayCheck}
                    disabled={delayAlertsLoading}
                    title="Audit workflow milestones against statutory deadlines and dispatch escalation notices"
                  >
                    {delayAlertsLoading ? "Auditing Delays..." : "🔔 Statutory Delay Check"}
                  </button>
                </div>
              </div>
              {delayAlertsResult && (
                <div style={{ marginTop: "10px", padding: "8px 12px", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "6px", fontSize: "12px", color: "#92400e" }}>
                  🔔 <strong>Delay Audit Complete:</strong> {delayAlertsResult.message || `Overdue cases: ${delayAlertsResult.overdueCount || 0}, Alerts dispatched: ${delayAlertsResult.alertsCreated || 0}, Duplicates suppressed: ${delayAlertsResult.duplicateAlertsSuppressed || 0}`}
                </div>
              )}
            </div>
            <table className="min-table">
              <thead>
                <tr>
                  <th>Application ID</th>
                  <th>Student &amp; Category</th>
                  <th>College (District)</th>
                  <th>Scheme</th>
                  <th>Application Status</th>
                  <th>OCR &amp; Eligibility</th>
                  <th>External Portal</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                      No applications found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  applications.map((app) => (
                    <tr key={app.applicationId}>
                      <td>
                        <strong>{app.applicationId}</strong>
                        <span className="sub-txt">Year: {app.academicYear}</span>
                      </td>
                      <td>
                        <span className="name-bold">{app.student?.fullName || app.studentId}</span>
                        <span className="sub-txt">Category: <strong>{app.student?.category || "—"}</strong> &bull; Income: {formatINR(app.student?.familyIncome)}</span>
                      </td>
                      <td>
                        <span className="col-name">{app.college?.collegeName || app.collegeId}</span>
                        <span className="sub-txt">{app.college?.district}</span>
                      </td>
                      <td>
                        <span className="scheme-badge">{app.scheme?.schemeName || app.schemeId}</span>
                      </td>
                      <td>
                        <span className={`status-pill pill-${app.applicationStatus.toLowerCase()}`}>
                          {app.applicationStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                          <span className={`doc-pill doc-${app.documentVerificationStatus.toLowerCase()}`}>
                            OCR: {app.documentVerificationStatus}
                          </span>
                          <span className={`doc-pill doc-${app.eligibilityStatus.toLowerCase()}`}>
                            Eligible: {app.eligibilityStatus}
                          </span>
                        </div>
                      </td>
                      <td>
                        {app.externalApplicationId ? (
                          <div>
                            <strong style={{ fontSize: "11px", color: "#059669" }}>{app.externalApplicationId}</strong>
                            <span className="sub-txt">{app.externalStatus || "Submitted"}</span>
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "11px" }}>Unlinked</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="btn-tbl-scrutiny"
                            onClick={() => {
                              setScrutinyApp(app);
                              setScrutinyComments("");
                              setScrutinyModalOpen(true);
                            }}
                          >
                            Scrutiny / Selection →
                          </button>
                          <button
                            className="btn-tbl-ext"
                            onClick={() => {
                              setExtStatusApp(app);
                              setExtAppId(app.externalApplicationId || "");
                              setExtSource(app.externalPortalSource || "National Scholarship Portal (scholarships.gov.in)");
                              setExtStatus(app.externalStatus || "UNDER_VERIFICATION");
                              setExtEvidence(app.externalEvidence || "");
                              setExternalModalOpen(true);
                            }}
                          >
                            Govt Portal Update
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: COLLEGE PERFORMANCE MONITORING (Part 18) */}
        {activeTab === "COLLEGES" && (
          <div className="min-table-card">
            <div className="card-top-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3>Institutional Performance &amp; Monitoring ({colleges.length})</h3>
                <p>Calculated from real MongoDB application records with verified statistics.</p>
              </div>
              {user?.role === "MINISTRY_ADMIN" && (
                <button className="btn-add-col" onClick={() => setCreateCollegeModalOpen(true)}>
                  ➕ Register New College
                </button>
              )}
            </div>
            <table className="min-table">
              <thead>
                <tr>
                  <th>College ID</th>
                  <th>College Name</th>
                  <th>District / State</th>
                  <th>Type</th>
                  <th>Students</th>
                  <th>Applications</th>
                  <th>Verified</th>
                  <th>Pending</th>
                  <th>Deficient</th>
                  <th>Selected</th>
                  <th>DBT Paid</th>
                </tr>
              </thead>
              <tbody>
                {colleges.map((c) => (
                  <tr key={c.collegeId}>
                    <td><strong>{c.collegeId}</strong></td>
                    <td><span className="col-name">{c.collegeName}</span></td>
                    <td>{c.district}, {c.state}</td>
                    <td><span className="sub-txt">{c.institutionType}</span></td>
                    <td><strong>{c.studentsCount || 0}</strong></td>
                    <td>{c.applicationsCount || 0}</td>
                    <td><span style={{ color: "#059669", fontWeight: 700 }}>{c.verifiedCount || 0}</span></td>
                    <td>{c.pendingCount || 0}</td>
                    <td><span style={{ color: "#dc2626", fontWeight: 700 }}>{c.deficientCount || 0}</span></td>
                    <td><span style={{ color: "#2563eb", fontWeight: 700 }}>{c.selectedCount || 0}</span></td>
                    <td><span style={{ color: "#166534", fontWeight: 800 }}>{c.paidCount || 0}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: PAYMENT TRACKING (Part 19) */}
        {activeTab === "PAYMENTS" && (
          <div>
            {/* Payment Summary Cards (Zero-division safe) */}
            <div className="payment-summary-row">
              <div className="pay-kpi-box">
                <span>Total Sanctioned Amount</span>
                <strong>{formatINR(paymentsData.summary?.totalSanctionedAmount)}</strong>
              </div>
              <div className="pay-kpi-box">
                <span>Total Confirmed DBT Paid</span>
                <strong style={{ color: "#059669" }}>{formatINR(paymentsData.summary?.totalPaidAmount)}</strong>
              </div>
              <div className="pay-kpi-box">
                <span>Students Disbursed %</span>
                <strong style={{ color: "#2563eb" }}>{formatPercent(paymentsData.summary?.studentsPaidPercent)}</strong>
              </div>
              <div className="pay-kpi-box">
                <span>Funds Disbursed %</span>
                <strong style={{ color: "#7c3aed" }}>{formatPercent(paymentsData.summary?.amountPaidPercent)}</strong>
              </div>
            </div>

            <div className="min-table-card">
              <div className="card-top-bar">
                <h3>Post-Selection Payment &amp; DBT Credit Ledger</h3>
                <p>Payment status is updated only upon validated transaction evidence / PFMS scroll numbers.</p>
              </div>
              <table className="min-table">
                <thead>
                  <tr>
                    <th>Payment ID</th>
                    <th>Application ID</th>
                    <th>Student ID</th>
                    <th>Scheme</th>
                    <th>Sanctioned Amount</th>
                    <th>Paid Amount</th>
                    <th>Payment Status</th>
                    <th>Payment Reference / UTR</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsData.payments?.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                        No payment records found. Select an application above to sanction payment.
                      </td>
                    </tr>
                  ) : (
                    paymentsData.payments.map((p) => (
                      <tr key={p.paymentId}>
                        <td><strong>{p.paymentId}</strong></td>
                        <td>{p.applicationId}</td>
                        <td>{p.studentId}</td>
                        <td><span className="scheme-badge">{p.schemeId}</span></td>
                        <td>{formatINR(p.sanctionedAmount)}</td>
                        <td>
                          <strong>{formatINR(p.paidAmount)}</strong>
                        </td>
                        <td>
                          <span className={`status-pill pill-${p.paymentStatus.toLowerCase()}`}>
                            {p.paymentStatus}
                          </span>
                        </td>
                        <td>
                          {p.paymentReference ? (
                            <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>{p.paymentReference}</code>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: "11px" }}>Awaiting DBT Transfer</span>
                          )}
                        </td>
                        <td>
                          {p.paymentStatus !== "CONFIRMED" && ["MINISTRY_ADMIN", "MINISTRY_APPROVER"].includes(user?.role) && (
                            <button
                              className="btn-confirm-pay"
                              onClick={() => handlePaymentConfirm(p.paymentId, p.sanctionedAmount)}
                            >
                              ✔️ Record Confirmed DBT
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT TRAIL (Part 23) */}
        {activeTab === "AUDIT" && (
          <div className="min-table-card">
            <div className="card-top-bar">
              <h3>Tamper-Proof System Audit Trail</h3>
              <p>Chronological immutable record of all critical workflow transitions, logins, decisions, and administrative actions.</p>
            </div>
            <table className="min-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Actor Role &amp; ID</th>
                  <th>Entity Type / ID</th>
                  <th>Reason / Details</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.logId}>
                    <td style={{ whiteSpace: "nowrap", fontSize: "11.5px" }}>{formatDateSafe(log.timestamp)}</td>
                    <td>
                      <span className="audit-action-tag">{log.action}</span>
                    </td>
                    <td>
                      <strong>{log.actorRole}</strong>
                      <span className="sub-txt">{log.actorUserId}</span>
                    </td>
                    <td>
                      {log.entityType}
                      <span className="sub-txt">{log.entityId}</span>
                    </td>
                    <td style={{ maxWidth: "260px" }}>{log.reason || "—"}</td>
                    <td style={{ fontSize: "11px", color: "#64748b" }}>{log.ipAddress || "system"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 5: ADMIN MASTER TABLE (Grouped Layout per Source Documents) */}
        {activeTab === "ADMIN_TABLE" && (
          <div className="min-table-card">
            <div className="card-top-bar">
              <div>
                <h3>📊 National Scholarship Admin Master Table</h3>
                <p>Complete multi-state verified registry grouped across Student, Application, Review, Tracking, and Support.</p>
              </div>
            </div>

            <div className="admin-pagination-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", margin: "14px 0" }}>
              <span>Showing Page <strong>{adminPage}</strong> of <strong>{adminTotalPages}</strong> ({adminTotalCount} total applications)</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="page-btn" disabled={adminPage <= 1 || adminLoading} onClick={() => loadAdminTable(adminPage - 1)}>◀ Previous</button>
                <button className="page-btn" disabled={adminPage >= adminTotalPages || adminLoading} onClick={() => loadAdminTable(adminPage + 1)}>Next ▶</button>
              </div>
            </div>

            {adminLoading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#2563eb", fontWeight: 600 }}>⏳ Loading registry from MongoDB...</div>
            ) : adminRecords.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>No applications found matching criteria.</div>
            ) : (
              <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                <table className="grouped-admin-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ color: "#fff", textAlign: "center", fontWeight: 800 }}>
                      <th colSpan="4" style={{ background: "#1e3a8a", padding: "8px 12px" }}>STUDENT</th>
                      <th colSpan="4" style={{ background: "#4338ca", padding: "8px 12px" }}>APPLICATION</th>
                      <th colSpan="4" style={{ background: "#0f766e", padding: "8px 12px" }}>REVIEW</th>
                      <th colSpan="4" style={{ background: "#b45309", padding: "8px 12px" }}>TRACKING</th>
                      <th colSpan="3" style={{ background: "#6b21a8", padding: "8px 12px" }}>SUPPORT</th>
                    </tr>
                    <tr style={{ background: "#f1f5f9", color: "#334155", fontWeight: 700, borderBottom: "2px solid #cbd5e1" }}>
                      <th>Register Number</th>
                      <th>Name</th>
                      <th>Course</th>
                      <th>Account Activation</th>
                      <th>Scheme</th>
                      <th>Year</th>
                      <th>Internal ID</th>
                      <th>External Reference</th>
                      <th>Uploads</th>
                      <th>Mismatches</th>
                      <th>Reviewer</th>
                      <th>Pending Correction</th>
                      <th>Status</th>
                      <th>Source</th>
                      <th>Last Checked Date</th>
                      <th>Next Action</th>
                      <th>Ticket Owner</th>
                      <th>Latest Reply</th>
                      <th>Deadline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminRecords.map((r) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td><strong>{r.student.registerNumber}</strong></td>
                        <td>{r.student.name}</td>
                        <td>{r.student.course} ({r.student.studyYear})</td>
                        <td><span className={`act-badge act-${r.student.accountActivation.toLowerCase()}`}>{r.student.accountActivation}</span></td>
                        <td><span className="scheme-tag">{r.application.scheme}</span></td>
                        <td>{r.application.year}</td>
                        <td><code>{r.application.internalId}</code></td>
                        <td>{r.application.externalReference || "—"}</td>
                        <td>{r.review.uploads} docs</td>
                        <td>{r.review.mismatches > 0 ? <span className="badge-flagged">{r.review.mismatches} flag(s)</span> : <span className="badge-verified">0 mismatches</span>}</td>
                        <td>{r.review.reviewer}</td>
                        <td>{r.review.pendingCorrection}</td>
                        <td><span className={`status-pill pill-${r.tracking.status.toLowerCase()}`}>{r.tracking.status.replace(/_/g, " ")}</span></td>
                        <td>{r.tracking.source}</td>
                        <td>{r.tracking.lastCheckedDate ? new Date(r.tracking.lastCheckedDate).toISOString().split("T")[0] : "—"}</td>
                        <td style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.tracking.nextAction}>{r.tracking.nextAction}</td>
                        <td>{r.support.ticketOwner}</td>
                        <td style={{ maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.support.latestReply}>{r.support.latestReply}</td>
                        <td>{r.support.deadline ? new Date(r.support.deadline).toISOString().split("T")[0] : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: SCHEME CONFIGURATION (Part 6) */}
        {activeTab === "SCHEMES" && (
          <div className="min-table-card">
            <div className="card-top-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3>⚙️ Statutory Scholarship Scheme Rule Configuration</h3>
                <p>Configure deadlines, eligibility thresholds, required proofs, selection methods, and rule versioning.</p>
              </div>
              {user?.role === "MINISTRY_ADMIN" && (
                <button
                  className="btn-add-college"
                  onClick={() => openSchemeConfig(null)}
                >
                  ➕ Configure New Scheme / Version
                </button>
              )}
            </div>

            <table className="min-table">
              <thead>
                <tr>
                  <th>Scheme ID</th>
                  <th>Scheme Name &amp; Ministry</th>
                  <th>Target Category &amp; Levels</th>
                  <th>Max Income</th>
                  <th>Active Rule Version</th>
                  <th>Application Deadline</th>
                  <th>Selection Method</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schemes.map((s) => (
                  <tr key={s.schemeId}>
                    <td><strong>{s.schemeId}</strong></td>
                    <td>
                      <span className="bold-txt">{s.schemeName}</span>
                      <span className="sub-txt">{s.ministry}</span>
                    </td>
                    <td>
                      <div>{Array.isArray(s.targetCategory) ? s.targetCategory.join(", ") : "ALL"}</div>
                      <span className="sub-txt">{Array.isArray(s.academicLevels) ? s.academicLevels.join(", ") : "ug, pg"}</span>
                    </td>
                    <td>{formatINR(s.maxIncome)}</td>
                    <td>
                      <span className="version-pill">v{s.rules?.ruleVersion || "2026.1"}</span>
                    </td>
                    <td>
                      {s.rules?.deadlines?.applicationDeadline
                        ? new Date(s.rules.deadlines.applicationDeadline).toISOString().split("T")[0]
                        : "2026-10-31"}
                    </td>
                    <td>{s.rules?.selectionRules?.method || "MERIT_AND_MEANS"}</td>
                    <td>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {user?.role === "MINISTRY_ADMIN" && (
                          <button className="tbl-btn-review" onClick={() => openSchemeConfig(s)}>
                            ✏️ Edit Rules / Version
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-action-secondary"
                          style={{ padding: "4px 8px", fontSize: "11px" }}
                          onClick={() => handleOpenRuleImpact(s)}
                          title="Simulate proposed rule changes against active student cohort before publishing"
                        >
                          🧪 Preview Rule Impact
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 7: SUPPORT TICKETS */}
        {activeTab === "TICKETS" && (
          <div className="min-table-card">
            <div className="card-top-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3>🎫 National Scholarship Support Tickets</h3>
                <p>Review escalation queries, procedural questions, and technical help tickets submitted across all institutions.</p>
              </div>
              <button className="clear-btn" onClick={loadMinistryTickets}>🔄 Refresh</button>
            </div>

            {ticketsLoading ? (
              <div style={{ textAlign: "center", padding: "30px", color: "#2563eb" }}>⏳ Loading tickets...</div>
            ) : tickets.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>No tickets submitted yet.</div>
            ) : (
              <div className="tickets-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px", padding: "12px 0" }}>
                {tickets.map((t) => (
                  <div key={t.ticketId} className="ticket-item-card" style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", background: "#f8fafc" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{t.ticketId}</span>
                      <span className={`status-pill pill-${t.status.toLowerCase()}`}>{t.status}</span>
                    </div>
                    <h4 style={{ margin: "8px 0 4px 0" }}>{t.subject}</h4>
                    <p style={{ fontSize: "13px", color: "#334155", margin: "0 0 8px 0" }}>{t.message}</p>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px" }}>
                      Student: <strong>{t.student?.fullName}</strong> ({t.student?.collegeId}) &bull; Category: {t.category}
                    </div>

                    {t.latestReply && (
                      <div style={{ background: "#eff6ff", borderLeft: "3px solid #3b82f6", padding: "8px 12px", borderRadius: "4px", fontSize: "12px" }}>
                        <strong>Reply ({t.repliedBy || "Officer"}):</strong>
                        <p style={{ margin: "2px 0 0 0" }}>{t.latestReply}</p>
                      </div>
                    )}

                    <div style={{ marginTop: "12px" }}>
                      {activeTicket?.ticketId === t.ticketId ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <textarea
                            rows="2"
                            placeholder="Type official reply or directive..."
                            value={ticketReplyText}
                            onChange={(e) => setTicketReplyText(e.target.value)}
                            style={{ width: "100%", boxSizing: "border-box", padding: "8px", border: "1.5px solid #cbd5e1", borderRadius: "6px" }}
                          />
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button className="btn-reply-send" onClick={() => handleTicketReply(t.ticketId)}>Submit Reply</button>
                            <button className="clear-btn" onClick={() => setActiveTicket(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button className="tbl-btn-review" onClick={() => { setActiveTicket(t); setTicketReplyText(""); }}>
                          💬 Reply to Ticket
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </ErrorBoundary>

        {/* --------------------------------
             DATA EXPORT SECTION (Lower Placement)
             -------------------------------- */}
        <div className="ministry-export-section" id="ministry-data-export">
          <div className="export-section-divider">
            <span>Data Export</span>
          </div>
          {exportMessage && (
            <div className="export-banner-success">
              <span>✅ {exportMessage}</span>
            </div>
          )}
          {exportError && (
            <div className="export-banner-error">
              <span>❌ {exportError}</span>
            </div>
          )}
          <div className="export-section-card">
            <div className="export-section-content">
              <div className="export-icon-badge">📊</div>
              <div className="export-text-details">
                <h3>Data Export</h3>
                <p>
                  Download complete national scholarship registry records across 5 OpenXML sheets (Overview, Applications, Colleges, DBT Payments, and Schemes) matching active filter criteria.
                </p>
                <div className="export-metadata-tags">
                  <span className="export-tag">📄 5-Sheet OpenXML XLSX</span>
                  <span className="export-tag">🔒 Role Authorized</span>
                  <span className="export-tag">⚡ Live Filters Applied</span>
                </div>
              </div>
            </div>
            <div className="export-action-container">
              <button
                id="btn-download-excel-main"
                className="btn-download-excel-primary"
                onClick={handleExportExcel}
                disabled={exportLoading}
                title="Download 5-sheet OpenXML Excel file (.xlsx) matching active filters"
              >
                {exportLoading ? "⏳ Preparing Excel..." : "📥 Download Excel"}
              </button>
            </div>
          </div>
        </div>

        {/* SCHEME CONFIGURATION MODAL */}
        {schemeModalOpen && (
          <div className="modal-backdrop">
            <div className="modal-box" style={{ maxWidth: "680px" }}>
              <div className="modal-hd">
                <h3>⚙️ {editingScheme ? `Statutory Scheme & Rule Setup (${editingScheme.schemeId || editingScheme.schemeName || "Edit"})` : "Statutory Scheme & Rule Setup"}</h3>
                <button className="modal-close" onClick={() => setSchemeModalOpen(false)}>✕</button>
              </div>
              <form onSubmit={handleSaveSchemeRule} className="modal-form">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label>Scheme Code / ID *</label>
                    <input
                      type="text"
                      required
                      value={schemeForm.schemeId}
                      onChange={(e) => setSchemeForm({ ...schemeForm, schemeId: e.target.value })}
                      placeholder="e.g. SCH-NSP-ST-01"
                    />
                  </div>
                  <div>
                    <label>Scheme Name *</label>
                    <input
                      type="text"
                      required
                      value={schemeForm.schemeName}
                      onChange={(e) => setSchemeForm({ ...schemeForm, schemeName: e.target.value })}
                      placeholder="e.g. National Fellowship for ST Students"
                    />
                  </div>
                  <div>
                    <label>Rule Version *</label>
                    <input
                      type="text"
                      required
                      value={schemeForm.ruleVersion}
                      onChange={(e) => setSchemeForm({ ...schemeForm, ruleVersion: e.target.value })}
                      placeholder="e.g. 2026.1"
                    />
                  </div>
                  <div>
                    <label>Max Annual Family Income (₹) *</label>
                    <input
                      type="number"
                      required
                      value={schemeForm.maxIncome}
                      onChange={(e) => setSchemeForm({ ...schemeForm, maxIncome: e.target.value })}
                    />
                  </div>
                  <div>
                    <label>Application Deadline *</label>
                    <input
                      type="date"
                      required
                      value={schemeForm.applicationDeadline}
                      onChange={(e) => setSchemeForm({ ...schemeForm, applicationDeadline: e.target.value })}
                    />
                  </div>
                  <div>
                    <label>College Verification Deadline *</label>
                    <input
                      type="date"
                      required
                      value={schemeForm.collegeVerificationDeadline}
                      onChange={(e) => setSchemeForm({ ...schemeForm, collegeVerificationDeadline: e.target.value })}
                    />
                  </div>
                  <div>
                    <label>Ministry Scrutiny Deadline *</label>
                    <input
                      type="date"
                      required
                      value={schemeForm.ministryScrutinyDeadline}
                      onChange={(e) => setSchemeForm({ ...schemeForm, ministryScrutinyDeadline: e.target.value })}
                    />
                  </div>
                  <div>
                    <label>Selection Method</label>
                    <select
                      value={schemeForm.selectionMethod}
                      onChange={(e) => setSchemeForm({ ...schemeForm, selectionMethod: e.target.value })}
                    >
                      <option value="MERIT_AND_MEANS">Merit and Means</option>
                      <option value="STATUTORY_QUOTA">Statutory Quota / Community</option>
                      <option value="ALL_ELIGIBLE">All Eligible</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: "12px" }}>
                  <label>Official Guideline / Government Reference</label>
                  <input
                    type="text"
                    value={schemeForm.guidelineReference}
                    onChange={(e) => setSchemeForm({ ...schemeForm, guidelineReference: e.target.value })}
                    placeholder="e.g. MOTA Directive No. 42/2026"
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" }}>
                  <button type="button" className="btn-cancel" onClick={() => setSchemeModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-save-ext" disabled={actionLoading}>
                    {actionLoading ? "Saving Rules..." : "Save Scheme Configuration"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {scrutinyModalOpen && scrutinyApp && (
          <div className="modal-backdrop">
            <div className="modal-box" style={{ maxWidth: "600px" }}>
              <div className="modal-hd">
                <div>
                  <span className="app-id-pill">{scrutinyApp.applicationId}</span>
                  <h3>Ministry Scrutiny &amp; Selection Committee</h3>
                </div>
                <button className="modal-close" onClick={() => setScrutinyModalOpen(false)}>✕</button>
              </div>

              <div className="modal-info-summary">
                <div><strong>Student:</strong> {scrutinyApp.student?.fullName} ({scrutinyApp.student?.category})</div>
                <div><strong>Institution:</strong> {scrutinyApp.college?.collegeName}</div>
                <div><strong>Income:</strong> {formatINR(scrutinyApp.student?.familyIncome)}</div>
                <div><strong>Scheme:</strong> {scrutinyApp.scheme?.schemeName || scrutinyApp.schemeId}</div>
              </div>

              <form onSubmit={handleScrutinySubmit}>
                {["MINISTRY_APPROVER", "MINISTRY_ADMIN"].includes(user?.role) ? (
                  <div>
                    <div className="form-group">
                      <label>Official Selection Decision *</label>
                      <select value={selectionDecision} onChange={(e) => setSelectionDecision(e.target.value)}>
                        <option value="SELECTED">SELECTED (Award &amp; Sanction Approved)</option>
                        <option value="NOT_SELECTED">NOT_SELECTED (Quota Exhausted / Ineligible)</option>
                      </select>
                    </div>

                    {selectionDecision === "SELECTED" && (
                      <div className="form-group">
                        <label>Sanctioned Annual Amount (₹)</label>
                        <input
                          type="number"
                          value={sanctionedAmt}
                          onChange={(e) => setSanctionedAmt(Number(e.target.value))}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="info-banner">
                    ℹ️ You are logged in as <strong>{user?.role}</strong>. You can record scrutiny remarks. Official selection requires Ministry Approver authorization.
                  </div>
                )}

                <div className="form-group">
                  <label>Scrutiny Notes &amp; Statutory Committee Justification *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Enter statutory verification findings, quota justification, and official committee resolution..."
                    value={scrutinyComments}
                    onChange={(e) => setScrutinyComments(e.target.value)}
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => setScrutinyModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit-decision" disabled={actionLoading}>
                    {actionLoading ? "Recording..." : "Record Official Committee Decision"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MANUAL GOVERNMENT PORTAL UPDATE MODAL (Part 11) */}
        {externalModalOpen && extStatusApp && (
          <div className="modal-backdrop">
            <div className="modal-box" style={{ maxWidth: "560px" }}>
              <div className="modal-hd">
                <h3>Official Government Portal Manual Status Update</h3>
                <button className="modal-close" onClick={() => setExternalModalOpen(false)}>✕</button>
              </div>
              <p style={{ fontSize: "12.5px", color: "#64748b", margin: "0 0 14px 0" }}>
                Authorized staff update for external systems (e.g. NSP / State Portal). All manual updates are strictly audited.
              </p>

              <form onSubmit={handleExternalStatusSubmit}>
                <div className="form-group">
                  <label>Government Portal Application ID *</label>
                  <input
                    type="text"
                    required
                    value={extAppId}
                    onChange={(e) => setExtAppId(e.target.value)}
                    placeholder="e.g. NSP-2026-TN-981240"
                  />
                </div>

                <div className="form-group">
                  <label>Official Portal Source *</label>
                  <input
                    type="text"
                    required
                    value={extSource}
                    onChange={(e) => setExtSource(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Current Status on Government Portal *</label>
                  <select value={extStatus} onChange={(e) => setExtStatus(e.target.value)}>
                    <option value="SUBMITTED">SUBMITTED</option>
                    <option value="UNDER_VERIFICATION">UNDER_VERIFICATION</option>
                    <option value="DEFICIENCY">DEFICIENCY</option>
                    <option value="VERIFIED">VERIFIED</option>
                    <option value="SELECTED">SELECTED</option>
                    <option value="SANCTIONED">SANCTIONED</option>
                    <option value="PAYMENT_PROCESSED">PAYMENT_PROCESSED</option>
                    <option value="OTHER">OTHER</option>
                    <option value="UNKNOWN">UNKNOWN</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Evidence Reference / Dispatch Number</label>
                  <textarea
                    rows={2}
                    placeholder="Enter official check reference, portal screenshot log, or dispatch note..."
                    value={extEvidence}
                    onChange={(e) => setExtEvidence(e.target.value)}
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => setExternalModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit-decision" disabled={actionLoading}>
                    {actionLoading ? "Updating..." : "Save External Status & Audit"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CREATE COLLEGE MODAL */}
        {createCollegeModalOpen && (
          <div className="modal-backdrop">
            <div className="modal-box" style={{ maxWidth: "560px" }}>
              <div className="modal-hd">
                <h3>Register New College / Institution</h3>
                <button className="modal-close" onClick={() => setCreateCollegeModalOpen(false)}>✕</button>
              </div>

              <form onSubmit={handleCreateCollege}>
                <div className="form-group">
                  <label>College Code / ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. COL-GCE-05"
                    value={newCol.collegeId}
                    onChange={(e) => setNewCol({ ...newCol, collegeId: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>College Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Government College of Engineering, Tirunelveli"
                    value={newCol.collegeName}
                    onChange={(e) => setNewCol({ ...newCol, collegeName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>District *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tirunelveli"
                    value={newCol.district}
                    onChange={(e) => setNewCol({ ...newCol, district: e.target.value })}
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => setCreateCollegeModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit-decision">
                    Create College Record
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SELECTION PREVIEW MODAL (Phase 4.6) */}
        {selectionPreviewModalOpen && (
          <div className="modal-backdrop">
            <div className="modal-box" style={{ maxWidth: "800px" }}>
              <div className="modal-hd">
                <h3>🎯 Selection Preview &amp; Merit Quota Simulation</h3>
                <button className="modal-close" onClick={() => setSelectionPreviewModalOpen(false)}>✕</button>
              </div>
              <p style={{ fontSize: "12.5px", color: "#64748b", margin: "0 0 14px 0" }}>
                Simulation of configured approved criteria. Requires official human sign-off. Never uses OCR confidence as academic merit.
              </p>

              {selectionPreviewLoading ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#2563eb", fontWeight: 600 }}>
                  ⏳ Evaluating merit and means criteria for cohort candidates...
                </div>
              ) : (
                <div>
                  <div className="info-banner" style={{ marginBottom: "14px" }}>
                    <strong>Configured Criteria:</strong> {selectionPreviewData?.criteria?.selectionMethod} &bull; Max Income &le; {formatINR(selectionPreviewData?.criteria?.maxIncome)} &bull; Minimum Pass Marks &ge; {selectionPreviewData?.criteria?.minPassMarks || 50}% &bull; Rule: {selectionPreviewData?.criteria?.ruleVersion || "v2026.1"}
                  </div>

                  <div className="import-stat-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginBottom: "16px" }}>
                    <div className="stat-box box-blue">
                      <span>{selectionPreviewData?.previewResults?.totalEvaluated || 0}</span>
                      <label>Candidates Evaluated</label>
                    </div>
                    <div className="stat-box box-green">
                      <span>{selectionPreviewData?.previewResults?.selectedCandidates?.length || 0}</span>
                      <label>Draft Selected for Award</label>
                    </div>
                    <div className="stat-box box-amber">
                      <span>{selectionPreviewData?.previewResults?.quotaRemaining || 0}</span>
                      <label>Remaining Quota</label>
                    </div>
                  </div>

                  <div className="table-responsive-container" style={{ maxHeight: "250px", overflowY: "auto" }}>
                    <table className="data-table" style={{ fontSize: "12px" }}>
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Application ID</th>
                          <th>Student Name</th>
                          <th>Category</th>
                          <th>Income</th>
                          <th>Selection Rationale</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectionPreviewData?.previewResults?.selectedCandidates || []).map((c) => (
                          <tr key={c.applicationId}>
                            <td><strong>#{c.rank}</strong></td>
                            <td><code>{c.applicationId}</code></td>
                            <td>{c.studentName}</td>
                            <td><span className="cat-pill">{c.category}</span></td>
                            <td>{formatINR(c.familyIncome)}</td>
                            <td>{c.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="form-group" style={{ marginTop: "16px" }}>
                    <label>Statutory Committee Approval Justification &amp; Sanction Reference *</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="e.g. Approved by National Selection Committee pursuant to Statutory Quota Guidelines 2026..."
                      value={selectionApprovalComments}
                      onChange={(e) => setSelectionApprovalComments(e.target.value)}
                    />
                  </div>

                  <div className="modal-actions" style={{ marginTop: "14px" }}>
                    <button type="button" className="btn-cancel" onClick={() => setSelectionPreviewModalOpen(false)}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-action-primary"
                      onClick={handleApproveSelection}
                      disabled={selectionApproving}
                    >
                      {selectionApproving ? "Authorizing..." : "Authorize Official Human Approval →"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RULE IMPACT PREVIEW MODAL (Phase 4.7) */}
        {ruleImpactModalOpen && impactScheme && (
          <div className="modal-backdrop">
            <div className="modal-box" style={{ maxWidth: "720px" }}>
              <div className="modal-hd">
                <h3>🧪 Proposed Rule-Change Impact Analysis</h3>
                <button className="modal-close" onClick={() => setRuleImpactModalOpen(false)}>✕</button>
              </div>
              <p style={{ fontSize: "12.5px", color: "#64748b", margin: "0 0 14px 0" }}>
                Simulation of proposed eligibility criteria against active student cohort before publishing. Existing applications preserve attached rule version.
              </p>

              <form onSubmit={handleRecalculateRuleImpact} style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", marginBottom: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 700 }}>Proposed Max Annual Family Income (₹)</label>
                    <input
                      type="number"
                      value={proposedRuleChanges.maxIncome}
                      onChange={(e) => setProposedRuleChanges({ ...proposedRuleChanges, maxIncome: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 700 }}>Proposed Minimum Pass Marks (%)</label>
                    <input
                      type="number"
                      value={proposedRuleChanges.minPassMarks}
                      onChange={(e) => setProposedRuleChanges({ ...proposedRuleChanges, minPassMarks: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <button type="submit" className="btn-action-secondary" style={{ marginTop: "10px" }} disabled={ruleImpactLoading}>
                  {ruleImpactLoading ? "Recalculating..." : "🔄 Recalculate Cohort Impact"}
                </button>
              </form>

              {ruleImpactData && (
                <div>
                  <div className="import-stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
                    <div className="stat-box box-blue">
                      <span>{ruleImpactData.impactSummary?.testedDatasetSize || 0}</span>
                      <label>Dataset Size</label>
                    </div>
                    <div className="stat-box box-green">
                      <span>{ruleImpactData.impactSummary?.baselineEligibleCount || 0}</span>
                      <label>Current Eligible</label>
                    </div>
                    <div className="stat-box box-green">
                      <span>+{ruleImpactData.impactSummary?.newlyEligibleCount || 0}</span>
                      <label>Newly Eligible</label>
                    </div>
                    <div className="stat-box box-red">
                      <span>-{ruleImpactData.impactSummary?.disqualifiedCount || 0}</span>
                      <label>Disqualified</label>
                    </div>
                    <div className="stat-box box-amber">
                      <span>{ruleImpactData.impactSummary?.projectedEligibleCount || 0}</span>
                      <label>Projected Total</label>
                    </div>
                  </div>

                  <div style={{ marginTop: "14px", padding: "10px 14px", background: "#f0fdf4", borderRadius: "6px", fontSize: "12px", color: "#166534" }}>
                    🔒 <strong>Rule Version Preservation:</strong> Currently evaluated rule is preserved as <strong>{ruleImpactData.impactSummary?.activeRuleVersion}</strong>. Proposed changes will be versioned as <strong>{ruleImpactData.impactSummary?.proposedRuleVersion}</strong> upon publication.
                  </div>
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: "18px" }}>
                <button type="button" className="btn-cancel" onClick={() => setRuleImpactModalOpen(false)}>
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

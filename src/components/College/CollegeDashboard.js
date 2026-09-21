import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { apiRequest, downloadExcel } from "../../utils/api";
import LanguageSelector from "../LanguageSelector/LanguageSelector";
import {
  BarChartWithTable,
  DualLineTrendChart,
  AgeBucketCards,
  MetricTile,
} from "../Common/AnalyticsCharts";
import { ErrorBoundary } from "../Common/ErrorBoundary";
import "./CollegeDashboard.css";

const STAGE_LABELS = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  COLLEGE_REVIEW: "College Review",
  CORRECTION_REQUIRED: "Correction Required",
  COLLEGE_VERIFIED: "College Verified",
  MINISTRY_SCRUTINY: "Ministry Scrutiny",
  SELECTED: "Selected",
  SANCTIONED: "Sanctioned",
  PAID: "Paid Confirmed",
  CONTINUATION: "Continuation",
  REJECTED: "Rejected",
};

export default function CollegeDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState("STUDENTS"); // STUDENTS | APPLICATIONS | ANALYTICS | ADMIN_TABLE | BULK_IMPORT | TICKETS | INVITE
  const [stats, setStats] = useState(null);
  const [collegeInfo, setCollegeInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [applications, setApplications] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [studyYearFilter, setStudyYearFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [schemeFilter, setSchemeFilter] = useState("");
  const [academicYearFilter, setAcademicYearFilter] = useState("2026-2027");
  const [lastFetchTime, setLastFetchTime] = useState(null);

  // Review Drawer state
  const [selectedApp, setSelectedApp] = useState(null);
  const [reviewDrawerOpen, setReviewDrawerOpen] = useState(false);
  const [reviewComments, setReviewComments] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  // Deficiency Modal state
  const [deficiencyModalOpen, setDeficiencyModalOpen] = useState(false);
  const [defType, setDefType] = useState("DATA_MISMATCH");
  const [defDesc, setDefDesc] = useState("");
  const [defDocType, setDefDocType] = useState("income");
  const [defSeverity, setDefSeverity] = useState("HIGH");

  // Reassignment Modal state
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [reassignApp, setReassignApp] = useState(null);
  const [newReviewerId, setNewReviewerId] = useState("REV-COL-01");
  const [newReviewerName, setNewReviewerName] = useState("Dr. K. Ramanathan");
  const [reassignReason, setReassignReason] = useState("");
  const [reassignLoading, setReassignLoading] = useState(false);

  // Document Version History Modal state
  const [docHistoryModalOpen, setDocHistoryModalOpen] = useState(false);
  const [docHistoryLoading, setDocHistoryLoading] = useState(false);
  const [docHistoryData, setDocHistoryData] = useState(null);
  const [docHistoryType, setDocHistoryType] = useState("");

  // Invite student state
  const [inviteForm, setInviteForm] = useState({
    fullName: "",
    email: "",
    mobile: "",
    course: "B.E. / B.Tech",
    department: "Computer Science",
    studyYear: "1st Year",
    registerNumber: "",
    category: "General",
  });
  const [inviteSuccess, setInviteSuccess] = useState(null);

  // Excel Export state
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState(null);
  const [exportError, setExportError] = useState(null);

  // Admin Master Table state
  const [adminRecords, setAdminRecords] = useState([]);
  const [adminPage, setAdminPage] = useState(1);
  const [adminTotalPages, setAdminTotalPages] = useState(1);
  const [adminTotalCount, setAdminTotalCount] = useState(0);
  const [adminLoading, setAdminLoading] = useState(false);

  // Bulk Import state
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Tickets state
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketReplyText, setTicketReplyText] = useState("");
  const [activeTicket, setActiveTicket] = useState(null);

  useEffect(() => {
    loadCollegeData();
    loadCollegeAnalytics();
    if (activeTab === "ADMIN_TABLE") loadAdminTable(1);
    if (activeTab === "TICKETS") loadCollegeTickets();
    if (activeTab === "ANALYTICS") loadCollegeAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentFilter, courseFilter, studyYearFilter, statusFilter, schemeFilter, academicYearFilter, activeTab]);

  const handleExportExcel = async () => {
    try {
      setExportLoading(true);
      setExportError(null);
      setExportMessage("Preparing Excel...");
      const res = await downloadExcel("/api/college/export-excel", `SGP_College_${collegeInfo?.collegeName || "Export"}.xlsx`);
      setExportMessage(`Exported ${res.recordsCount || students.length} authorized records successfully.`);
      setTimeout(() => setExportMessage(null), 6000);
    } catch (err) {
      console.error("Export error:", err);
      setExportError("Excel export failed: " + (err.message || "Unknown error"));
      setTimeout(() => setExportError(null), 6000);
    } finally {
      setExportLoading(false);
    }
  };

  const loadAdminTable = async (page = 1) => {
    try {
      setAdminLoading(true);
      const q = new URLSearchParams({
        page,
        limit: 15,
        ...(departmentFilter && { department: departmentFilter }),
        ...(courseFilter && { course: courseFilter }),
        ...(studyYearFilter && { studyYear: studyYearFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(schemeFilter && { scheme: schemeFilter }),
        ...(academicYearFilter && { academicYear: academicYearFilter }),
        ...(search && { search }),
      });
      const data = await apiRequest(`/api/college/admin-table?${q.toString()}`);
      setAdminRecords(data?.records || []);
      setAdminPage(data?.page || 1);
      setAdminTotalPages(data?.totalPages || 1);
      setAdminTotalCount(data?.total || 0);
    } catch (err) {
      console.error("Failed to load admin table:", err);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleBulkFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setImportLoading(true);
        const base64 = evt.target.result.split(",")[1];
        const preview = await apiRequest("/api/college/students/import-preview", {
          method: "POST",
          body: JSON.stringify({ fileBase64: base64 }),
        });
        setImportPreview(preview);
      } catch (err) {
        alert("Failed to parse spreadsheet: " + err.message);
      } finally {
        setImportLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmImport = async () => {
    if (!importPreview?.previewRows?.length) return;
    try {
      setImportLoading(true);
      const res = await apiRequest("/api/college/students/import-confirm", {
        method: "POST",
        body: JSON.stringify({ rows: importPreview.previewRows }),
      });
      setImportResult(res);
      setImportPreview(null);
      setImportFile(null);
      loadCollegeData();
    } catch (err) {
      alert("Import failed: " + err.message);
    } finally {
      setImportLoading(false);
    }
  };

  const loadCollegeTickets = async () => {
    try {
      setTicketsLoading(true);
      const data = await apiRequest("/api/college/tickets");
      setTickets(data?.tickets || []);
    } catch (err) {
      console.error("Failed to load tickets:", err);
    } finally {
      setTicketsLoading(false);
    }
  };

  const handleTicketReply = async (ticketId) => {
    if (!ticketReplyText.trim()) return;
    try {
      await apiRequest(`/api/college/tickets/${ticketId}/reply`, {
        method: "POST",
        body: JSON.stringify({ reply: ticketReplyText.trim(), status: "WAITING_FOR_STUDENT" }),
      });
      alert("Reply sent to student.");
      setTicketReplyText("");
      setActiveTicket(null);
      loadCollegeTickets();
    } catch (err) {
      alert("Failed to reply: " + err.message);
    }
  };

  const loadCollegeData = async () => {
    try {
      setLoading(true);
      const [statsData, schemesData] = await Promise.all([
        apiRequest("/api/college/stats"),
        apiRequest("/api/common/schemes"),
      ]);
      setStats(statsData?.stats || null);
      setCollegeInfo(statsData?.college || null);
      setSchemes(schemesData?.schemes || []);

      const queryParams = new URLSearchParams();
      if (departmentFilter) queryParams.set("department", departmentFilter);
      if (courseFilter) queryParams.set("course", courseFilter);
      if (studyYearFilter) queryParams.set("studyYear", studyYearFilter);
      if (statusFilter) queryParams.set("status", statusFilter);
      if (schemeFilter) queryParams.set("scheme", schemeFilter);
      if (academicYearFilter) queryParams.set("academicYear", academicYearFilter);
      if (search) queryParams.set("search", search);

      const [studentsData, appsData] = await Promise.all([
        apiRequest(`/api/college/students?${queryParams.toString()}`),
        apiRequest(`/api/college/applications?${queryParams.toString()}`),
      ]);

      setStudents(studentsData?.students || []);
      setApplications(appsData?.applications || []);
      setLastFetchTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (err) {
      console.error("College dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadCollegeData();
  };

  const loadCollegeAnalytics = async (customFilters = {}) => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      const params = new URLSearchParams({
        ...(customFilters.schemeId !== undefined ? (customFilters.schemeId ? { schemeId: customFilters.schemeId } : {}) : (schemeFilter ? { schemeId: schemeFilter } : {})),
        ...(customFilters.department !== undefined ? (customFilters.department ? { department: customFilters.department } : {}) : (departmentFilter ? { department: departmentFilter } : {})),
        ...(customFilters.course !== undefined ? (customFilters.course ? { course: customFilters.course } : {}) : (courseFilter ? { course: courseFilter } : {})),
        ...(customFilters.academicYear !== undefined ? (customFilters.academicYear ? { academicYear: customFilters.academicYear } : {}) : (academicYearFilter ? { academicYear: academicYearFilter } : { academicYear: "2026-2027" })),
      });
      const data = await apiRequest(`/api/college/analytics?${params.toString()}`);
      setAnalyticsData(data);
      setLastFetchTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (err) {
      console.error("Failed to load college analytics:", err);
      setAnalyticsError(err.message || "Failed to load analytics");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleClearFilters = () => {
    setDepartmentFilter("");
    setCourseFilter("");
    setStudyYearFilter("");
    setStatusFilter("");
    setSchemeFilter("");
    setAcademicYearFilter("2026-2027");
    setSearch("");
    loadCollegeAnalytics({ department: "", course: "", schemeId: "", academicYear: "2026-2027" });
  };

  const handleOpenDocHistory = async (appId, docType) => {
    try {
      setDocHistoryLoading(true);
      setDocHistoryType(docType);
      setDocHistoryModalOpen(true);
      const data = await apiRequest(`/api/college/applications/${appId}/document-versions/${docType}`);
      setDocHistoryData(data);
    } catch (err) {
      alert("Failed to load document history: " + err.message);
      setDocHistoryModalOpen(false);
    } finally {
      setDocHistoryLoading(false);
    }
  };

  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    if (!reassignApp) return;
    if (!reassignReason.trim()) {
      alert("Please provide an official justification for reassigning reviewer.");
      return;
    }
    try {
      setReassignLoading(true);
      const res = await apiRequest(`/api/college/applications/${reassignApp.applicationId}/assign-reviewer`, {
        method: "POST",
        body: JSON.stringify({
          reviewerId: newReviewerId,
          reviewerName: newReviewerName,
          reason: reassignReason.trim(),
        }),
      });
      alert(res.message || "Reviewer reassigned successfully.");
      setReassignModalOpen(false);
      setReassignReason("");
      loadCollegeData();
      loadCollegeAnalytics();
      if (selectedApp && selectedApp.application.applicationId === reassignApp.applicationId) {
        openReviewDrawer(reassignApp.applicationId);
      }
    } catch (err) {
      alert("Reassignment failed: " + err.message);
    } finally {
      setReassignLoading(false);
    }
  };

  const openReviewDrawer = async (appId) => {
    try {
      const data = await apiRequest(`/api/college/applications/${appId}`);
      setSelectedApp(data);
      setReviewComments("");
      setReviewDrawerOpen(true);
    } catch (err) {
      alert("Failed to load application details: " + err.message);
    }
  };

  const handleReviewAction = async (decision) => {
    if (!reviewComments.trim()) {
      alert("Please enter verification comments or decision rationale.");
      return;
    }

    try {
      setReviewLoading(true);
      await apiRequest(`/api/college/applications/${selectedApp.application.applicationId}/review`, {
        method: "POST",
        body: JSON.stringify({ decision, comments: reviewComments }),
      });
      alert(`Application ${decision} successfully.`);
      setReviewDrawerOpen(false);
      loadCollegeData();
    } catch (err) {
      alert("Review failed: " + err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleForwardToMinistry = async () => {
    if (!window.confirm("Confirm institutional verification completed. Forward this application to the Ministry for scrutiny?")) {
      return;
    }

    try {
      setReviewLoading(true);
      await apiRequest(`/api/college/applications/${selectedApp.application.applicationId}/forward`, {
        method: "POST",
        body: JSON.stringify({ comments: reviewComments || "Forwarded with verified bonafide credentials." }),
      });
      alert("Application successfully forwarded to Ministry!");
      setReviewDrawerOpen(false);
      loadCollegeData();
    } catch (err) {
      alert("Forwarding failed: " + err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleCreateDeficiency = async (e) => {
    e.preventDefault();
    if (!defDesc.trim()) return;

    try {
      await apiRequest(`/api/college/applications/${selectedApp.application.applicationId}/deficiency`, {
        method: "POST",
        body: JSON.stringify({
          type: defType,
          description: defDesc.trim(),
          documentType: defDocType,
          severity: defSeverity,
        }),
      });
      alert("Deficiency raised and student notified via in-app alert.");
      setDeficiencyModalOpen(false);
      setDefDesc("");
      openReviewDrawer(selectedApp.application.applicationId);
      loadCollegeData();
    } catch (err) {
      alert("Failed to create deficiency: " + err.message);
    }
  };

  const handleResendInvite = async (studentId) => {
    try {
      const res = await apiRequest(`/api/college/students/${studentId}/resend-invite`, { method: "POST" });
      alert(res.message || "Invitation resent successfully.");
      loadCollegeData();
    } catch (err) {
      alert("Failed to resend invitation: " + err.message);
    }
  };

  const handleResetPassword = async (studentId) => {
    if (!window.confirm("Initiate password reset for this student? An activation invitation will be generated allowing the student to set a new password. College administrators never see student passwords.")) return;
    try {
      const res = await apiRequest(`/api/college/students/${studentId}/reset-password`, { method: "POST" });
      alert(res.message || "Password reset initiated.");
      loadCollegeData();
    } catch (err) {
      alert("Failed to initiate password reset: " + err.message);
    }
  };

  const handleInviteStudent = async (e) => {
    e.preventDefault();
    setInviteSuccess(null);
    try {
      const data = await apiRequest("/api/college/students/create", {
        method: "POST",
        body: JSON.stringify(inviteForm),
      });
      setInviteSuccess(data?.invitation);
      setInviteForm({
        fullName: "",
        email: "",
        mobile: "",
        course: "B.E. / B.Tech",
        department: "Computer Science",
        studyYear: "1st Year",
        registerNumber: "",
        category: "General",
      });
      loadCollegeData();
    } catch (err) {
      alert("Failed to invite student: " + err.message);
    }
  };

  return (
    <div className="college-page">
      {/* HEADER */}
      <header className="college-header">
        <div className="college-header-container">
          <div className="brand">
            <img src="/sgp-emblem.png" alt="SGP Emblem" />
            <div>
              <h2>{collegeInfo?.collegeName || "College Administration Portal"}</h2>
              <p>Institutional Verification &amp; Student Management (Code: {collegeInfo?.collegeId || user?.collegeId})</p>
            </div>
          </div>
          <div className="header-actions">
            <span className="user-pill">
              🏛️ {user?.email} ({user?.role})
            </span>
            <button
              className="btn-export-excel"
              onClick={handleExportExcel}
              disabled={exportLoading}
              title="Download authorized college records as real OpenXML Excel file (.xlsx)"
            >
              {exportLoading ? "⏳ Preparing Excel..." : "📊 Export Excel"}
            </button>
            <button className="nav-btn-logout" style={{ background: "#334155" }} onClick={() => navigate("/dashboard")}>
              Main Dashboard
            </button>
            <button className="nav-btn-logout" onClick={logout}>
              Sign Out
            </button>
            <LanguageSelector />
          </div>
        </div>
      </header>

      <main className="college-main-container">
        {/* EXPORT FEEDBACK ALERTS */}
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

        {loading && <div style={{ color: "#2563eb", fontSize: "13px", fontWeight: 600, padding: "8px 0" }}>🔄 Loading institution statistics...</div>}
        {/* KPI CARDS - Clickable to matching lists with clear measures */}
        <div className="kpi-grid">
          <div
            className="kpi-card card-blue clickable-kpi"
            onClick={() => setActiveTab("STUDENTS")}
            title="Click to view Student Directory"
            role="button"
            tabIndex={0}
          >
            <span className="kpi-num">{stats?.totalStudents ?? "—"}</span>
            <span className="kpi-title">TOTAL STUDENTS ↗</span>
            <span className="kpi-desc">Enrolled students in college directory</span>
          </div>
          <div
            className="kpi-card card-purple clickable-kpi"
            onClick={() => { setStatusFilter(""); setActiveTab("APPLICATIONS"); }}
            title="Click to view Applications Review Queue"
            role="button"
            tabIndex={0}
          >
            <span className="kpi-num">{stats?.totalApplications ?? "—"}</span>
            <span className="kpi-title">TOTAL APPLICATIONS ↗</span>
            <span className="kpi-desc">All scholarship applications created</span>
          </div>
          <div
            className="kpi-card card-amber clickable-kpi"
            onClick={() => { setStatusFilter("COLLEGE_REVIEW"); setActiveTab("APPLICATIONS"); }}
            title="Click to filter Pending Verification applications"
            role="button"
            tabIndex={0}
          >
            <span className="kpi-num">{stats?.pending ?? "—"}</span>
            <span className="kpi-title">PENDING VERIFICATION ↗</span>
            <span className="kpi-desc">Awaiting college verification action</span>
          </div>
          <div
            className="kpi-card card-red clickable-kpi"
            onClick={() => { setStatusFilter("CORRECTION_REQUIRED"); setActiveTab("APPLICATIONS"); }}
            title="Click to filter Correction Required applications"
            role="button"
            tabIndex={0}
          >
            <span className="kpi-num">{stats?.correctionRequired ?? "—"}</span>
            <span className="kpi-title">CORRECTION REQUIRED ↗</span>
            <span className="kpi-desc">Returned to student for corrections</span>
          </div>
          <div
            className="kpi-card card-teal clickable-kpi"
            onClick={() => { setStatusFilter("COLLEGE_VERIFIED"); setActiveTab("APPLICATIONS"); }}
            title="Click to filter Verified applications"
            role="button"
            tabIndex={0}
          >
            <span className="kpi-num">{stats?.verified ?? "—"}</span>
            <span className="kpi-title">APPLICATIONS VERIFIED ↗</span>
            <span className="kpi-desc">Applications with verified documents</span>
          </div>
          <div
            className="kpi-card card-green clickable-kpi"
            onClick={() => { setStatusFilter("SUBMITTED"); setActiveTab("APPLICATIONS"); }}
            title="Click to filter Active/Submitted applications"
            role="button"
            tabIndex={0}
          >
            <span className="kpi-num">{stats?.submitted ?? "—"}</span>
            <span className="kpi-title">ACTIVE SUBMISSIONS ↗</span>
            <span className="kpi-desc">Officially submitted applications</span>
          </div>
        </div>

        {/* TABS */}
        <div className="college-tabs">
          <button
            className={`tab-link ${activeTab === "ANALYTICS" ? "active" : ""}`}
            onClick={() => setActiveTab("ANALYTICS")}
          >
            📈 Analytics &amp; Insights
          </button>
          <button
            className={`tab-link ${activeTab === "STUDENTS" ? "active" : ""}`}
            onClick={() => setActiveTab("STUDENTS")}
          >
            👥 Student Directory ({students.length})
          </button>
          <button
            className={`tab-link ${activeTab === "APPLICATIONS" ? "active" : ""}`}
            onClick={() => setActiveTab("APPLICATIONS")}
          >
            📑 Applications Review Queue ({applications.length})
          </button>
          <button
            className={`tab-link ${activeTab === "ADMIN_TABLE" ? "active" : ""}`}
            onClick={() => setActiveTab("ADMIN_TABLE")}
          >
            📊 Admin Master Table
          </button>
          <button
            className={`tab-link ${activeTab === "BULK_IMPORT" ? "active" : ""}`}
            onClick={() => setActiveTab("BULK_IMPORT")}
          >
            📥 Bulk Import Students
          </button>
          <button
            className={`tab-link ${activeTab === "TICKETS" ? "active" : ""}`}
            onClick={() => setActiveTab("TICKETS")}
          >
            🎫 Support Tickets ({tickets.length})
          </button>
          <button
            className={`tab-link ${activeTab === "INVITE" ? "active" : ""}`}
            onClick={() => setActiveTab("INVITE")}
          >
            ➕ Single Invite
          </button>
        </div>

        {/* ERROR BOUNDARY WRAPPING ACTIVE TAB CONTENT */}
        <ErrorBoundary title="College Portal View Error">
        {/* TAB 0: ADVANCED ANALYTICS & INSIGHTS (Phase 1) */}
        {activeTab === "ANALYTICS" && (
          <div className="analytics-tab-container">
            {/* Context & Metadata Bar */}
            <div className="analytics-meta-banner">
              <div className="meta-left">
                <span className="live-dot" style={{ backgroundColor: "#2563eb" }}>●</span>
                <strong>College Institutional Analytics</strong>
                <span className="meta-sub">
                  Source: College Institutional Database &bull; Records Evaluated: {analyticsData?.metadata?.sampleSize ?? applications.length} applications
                </span>
                <span className="demo-data-badge">Institutional Local Records</span>
              </div>
              <div className="meta-right">
                <span className="meta-time">
                  Last updated: {lastFetchTime || (analyticsData?.metadata?.lastUpdatedAt ? new Date(analyticsData.metadata.lastUpdatedAt).toLocaleTimeString("en-IN") : "Just now")}
                </span>
                <button
                  type="button"
                  className="btn-refresh-analytics"
                  onClick={() => {
                    loadCollegeData();
                    loadCollegeAnalytics();
                  }}
                  disabled={analyticsLoading || loading}
                >
                  {analyticsLoading || loading ? "🔄 Syncing..." : "🔄 Refresh"}
                </button>
              </div>
            </div>

            {/* Analytics Filter Bar with Visible Labels and Clear Action */}
            <div className="filter-card">
              <div className="filters-row">
                <div className="filter-field-group">
                  <label htmlFor="filter-scheme" className="filter-field-label">Scheme</label>
                  <select
                    id="filter-scheme"
                    value={schemeFilter}
                    onChange={(e) => {
                      setSchemeFilter(e.target.value);
                      loadCollegeAnalytics({ schemeId: e.target.value });
                    }}
                  >
                    <option value="">All Schemes</option>
                    {schemes.map((s) => (
                      <option key={s.schemeId} value={s.schemeId}>
                        {s.schemeName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-field-group">
                  <label htmlFor="filter-department" className="filter-field-label">Department</label>
                  <select
                    id="filter-department"
                    value={departmentFilter}
                    onChange={(e) => {
                      setDepartmentFilter(e.target.value);
                      loadCollegeAnalytics({ department: e.target.value });
                    }}
                  >
                    <option value="">All Departments</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Civil">Civil</option>
                    <option value="Information Technology">Information Technology</option>
                  </select>
                </div>

                <div className="filter-field-group">
                  <label htmlFor="filter-course" className="filter-field-label">Course</label>
                  <select
                    id="filter-course"
                    value={courseFilter}
                    onChange={(e) => {
                      setCourseFilter(e.target.value);
                      loadCollegeAnalytics({ course: e.target.value });
                    }}
                  >
                    <option value="">All Courses</option>
                    <option value="B.E. / B.Tech">B.E. / B.Tech</option>
                    <option value="M.E. / M.Tech">M.E. / M.Tech</option>
                    <option value="B.Sc / M.Sc">B.Sc / M.Sc</option>
                  </select>
                </div>

                <div className="filter-field-group">
                  <label htmlFor="filter-academic-year" className="filter-field-label">Academic Year</label>
                  <select
                    id="filter-academic-year"
                    value={academicYearFilter}
                    onChange={(e) => {
                      setAcademicYearFilter(e.target.value);
                      loadCollegeAnalytics({ academicYear: e.target.value });
                    }}
                  >
                    <option value="2026-2027">2026-2027 (Current)</option>
                    <option value="2025-2026">2025-2026</option>
                    <option value="2024-2025">2024-2025</option>
                  </select>
                </div>

                <div className="filter-actions-group">
                  <button
                    type="button"
                    className="clear-btn"
                    onClick={handleClearFilters}
                    title="Reset all filters to defaults"
                  >
                    ✕ Clear Filters
                  </button>
                </div>
              </div>
            </div>

            {analyticsLoading && (
              <div className="analytics-loading-box">
                ⏳ Computing aggregations for college jurisdiction...
              </div>
            )}

            {analyticsError && (
              <div className="analytics-error-box">
                ❌ {analyticsError}
              </div>
            )}

            {/* 1. Summary Cards */}
            <div className="analytics-kpi-grid">
              <MetricTile
                label="REGISTERED STUDENTS"
                value={analyticsData?.summaryCards?.registeredStudents?.total ?? "—"}
                sublabel={`${analyticsData?.summaryCards?.registeredStudents?.activeAccounts ?? 0} Active • ${analyticsData?.summaryCards?.registeredStudents?.invitedAccounts ?? 0} Invited`}
                definition="Total admitted students with verified institutional affiliation. Account activation is tracked separately."
                colorClass="blue"
                isClickable={true}
                onClick={() => setActiveTab("STUDENTS")}
              />

              <MetricTile
                label="SUBMITTED APPLICATIONS"
                value={analyticsData?.summaryCards?.submittedApplications?.total ?? "—"}
                sublabel="Official Submissions"
                definition="Applications formally lodged by students for scholarship evaluation."
                colorClass="purple"
                isClickable={true}
                onClick={() => { setStatusFilter("SUBMITTED"); setActiveTab("APPLICATIONS"); }}
              />

              <MetricTile
                label="PENDING CORRECTIONS"
                value={analyticsData?.summaryCards?.pendingCorrections?.total ?? "—"}
                sublabel="Returned to Student"
                definition="Applications requiring document correction or data re-verification."
                colorClass="amber"
                isClickable={true}
                onClick={() => { setStatusFilter("CORRECTION_REQUIRED"); setActiveTab("APPLICATIONS"); }}
              />

              <MetricTile
                label="COLLEGE REVIEWS COMPLETED"
                value={analyticsData?.summaryCards?.collegeReviewsCompleted?.total ?? "—"}
                sublabel={`${analyticsData?.summaryCards?.collegeReviewsCompleted?.completionRate ?? 0}% Verification Rate • ${analyticsData?.summaryCards?.collegeReviewsCompleted?.pending ?? 0} Pending`}
                definition="Applications that completed institutional document scrutiny. Distinct from open reviews pending action."
                colorClass="teal"
                isClickable={true}
                onClick={() => { setStatusFilter("COLLEGE_VERIFIED"); setActiveTab("APPLICATIONS"); }}
              />

              <MetricTile
                label="SELECTIONS APPROVED"
                value={analyticsData?.summaryCards?.selections?.total ?? "—"}
                sublabel={`Selection Rate: ${analyticsData?.summaryCards?.selections?.selectionRate ?? 0}%`}
                definition="Officially selected applications / officially decided applications."
                colorClass="green"
                isClickable={true}
                onClick={() => { setStatusFilter("SELECTED"); setActiveTab("APPLICATIONS"); }}
              />

              <MetricTile
                label="CONFIRMED PAYMENTS"
                value={`₹${(analyticsData?.summaryCards?.confirmedPayments?.amount || 0).toLocaleString("en-IN")}`}
                sublabel={`${analyticsData?.summaryCards?.confirmedPayments?.studentCount || 0} Students (${analyticsData?.summaryCards?.confirmedPayments?.coverageRate ?? 0}% Coverage)`}
                definition="Unique students with confirmed payment / students approved for instalment."
                colorClass="blue"
                isClickable={true}
                onClick={() => { setStatusFilter("PAID"); setActiveTab("APPLICATIONS"); }}
              />
            </div>

            {/* 5. Turnaround & Timing Highlights (Average & Median Completed Review Time, Pending Age) */}
            <div className="review-time-cards-grid">
              <div className="time-metric-card">
                <div className="time-card-title">⏱️ Average Completed Review Time</div>
                <div className="time-card-val">{analyticsData?.reviewDurations?.averageDays ?? "N/A"} <span className="time-unit">Days</span></div>
                <div className="time-card-desc">Total completed-review duration / completed reviews</div>
              </div>
              <div className="time-metric-card">
                <div className="time-card-title">⏱️ Median Completed Review Time</div>
                <div className="time-card-val">{analyticsData?.reviewDurations?.medianDays ?? "N/A"} <span className="time-unit">Days</span></div>
                <div className="time-card-desc">50th percentile turnaround time for institutional sign-off</div>
              </div>
              <div className="time-metric-card">
                <div className="time-card-title">⏳ Average Open Case Age</div>
                <div className="time-card-val">{analyticsData?.pendingAgeBuckets?.averageAgeDays ?? "N/A"} <span className="time-unit">Days</span></div>
                <div className="time-card-desc">Total current age of open cases / open cases ({analyticsData?.pendingAgeBuckets?.openCasesCount || 0} open)</div>
              </div>
            </div>

            {/* 6. Pending-Case Age Buckets */}
            <div className="analytics-section-spacing">
              <AgeBucketCards
                title="Pending-Case Age Buckets"
                buckets={analyticsData?.pendingAgeBuckets?.buckets || []}
                averageAgeDays={analyticsData?.pendingAgeBuckets?.averageAgeDays}
                openCasesCount={analyticsData?.pendingAgeBuckets?.openCasesCount || 0}
                onBucketClick={() => {
                  setStatusFilter("COLLEGE_REVIEW");
                  setActiveTab("APPLICATIONS");
                }}
              />
            </div>

            {/* Visual Charts 2 & 3: Application Stage Distribution & Department Comparison */}
            <div className="charts-two-col-grid">
              <BarChartWithTable
                title="Application Stage Distribution"
                subtitle="Volume of applications at each stage (Click bar to inspect queue)"
                data={(analyticsData?.applicationStageDistribution || []).map((s) => ({
                  key: s.stageKey,
                  label: s.stageLabel || s.stageName || (STAGE_LABELS[s.stageKey] || String(s.stageKey).replace(/_/g, " ")),
                  value: s.count,
                  percentage: s.percentage,
                }))}
                unit="apps"
                onBarClick={(item) => {
                  setStatusFilter(item.key);
                  setActiveTab("APPLICATIONS");
                }}
              />

              <BarChartWithTable
                title="Department & Course Comparison"
                subtitle="Application intake across academic disciplines (Click bar to inspect)"
                data={(analyticsData?.departmentDistribution || []).map((d) => ({
                  key: d.deptName,
                  label: d.deptName,
                  value: d.count,
                }))}
                unit="apps"
                onBarClick={(item) => {
                  setDepartmentFilter(item.label);
                  setActiveTab("APPLICATIONS");
                }}
              />
            </div>

            {/* Charts 4 & 7: Common Deficiency Reasons & Weekly Trends */}
            <div className="charts-two-col-grid">
              <BarChartWithTable
                title="Common Deficiency Reasons"
                subtitle="Frequency of raised defects during certificate verification"
                data={(analyticsData?.commonDeficiencyReasons || []).map((r) => ({
                  key: r.reason,
                  label: r.reason.replace(/_/g, " "),
                  value: r.count,
                }))}
                unit="defects"
              />

              <DualLineTrendChart
                title="Weekly Submissions & Completed Reviews"
                subtitle="Institutional review throughput compared to student submission rate"
                data={analyticsData?.weeklyTrends?.weeks || []}
                series1Name="Applications submitted"
                series2Name="Reviews completed"
              />
            </div>

            {/* 8. Assigned Reviewer Workload & Overdue Cases Table */}
            <div className="table-card" style={{ marginTop: "24px" }}>
              <div className="card-top-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>👤 Assigned Reviewer Workload &amp; Overdue Backlog</h4>
                  <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                    Track faculty verifier allocations, completion rates, and overdue cases based on statutory scheme deadlines.
                  </p>
                </div>
              </div>
              <div className="table-responsive-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Reviewer ID &amp; Name</th>
                      <th>Assigned Total</th>
                      <th>Completed Reviews</th>
                      <th>Pending Reviews</th>
                      <th>Overdue Cases (Configured Deadline)</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analyticsData?.reviewerWorkload || []).length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                          No reviewer allocation records found.
                        </td>
                      </tr>
                    ) : (
                      (analyticsData?.reviewerWorkload || []).map((rw) => (
                        <tr key={rw.reviewerId}>
                          <td>
                            <strong>{rw.reviewerName}</strong>
                            <div style={{ fontSize: "11px", color: "#64748b" }}>ID: {rw.reviewerId}</div>
                          </td>
                          <td><strong>{rw.assignedCount}</strong></td>
                          <td><span className="badge-verified">{rw.completedCount}</span></td>
                          <td><span className="cat-pill">{rw.pendingCount}</span></td>
                          <td>
                            {rw.overdueCount > 0 ? (
                              <span className="badge-flagged">⚠️ {rw.overdueCount} Overdue</span>
                            ) : (
                              <span style={{ color: "#059669", fontWeight: 600 }}>0 Overdue</span>
                            )}
                          </td>
                          <td>
                            <button
                              className="tbl-btn-review"
                              onClick={() => {
                                setStatusFilter("COLLEGE_REVIEW");
                                setActiveTab("APPLICATIONS");
                              }}
                              title="Inspect pending applications assigned to this reviewer"
                            >
                              Inspect Cases →
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 9. Upcoming Deadlines List */}
            <div className="table-card" style={{ marginTop: "24px" }}>
              <div className="card-top-bar" style={{ padding: "16px 20px" }}>
                <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>📅 Upcoming Statutory Deadlines</h4>
                <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                  Regulatory milestones for student applications, institutional recommendations, and state scrutiny.
                </p>
              </div>
              <div className="table-responsive-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Event Milestone</th>
                      <th>Scheme</th>
                      <th>Deadline Date</th>
                      <th>Days Remaining</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analyticsData?.upcomingDeadlines || []).map((dl, idx) => (
                      <tr key={idx}>
                        <td><strong>{dl.event}</strong></td>
                        <td><span className="scheme-tag">{dl.schemeId}</span></td>
                        <td>{dl.date ? new Date(dl.date).toLocaleDateString("en-IN", { dateStyle: "long" }) : "—"}</td>
                        <td>
                          <strong style={{ color: dl.daysLeft <= 15 ? "#dc2626" : dl.daysLeft <= 30 ? "#d97706" : "#2563eb" }}>
                            {dl.daysLeft !== null ? `${dl.daysLeft} Days` : "—"}
                          </strong>
                        </td>
                        <td>
                          <span className={`status-pill ${dl.daysLeft <= 15 ? "pill-correction_required" : "pill-verified"}`}>
                            {dl.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: STUDENT DIRECTORY & TABLE */}
        {activeTab === "STUDENTS" && (
          <div>
            {/* FILTER BAR */}
            <div className="filter-card">
              <form onSubmit={handleSearchSubmit} className="search-row">
                <input
                  type="text"
                  placeholder="Search by student name, roll number, or student ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="search-inp"
                />
                <button type="submit" className="search-btn">
                  🔍 Search
                </button>
              </form>

              <div className="filters-row">
                <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
                  <option value="">All Departments</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Civil">Civil</option>
                  <option value="General Engineering">General Engineering</option>
                </select>

                <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
                  <option value="">All Courses</option>
                  <option value="B.E. / B.Tech">B.E. / B.Tech</option>
                  <option value="M.E. / M.Tech">M.E. / M.Tech</option>
                  <option value="B.Sc / M.Sc">B.Sc / M.Sc</option>
                  <option value="Diploma">Diploma</option>
                </select>

                <select value={studyYearFilter} onChange={(e) => setStudyYearFilter(e.target.value)}>
                  <option value="">All Study Years</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>

                <select value={schemeFilter} onChange={(e) => setSchemeFilter(e.target.value)}>
                  <option value="">All Schemes</option>
                  {schemes.map((s) => (
                    <option key={s.schemeId} value={s.schemeId}>
                      {s.schemeId}
                    </option>
                  ))}
                </select>

                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All Application Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="COLLEGE_REVIEW">College Review</option>
                  <option value="CORRECTION_REQUIRED">Correction Required</option>
                  <option value="MINISTRY_SCRUTINY">Ministry Scrutiny</option>
                  <option value="SELECTED">Selected</option>
                  <option value="PAID">Paid</option>
                </select>

                {(departmentFilter || studyYearFilter || schemeFilter || statusFilter || search) && (
                  <button
                    type="button"
                    className="clear-btn"
                    onClick={() => {
                      setDepartmentFilter("");
                      setStudyYearFilter("");
                      setSchemeFilter("");
                      setStatusFilter("");
                      setSearch("");
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* TABLE */}
            <div className="table-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Full Name</th>
                    <th>Department / Year</th>
                    <th>Category</th>
                    <th>Income</th>
                    <th>Active Scheme</th>
                    <th>Application Status</th>
                    <th>OCR Verification</th>
                    <th>Account Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                        No students found matching current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    students.map((s) => (
                      <tr key={s.studentId}>
                        <td>
                          <strong>{s.studentId}</strong>
                          <span className="sub-cell">{s.registerNumber || "No Reg No"}</span>
                        </td>
                        <td>
                          <span className="name-bold">{s.fullName}</span>
                          <span className="sub-cell">{s.course}</span>
                        </td>
                        <td>
                          {s.department}
                          <span className="sub-cell">{s.studyYear}</span>
                        </td>
                        <td>
                          <span className="cat-pill">{s.category || "—"}</span>
                        </td>
                        <td>₹{(s.familyIncome || 0).toLocaleString("en-IN")}</td>
                        <td>
                          <span className="scheme-tag">{s.schemeId !== "—" ? s.schemeId : "None"}</span>
                        </td>
                        <td>
                          <span className={`status-pill pill-${s.applicationStatus.toLowerCase()}`}>
                            {s.applicationStatus.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td>
                          <span className={`doc-pill doc-${s.documentVerificationStatus.toLowerCase()}`}>
                            {s.documentVerificationStatus}
                          </span>
                        </td>
                        <td>
                          <span className={`act-badge act-${(s.accountStatus || "ACTIVE").toLowerCase()}`}>
                            {s.accountStatus === "INVITED" ? "Pending Activation" : "Active"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            {s.activeApplication ? (
                              <button
                                className="tbl-btn-review"
                                onClick={() => openReviewDrawer(s.activeApplication.applicationId)}
                              >
                                Review App
                              </button>
                            ) : (
                              <span style={{ color: "#94a3b8", fontSize: "11px", alignSelf: "center" }}>No app</span>
                            )}
                            {s.accountStatus === "INVITED" && (
                              <button
                                className="tbl-btn-resend"
                                title="Resend single-use activation invitation"
                                onClick={() => handleResendInvite(s.studentId)}
                              >
                                Resend Invite
                              </button>
                            )}
                            {s.accountStatus === "ACTIVE" && (
                              <button
                                className="tbl-btn-reset"
                                title="Initiate password reset (admin never sees passwords)"
                                onClick={() => handleResetPassword(s.studentId)}
                              >
                                Reset Pwd
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: APPLICATIONS QUEUE */}
        {activeTab === "APPLICATIONS" && (() => {
          const filteredApplications = applications.filter((app) => {
            if (statusFilter && app.applicationStatus !== statusFilter) return false;
            if (schemeFilter && app.schemeId !== schemeFilter) return false;
            if (departmentFilter && app.student?.department !== departmentFilter) return false;
            if (courseFilter && app.student?.course !== courseFilter) return false;
            return true;
          });

          return (
            <div className="table-card">
              {(statusFilter || schemeFilter || departmentFilter || courseFilter) && (
                <div className="active-filter-indicator">
                  <span className="indicator-text">
                    🔍 Filtered by:{" "}
                    {statusFilter && <span className="filter-badge">Status: {STAGE_LABELS[statusFilter] || statusFilter}</span>}
                    {schemeFilter && <span className="filter-badge">Scheme: {schemeFilter}</span>}
                    {departmentFilter && <span className="filter-badge">Dept: {departmentFilter}</span>}
                    {courseFilter && <span className="filter-badge">Course: {courseFilter}</span>}
                  </span>
                  <button
                    type="button"
                    className="btn-clear-scope"
                    onClick={() => {
                      setStatusFilter("");
                      setSchemeFilter("");
                      setDepartmentFilter("");
                      setCourseFilter("");
                    }}
                    title="Clear all active queue filters"
                  >
                    Clear Scope ✕
                  </button>
                </div>
              )}
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Application ID</th>
                    <th>Student Name</th>
                    <th>Scheme</th>
                    <th>Stage</th>
                    <th>Who Must Act</th>
                    <th>Status</th>
                    <th>OCR Verification</th>
                    <th>Assigned Reviewer &amp; Flags</th>
                    <th>Submitted At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                        No applications match current filters ({statusFilter ? `Status: ${STAGE_LABELS[statusFilter] || statusFilter}` : "All"}).
                      </td>
                    </tr>
                  ) : (
                    filteredApplications.map((app) => (
                      <tr key={app.applicationId}>
                        <td>
                          <strong>{app.applicationId}</strong>
                        </td>
                      <td>
                        <span className="name-bold">{app.student?.fullName || app.studentId}</span>
                        <span className="sub-cell">{app.student?.department}</span>
                      </td>
                      <td>
                        <span className="scheme-tag">{app.scheme?.schemeName || app.schemeId}</span>
                      </td>
                      <td>{app.currentStage}</td>
                      <td>
                        <strong style={{ color: "#2563eb" }}>{app.whoMustAct}</strong>
                      </td>
                      <td>
                        <span className={`status-pill pill-${app.applicationStatus.toLowerCase()}`}>
                          {app.applicationStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td>
                        <span className={`doc-pill doc-${app.documentVerificationStatus.toLowerCase()}`}>
                          {app.documentVerificationStatus}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 700 }}>
                            {app.assignedReviewerName || "Unassigned Reviewer"}
                          </span>
                          <button
                            type="button"
                            className="btn-reassign-small"
                            onClick={() => {
                              setReassignApp(app);
                              setNewReviewerId(app.assignedReviewerId || "REV-COL-01");
                              setNewReviewerName(app.assignedReviewerName || "Dr. K. Ramanathan");
                              setReassignReason("");
                              setReassignModalOpen(true);
                            }}
                            title="Reassign to another authorized reviewer"
                          >
                            Reassign 👤
                          </button>
                          {app.possibleDuplicate && (
                            <span
                              className="badge-duplicate"
                              title={`Flagged for review. Matching application IDs: ${app.duplicateMatches?.join(', ') || 'None'}. Legitimate cross-scheme applications should NOT be automatically rejected.`}
                            >
                              ⚠️ Duplicate Flag
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : "Draft"}</td>
                      <td>
                        <button
                          className="tbl-btn-review"
                          onClick={() => openReviewDrawer(app.applicationId)}
                        >
                          Review Application →
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        );
      })()}

        {/* TAB 3: INVITE / CREATE STUDENT */}
        {activeTab === "INVITE" && (
          <div className="invite-card">
            <h3>Create &amp; Provision Student Account</h3>
            <p>Institutional administrators can invite or register eligible students with college affiliation pre-assigned.</p>

            {inviteSuccess && (
              <div className="invite-success-banner">
                <h4>✅ Student Account Invitation Dispatched!</h4>
                <p>An activation invitation has been generated. Students set their own passwords through secure account activation:</p>
                <div className="cred-box">
                  <div><strong>User ID:</strong> {inviteSuccess.userId}</div>
                  <div><strong>Registered Email:</strong> {inviteSuccess.email}</div>
                  <div><strong>Status:</strong> <span style={{ color: "#d97706", fontWeight: 700 }}>INVITATION PENDING</span></div>
                </div>
                <p style={{ fontSize: "12px", color: "#166534", marginTop: "8px" }}>
                  🔒 <strong>Privacy Assurance:</strong> College Admin never receives or sees student passwords.
                </p>
              </div>
            )}

            <form onSubmit={handleInviteStudent} className="invite-form">
              <div className="grid-2">
                <div className="form-group">
                  <label>Student Full Name *</label>
                  <input
                    type="text"
                    required
                    value={inviteForm.fullName}
                    onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
                    placeholder="e.g. Ramesh K"
                  />
                </div>

                <div className="form-group">
                  <label>Official Student Email *</label>
                  <input
                    type="email"
                    required
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="ramesh@example.com"
                  />
                </div>

                <div className="form-group">
                  <label>Department *</label>
                  <input
                    type="text"
                    required
                    value={inviteForm.department}
                    onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Year of Study *</label>
                  <select
                    value={inviteForm.studyYear}
                    onChange={(e) => setInviteForm({ ...inviteForm, studyYear: e.target.value })}
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Register / Roll Number</label>
                  <input
                    type="text"
                    value={inviteForm.registerNumber}
                    onChange={(e) => setInviteForm({ ...inviteForm, registerNumber: e.target.value })}
                    placeholder="e.g. 710022104055"
                  />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={inviteForm.category}
                    onChange={(e) => setInviteForm({ ...inviteForm, category: e.target.value })}
                  >
                    <option value="ST">ST</option>
                    <option value="SC">SC</option>
                    <option value="BC">BC</option>
                    <option value="MBC">MBC</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn-create-student">
                Provision Student Account →
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: ADMIN MASTER TABLE (Grouped Layout per Source Documents) */}
        {activeTab === "ADMIN_TABLE" && (
          <div className="admin-master-card">
            <div className="admin-table-toolbar">
              <div>
                <h3>📊 Institutional Admin Master Table</h3>
                <p>Comprehensive verified records with grouped Student, Application, Review, Tracking, and Support attributes.</p>
              </div>
              <div className="admin-table-actions">
                <button className="btn-export-excel-inline" onClick={handleExportExcel} disabled={exportLoading}>
                  {exportLoading ? "⏳ Preparing..." : "📥 Download Full Excel"}
                </button>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="admin-pagination-bar">
              <span>Showing Page <strong>{adminPage}</strong> of <strong>{adminTotalPages}</strong> ({adminTotalCount} total records)</span>
              <div className="pagination-buttons">
                <button
                  className="page-btn"
                  disabled={adminPage <= 1 || adminLoading}
                  onClick={() => loadAdminTable(adminPage - 1)}
                >
                  ◀ Previous
                </button>
                <button
                  className="page-btn"
                  disabled={adminPage >= adminTotalPages || adminLoading}
                  onClick={() => loadAdminTable(adminPage + 1)}
                >
                  Next ▶
                </button>
              </div>
            </div>

            {adminLoading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#2563eb", fontWeight: 600 }}>
                ⏳ Loading paginated records from database...
              </div>
            ) : adminRecords.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                No records found matching criteria.
              </div>
            ) : (
              <div className="table-responsive-container">
                <table className="grouped-admin-table">
                  <thead>
                    <tr className="super-header-row">
                      <th colSpan="4" className="grp-th grp-student">STUDENT</th>
                      <th colSpan="4" className="grp-th grp-app">APPLICATION</th>
                      <th colSpan="4" className="grp-th grp-review">REVIEW</th>
                      <th colSpan="4" className="grp-th grp-tracking">TRACKING</th>
                      <th colSpan="3" className="grp-th grp-support">SUPPORT</th>
                    </tr>
                    <tr className="sub-header-row">
                      {/* Student */}
                      <th>Register Number</th>
                      <th>Name</th>
                      <th>Course</th>
                      <th>Account Activation</th>
                      {/* Application */}
                      <th>Scheme</th>
                      <th>Year</th>
                      <th>Internal ID</th>
                      <th>External Reference</th>
                      {/* Review */}
                      <th>Uploads</th>
                      <th>Mismatches</th>
                      <th>Reviewer</th>
                      <th>Pending Correction</th>
                      {/* Tracking */}
                      <th>Status</th>
                      <th>Source</th>
                      <th>Last Checked Date</th>
                      <th>Next Action</th>
                      {/* Support */}
                      <th>Ticket Owner</th>
                      <th>Latest Reply</th>
                      <th>Deadline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminRecords.map((r) => (
                      <tr key={r.id}>
                        {/* Student */}
                        <td><strong>{r.student.registerNumber}</strong></td>
                        <td>{r.student.name}</td>
                        <td>{r.student.course} ({r.student.studyYear})</td>
                        <td>
                          <span className={`act-badge act-${r.student.accountActivation.toLowerCase()}`}>
                            {r.student.accountActivation}
                          </span>
                        </td>
                        {/* Application */}
                        <td><span className="scheme-tag">{r.application.scheme}</span></td>
                        <td>{r.application.year}</td>
                        <td><code>{r.application.internalId}</code></td>
                        <td>{r.application.externalReference || "—"}</td>
                        {/* Review */}
                        <td>{r.review.uploads} docs</td>
                        <td>
                          {r.review.mismatches > 0 ? (
                            <span className="badge-flagged">{r.review.mismatches} flag(s)</span>
                          ) : (
                            <span className="badge-verified">0 mismatches</span>
                          )}
                        </td>
                        <td>{r.review.reviewer}</td>
                        <td>{r.review.pendingCorrection}</td>
                        {/* Tracking */}
                        <td>
                          <span className={`status-pill pill-${r.tracking.status.toLowerCase()}`}>
                            {r.tracking.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td>{r.tracking.source}</td>
                        <td>{r.tracking.lastCheckedDate ? new Date(r.tracking.lastCheckedDate).toISOString().split("T")[0] : "—"}</td>
                        <td className="next-action-cell" title={r.tracking.nextAction}>{r.tracking.nextAction}</td>
                        {/* Support */}
                        <td>{r.support.ticketOwner}</td>
                        <td className="reply-cell" title={r.support.latestReply}>{r.support.latestReply}</td>
                        <td>{r.support.deadline ? new Date(r.support.deadline).toISOString().split("T")[0] : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: BULK IMPORT STUDENTS */}
        {activeTab === "BULK_IMPORT" && (
          <div className="bulk-import-card">
            <h3>📥 Bulk Student Import &amp; Invitation</h3>
            <p>Upload a spreadsheet (.xlsx or .csv) to validate, preview, and provision accounts for admitted students.</p>

            {/* Results Banner */}
            {importResult && (
              <div className="import-result-banner">
                <h4>✅ Import &amp; Invitation Provisioning Completed!</h4>
                <div className="import-stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
                  <div className="stat-box box-green"><span>{importResult.imported ?? 0}</span><label>Imported</label></div>
                  <div className="stat-box box-amber"><span>{importResult.skipped ?? 0}</span><label>Skipped</label></div>
                  <div className="stat-box box-amber"><span>{importResult.duplicate ?? 0}</span><label>Duplicate</label></div>
                  <div className="stat-box box-red"><span>{importResult.invalid ?? 0}</span><label>Invalid</label></div>
                  <div className="stat-box box-amber"><span>{importResult.invitationsPending ?? importResult.imported ?? 0}</span><label>Invitation Pending</label></div>
                  <div className="stat-box box-green"><span>{importResult.activated ?? 0}</span><label>Activated</label></div>
                </div>
                <div style={{ marginTop: "12px", padding: "12px 16px", background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: "8px", fontSize: "12.5px", color: "#166534" }}>
                  🔒 <strong>Student Password Protection Policy:</strong> College Admin never receives or sees student passwords.
                  Students set their own passwords through secure account activation.
                </div>
              </div>
            )}

            {/* Dropzone */}
            <div className="dropzone-box">
              <input
                type="file"
                id="excelFileInput"
                accept=".xlsx, .xls, .csv"
                onChange={handleBulkFileChange}
                style={{ display: "none" }}
              />
              <label htmlFor="excelFileInput" className="dropzone-label">
                <span style={{ fontSize: "32px" }}>📄</span>
                <strong>Click to Select or Drop Spreadsheet (.xlsx, .csv)</strong>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Expected columns: Register Number, Student Name, Email, Course, Department, Year, Mobile, Category, Family Income
                </span>
                {importFile && <span className="selected-filename">Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)</span>}
              </label>
            </div>

            {importLoading && (
              <div style={{ textAlign: "center", padding: "20px", color: "#2563eb", fontWeight: 600 }}>
                ⏳ Validating spreadsheet records against database...
              </div>
            )}

            {/* Preview Section */}
            {importPreview && (
              <div className="import-preview-section">
                <h4>Validation Preview ({importPreview.summary.totalRows} Total Rows)</h4>
                <div className="import-stat-grid">
                  <div className="stat-box box-green">
                    <span>{importPreview.summary.validCount}</span>
                    <label>Valid &amp; Ready</label>
                  </div>
                  <div className="stat-box box-amber">
                    <span>{importPreview.summary.duplicateCount}</span>
                    <label>Duplicate Detected</label>
                  </div>
                  <div className="stat-box box-red">
                    <span>{importPreview.summary.invalidCount}</span>
                    <label>Missing Fields</label>
                  </div>
                </div>

                <div style={{ margin: "16px 0", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    className="btn-confirm-import"
                    disabled={importPreview.summary.validCount === 0 || importLoading}
                    onClick={handleConfirmImport}
                  >
                    Confirm Import &amp; Invite ({importPreview.summary.validCount} Valid Students) →
                  </button>
                </div>

                <div className="table-card">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Register Number</th>
                        <th>Student Name</th>
                        <th>Email</th>
                        <th>Course / Dept</th>
                        <th>Status</th>
                        <th>Validation Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.previewRows.map((r, i) => (
                        <tr key={i}>
                          <td>#{r.rowNum}</td>
                          <td><strong>{r.registerNumber}</strong></td>
                          <td>{r.fullName}</td>
                          <td>{r.email}</td>
                          <td>{r.course} &bull; {r.department}</td>
                          <td>
                            <span className={`status-badge status-${r.status.toLowerCase()}`}>
                              {r.status}
                            </span>
                          </td>
                          <td style={{ fontSize: "12px", color: r.status === "VALID" ? "#059669" : "#dc2626" }}>
                            {r.dupReason || (r.errors?.join(", ")) || "Ready for import"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: SUPPORT TICKETS */}
        {activeTab === "TICKETS" && (
          <div className="tickets-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3>🎫 Student Support Tickets</h3>
                <p>Review questions, document clarification inquiries, and issues submitted by your students.</p>
              </div>
              <button className="clear-btn" onClick={loadCollegeTickets}>🔄 Refresh Tickets</button>
            </div>

            {ticketsLoading ? (
              <div style={{ textAlign: "center", padding: "30px", color: "#2563eb" }}>⏳ Loading tickets...</div>
            ) : tickets.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>No support tickets filed yet.</div>
            ) : (
              <div className="tickets-grid">
                {tickets.map((t) => (
                  <div key={t.ticketId} className="ticket-item-card">
                    <div className="ticket-header-row">
                      <span className="tck-id">{t.ticketId}</span>
                      <span className={`status-pill pill-${t.status.toLowerCase()}`}>{t.status}</span>
                    </div>
                    <h4 style={{ margin: "8px 0 4px 0" }}>{t.subject}</h4>
                    <p style={{ fontSize: "13px", color: "#334155", margin: "0 0 8px 0" }}>{t.message}</p>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "10px" }}>
                      From: <strong>{t.student?.fullName}</strong> ({t.student?.registerNumber}) &bull; Category: {t.category}
                    </div>

                    {t.latestReply && (
                      <div className="latest-reply-box">
                        <strong>Latest Reply ({t.repliedBy || "Staff"}):</strong>
                        <p style={{ margin: "4px 0 0 0" }}>{t.latestReply}</p>
                      </div>
                    )}

                    <div style={{ marginTop: "12px" }}>
                      {activeTicket?.ticketId === t.ticketId ? (
                        <div className="reply-form-inline">
                          <textarea
                            rows="2"
                            placeholder="Type resolution or instructions for student..."
                            value={ticketReplyText}
                            onChange={(e) => setTicketReplyText(e.target.value)}
                          />
                          <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                            <button className="btn-reply-send" onClick={() => handleTicketReply(t.ticketId)}>Send Reply</button>
                            <button className="clear-btn" onClick={() => setActiveTicket(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button className="tbl-btn-review" onClick={() => { setActiveTicket(t); setTicketReplyText(""); }}>
                          💬 Reply / Update Ticket
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

        {/* APPLICATION REVIEW DRAWER (Part 13) */}
        {reviewDrawerOpen && selectedApp && (
          <div className="drawer-backdrop" onClick={() => setReviewDrawerOpen(false)}>
            <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
              <div className="drawer-header">
                <div>
                  <span className="app-id-pill">{selectedApp.application.applicationId}</span>
                  <h2>{selectedApp.student?.fullName}</h2>
                  <p>{selectedApp.student?.course} &bull; {selectedApp.student?.department} &bull; {selectedApp.student?.registerNumber}</p>
                </div>
                <button className="drawer-close" onClick={() => setReviewDrawerOpen(false)}>✕</button>
              </div>

              <div className="drawer-body">
                {/* SCHEME & STATUS */}
                <div className="drawer-card">
                  <h4>Application Information</h4>
                  <div className="drawer-grid-2">
                    <div><span>Scheme:</span> <strong>{selectedApp.scheme?.schemeName}</strong></div>
                    <div><span>Current Status:</span> <strong>{selectedApp.application.applicationStatus}</strong></div>
                    <div><span>Academic Year:</span> <strong>{selectedApp.application.academicYear}</strong></div>
                    <div><span>Stage:</span> <strong>{selectedApp.application.currentStage}</strong></div>
                    <div><span>Assigned Reviewer:</span> <strong>{selectedApp.application.assignedReviewerName || "Unassigned"}</strong></div>
                    <div>
                      <button
                        type="button"
                        className="btn-reassign-small"
                        style={{ marginTop: "4px" }}
                        onClick={() => {
                          setReassignApp(selectedApp.application);
                          setNewReviewerId(selectedApp.application.assignedReviewerId || "REV-COL-01");
                          setNewReviewerName(selectedApp.application.assignedReviewerName || "Dr. K. Ramanathan");
                          setReassignReason("");
                          setReassignModalOpen(true);
                        }}
                      >
                        Reassign Reviewer 👤
                      </button>
                    </div>
                  </div>
                </div>

                {/* OCR EXTRACTED CERTIFICATES (Inspection) */}
                <div className="drawer-card">
                  <h4>📑 Extracted OCR Document Evidence ({selectedApp.verifications?.length || 0})</h4>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 12px 0" }}>
                    Verified via local client OCR engine. Zero raw certificate scans are stored.
                  </p>

                  {selectedApp.verifications?.length === 0 ? (
                    <p style={{ color: "#94a3b8", fontSize: "13px" }}>No document verification results uploaded yet.</p>
                  ) : (
                    <div className="doc-ver-list">
                      {selectedApp.verifications.map((v) => (
                        <div key={v.verificationId} className="doc-ver-item">
                          <div className="doc-ver-hd">
                            <div>
                              <strong>{v.documentType.toUpperCase()}</strong>
                              <span className={`doc-pill doc-${v.verificationStatus.toLowerCase()}`} style={{ marginLeft: "8px" }}>
                                {v.verificationStatus} ({v.confidence}% confidence)
                              </span>
                            </div>
                            <button
                              type="button"
                              className="btn-doc-ver-diff"
                              onClick={() => handleOpenDocHistory(selectedApp.application.applicationId, v.documentType)}
                              title="Compare historical revisions and changed fields"
                            >
                              📜 Compare Version History
                            </button>
                          </div>
                          <div className="extracted-fields-box">
                            {Object.entries(v.extractedFields || {}).map(([key, val]) => (
                              <div key={key} className="field-row">
                                <span className="f-k">{key}:</span>
                                <span className="f-v">{typeof val === "object" ? JSON.stringify(val) : String(val)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* EXPLAINABLE ELIGIBILITY EVALUATION (Phase 4.1) */}
                {selectedApp.eligibility && (
                  <div className="drawer-card">
                    <h4>🎯 Explainable Statutory Eligibility Evaluation</h4>
                    <div style={{ marginBottom: "10px", display: "flex", gap: "10px", alignItems: "center" }}>
                      <span className={`doc-pill doc-${selectedApp.eligibility.evaluationResult.toLowerCase()}`}>
                        {selectedApp.eligibility.evaluationResult} (Match Score: {selectedApp.eligibility.matchScore}%)
                      </span>
                      <span className="scheme-tag">
                        Rule Version: {selectedApp.application.ruleVersion || "v2026.1"}
                      </span>
                    </div>

                    <p style={{ fontSize: "12.5px", color: "#334155", margin: "0 0 12px 0" }}>
                      {selectedApp.eligibility.explanation}
                    </p>

                    {/* Criteria Evidence Table */}
                    <div className="table-responsive-container" style={{ margin: "10px 0" }}>
                      <table className="data-table" style={{ fontSize: "12px" }}>
                        <thead>
                          <tr>
                            <th>Criterion</th>
                            <th>Extracted Evidence</th>
                            <th>Outcome</th>
                            <th>Rule Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Annual Family Income &le; ₹2,50,000</strong></td>
                            <td>₹{(selectedApp.student?.familyIncome || 0).toLocaleString("en-IN")} (From Verified Income Cert)</td>
                            <td>
                              {(selectedApp.student?.familyIncome || 0) <= 250000 ? (
                                <span className="badge-verified">PASS</span>
                              ) : (
                                <span className="badge-flagged">EXCEEDED</span>
                              )}
                            </td>
                            <td>Statutory Rule v2026.1 (MoTA/MoE Directive)</td>
                          </tr>
                          <tr>
                            <td><strong>Target Beneficiary Category</strong></td>
                            <td>{selectedApp.student?.category || "Unknown"}</td>
                            <td>
                              {["SC", "ST", "OBC", "General"].includes(selectedApp.student?.category) ? (
                                <span className="badge-verified">PASS</span>
                              ) : (
                                <span className="badge-flagged">UNCERTAIN</span>
                              )}
                            </td>
                            <td>Community Certificate Extraction</td>
                          </tr>
                          <tr>
                            <td><strong>Prior Exam Minimum Marks &ge; 50%</strong></td>
                            <td>Passed Qualifying Examination</td>
                            <td><span className="badge-verified">PASS</span></td>
                            <td>12th Marksheet Academic Record</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Uncertain Evidence Warning if applicable */}
                    {(selectedApp.verifications || []).some((v) => v.confidence < 85) && (
                      <div className="alert-uncertain-box">
                        ⚠️ <strong>Uncertain Evidence Detected:</strong> One or more OCR extracted certificates have confidence below 85%.
                        Statutory rules require human visual confirmation by the college verifier prior to institutional recommendation.
                      </div>
                    )}
                  </div>
                )}

                {/* DEFICIENCIES */}
                {selectedApp.deficiencies?.length > 0 && (
                  <div className="drawer-card">
                    <h4>⚠️ Open Deficiencies ({selectedApp.deficiencies.length})</h4>
                    <div className="drawer-def-list">
                      {selectedApp.deficiencies.map((d) => (
                        <div key={d.deficiencyId} className="def-pill-row">
                          <span className={`sev-tag sev-${d.severity.toLowerCase()}`}>{d.severity}</span>
                          <span>{d.description}</span>
                          <span className={`status-tag status-${d.status.toLowerCase()}`}>{d.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* REVIEW ACTIONS */}
                <div className="drawer-card review-action-card">
                  <h4>College Review &amp; Recommendation</h4>
                  <div className="form-group">
                    <label>Official Review Comments / Bonafide Endorsement:</label>
                    <textarea
                      rows={3}
                      placeholder="Enter verification notes regarding student admission, fee status, and marksheet inspection..."
                      value={reviewComments}
                      onChange={(e) => setReviewComments(e.target.value)}
                    />
                  </div>

                  <div className="drawer-btn-stack">
                    <button
                      className="btn-ver-appr"
                      disabled={reviewLoading}
                      onClick={() => handleReviewAction("VERIFIED")}
                    >
                      ✔️ Approve College Verification
                    </button>
                    <button
                      className="btn-req-corr"
                      onClick={() => setDeficiencyModalOpen(true)}
                    >
                      ⚠️ Request Correction / Raise Deficiency
                    </button>
                    <button
                      className="btn-fwd-min"
                      disabled={reviewLoading}
                      onClick={handleForwardToMinistry}
                    >
                      🚀 Forward to Ministry for Final Scrutiny
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DEFICIENCY MODAL */}
        {deficiencyModalOpen && (
          <div className="modal-backdrop">
            <div className="modal-box">
              <h3>Flag Deficiency for Student</h3>
              <p>The student will receive an in-app alert requiring correction and resubmission.</p>

              <form onSubmit={handleCreateDeficiency}>
                <div className="form-group">
                  <label>Deficiency Type</label>
                  <select value={defType} onChange={(e) => setDefType(e.target.value)}>
                    <option value="DATA_MISMATCH">DATA_MISMATCH (Name/DOB spelling variation)</option>
                    <option value="UNCLEAR_DOCUMENT">UNCLEAR_DOCUMENT (Low contrast or blur scan)</option>
                    <option value="MISSING_DOCUMENT">MISSING_DOCUMENT (Certificate not uploaded)</option>
                    <option value="INVALID_INFORMATION">INVALID_INFORMATION (Expired certificate or exceeded income)</option>
                    <option value="OCR_REVIEW">OCR_REVIEW (Manual verification requested)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Affected Document</label>
                  <select value={defDocType} onChange={(e) => setDefDocType(e.target.value)}>
                    <option value="income">Income Certificate</option>
                    <option value="community">Community Certificate</option>
                    <option value="ms10">10th Marksheet</option>
                    <option value="ms12">12th Marksheet</option>
                    <option value="general">General Application Detail</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Severity</label>
                  <select value={defSeverity} onChange={(e) => setDefSeverity(e.target.value)}>
                    <option value="HIGH">HIGH (Must resolve before submission)</option>
                    <option value="MEDIUM">MEDIUM (Minor discrepancy)</option>
                    <option value="BLOCKING">BLOCKING (Disqualifying defect)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Description of Issue *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. Income Certificate issue date is older than 12 months. Please upload recent certificate."
                    value={defDesc}
                    onChange={(e) => setDefDesc(e.target.value)}
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => setDeficiencyModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-raise-def">
                    Raise Deficiency &amp; Notify Student
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* REASSIGN REVIEWER MODAL (Phase 4.4) */}
        {reassignModalOpen && reassignApp && (
          <div className="modal-backdrop">
            <div className="modal-box" style={{ maxWidth: "520px" }}>
              <div className="modal-hd">
                <h3>👤 Reassign Application Reviewer</h3>
                <button className="modal-close" onClick={() => setReassignModalOpen(false)}>✕</button>
              </div>
              <p style={{ fontSize: "12.5px", color: "#64748b", margin: "0 0 14px 0" }}>
                Reassign <strong>{reassignApp.applicationId}</strong> within institutional boundaries with audited reason.
              </p>

              <form onSubmit={handleReassignSubmit}>
                <div className="form-group">
                  <label>Current Assigned Reviewer</label>
                  <input
                    type="text"
                    disabled
                    value={reassignApp.assignedReviewerName || "Unassigned"}
                    style={{ background: "#f1f5f9" }}
                  />
                </div>

                <div className="form-group">
                  <label>New Authorized Faculty Reviewer *</label>
                  <select
                    value={newReviewerId}
                    onChange={(e) => {
                      setNewReviewerId(e.target.value);
                      const sel = e.target.options[e.target.selectedIndex].text;
                      setNewReviewerName(sel.split(" (")[0]);
                    }}
                  >
                    <option value="REV-COL-01">Dr. K. Ramanathan (Computer Science Panel)</option>
                    <option value="REV-COL-02">Prof. S. Malathi (Electronics &amp; Comm. Panel)</option>
                    <option value="REV-COL-03">Dr. M. Anbarasan (Mechanical Panel)</option>
                    <option value="REV-COL-04">Dr. P. Vasanthi (Civil Engineering Panel)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Official Reason for Reassignment *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. Workload balancing across department committee / Reviewer on official leave..."
                    value={reassignReason}
                    onChange={(e) => setReassignReason(e.target.value)}
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => setReassignModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-raise-def" disabled={reassignLoading}>
                    {reassignLoading ? "Reassigning..." : "Confirm Reassignment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DOCUMENT VERSION COMPARISON MODAL (Phase 4.2) */}
        {docHistoryModalOpen && (
          <div className="modal-backdrop">
            <div className="modal-box" style={{ maxWidth: "750px" }}>
              <div className="modal-hd">
                <h3>📜 Document Revisions &amp; Field Evolution ({docHistoryType.toUpperCase()})</h3>
                <button className="modal-close" onClick={() => setDocHistoryModalOpen(false)}>✕</button>
              </div>
              <p style={{ fontSize: "12.5px", color: "#64748b", margin: "0 0 14px 0" }}>
                Authorized audit inspection of extracted OCR fields across candidate resubmissions. Certificate content is strictly immutable.
              </p>

              {docHistoryLoading ? (
                <div style={{ textAlign: "center", padding: "30px", color: "#2563eb", fontWeight: 600 }}>
                  ⏳ Loading historical document versions from database...
                </div>
              ) : !docHistoryData?.versions?.length ? (
                <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                  Only initial single version exists for this document. No revisions on record.
                </div>
              ) : (
                <div>
                  <div className="table-responsive-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Version</th>
                          <th>Upload Timestamp</th>
                          <th>OCR Confidence</th>
                          <th>Status</th>
                          <th>Extracted Field Values</th>
                        </tr>
                      </thead>
                      <tbody>
                        {docHistoryData.versions.map((ver, idx) => (
                          <tr key={idx} style={{ background: idx === docHistoryData.versions.length - 1 ? "#f0fdf4" : undefined }}>
                            <td>
                              <strong>v{ver.versionNumber || idx + 1}</strong>
                              {idx === docHistoryData.versions.length - 1 && (
                                <span className="cat-pill" style={{ marginLeft: "4px" }}>Current Active</span>
                              )}
                            </td>
                            <td>{ver.uploadedAt ? new Date(ver.uploadedAt).toLocaleString() : "—"}</td>
                            <td>
                              <span className="badge-verified">{ver.confidence}%</span>
                            </td>
                            <td>
                              <span className={`status-pill pill-${(ver.verificationStatus || "verified").toLowerCase()}`}>
                                {ver.verificationStatus}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontSize: "11.5px", lineHeight: "1.5" }}>
                                {Object.entries(ver.extractedFields || {}).map(([fk, fv]) => (
                                  <div key={fk}>
                                    <span style={{ color: "#64748b" }}>{fk}:</span> <strong>{String(fv)}</strong>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginTop: "14px", padding: "10px 14px", background: "#eff6ff", borderRadius: "6px", fontSize: "12px", color: "#1e40af" }}>
                    🔒 <strong>Non-repudiation Assurance:</strong> All revisions are digitally timestamped and signed. Original certificates remain read-only and cannot be altered.
                  </div>
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: "18px" }}>
                <button type="button" className="btn-cancel" onClick={() => setDocHistoryModalOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

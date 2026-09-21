import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import CollegeDashboard from "./CollegeDashboard";
import * as apiModule from "../../utils/api";
import * as AuthContextModule from "../../context/AuthContext";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn(),
}));

jest.mock("../../context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../utils/api", () => ({
  apiRequest: jest.fn(),
  downloadExcel: jest.fn(),
}));

const mockCollegeStats = {
  stats: {
    totalStudents: 120,
    totalApplications: 45,
    pending: 4,
    correctionRequired: 3,
    verified: 15,
    submitted: 38,
  },
  college: {
    collegeId: "COL-001",
    collegeName: "Government College of Engineering",
  },
};

const mockSchemes = {
  schemes: [
    { schemeId: "POST_MATRIC_SC", schemeName: "Post Matric Scholarship for SC" },
    { schemeId: "PRAGATI_TECH", schemeName: "AICTE Pragati Scholarship for Girls" },
  ],
};

const mockStudents = {
  students: [
    {
      studentId: "STU-101",
      fullName: "Ananya Sharma",
      department: "Computer Science",
      course: "B.E. / B.Tech",
      studyYear: "2nd Year",
      category: "OBC",
      familyIncome: 180000,
      schemeId: "POST_MATRIC_SC",
      applicationStatus: "SUBMITTED",
      documentVerificationStatus: "VERIFIED",
      accountStatus: "ACTIVE",
    },
  ],
};

const mockApplications = {
  applications: [
    {
      applicationId: "APP-001",
      studentId: "STU-101",
      schemeId: "POST_MATRIC_SC",
      currentStage: "Institutional Verification",
      whoMustAct: "College Verifier",
      applicationStatus: "COLLEGE_REVIEW",
      documentVerificationStatus: "PENDING",
      assignedReviewerName: "Dr. K. Ramanathan",
      submittedAt: "2026-09-01T10:00:00Z",
      student: { fullName: "Ananya Sharma", department: "Computer Science", course: "B.E. / B.Tech" },
      scheme: { schemeName: "Post Matric Scholarship for SC" },
    },
    {
      applicationId: "APP-002",
      studentId: "STU-102",
      schemeId: "PRAGATI_TECH",
      currentStage: "State Scrutiny",
      whoMustAct: "Ministry Admin",
      applicationStatus: "MINISTRY_SCRUTINY",
      documentVerificationStatus: "VERIFIED",
      assignedReviewerName: "Dr. S. Meenakshi",
      submittedAt: "2026-08-20T10:00:00Z",
      student: { fullName: "Priya Balan", department: "Mechanical", course: "B.E. / B.Tech" },
      scheme: { schemeName: "AICTE Pragati Scholarship for Girls" },
    },
  ],
};

const mockAnalyticsData = {
  metadata: {
    lastUpdatedAt: "2026-09-20T12:00:00Z",
    dataSource: "College Institutional Database",
    sampleSize: 45,
    isDemoData: false,
  },
  summaryCards: {
    registeredStudents: { total: 120, activeAccounts: 110, invitedAccounts: 10 },
    submittedApplications: { total: 38 },
    pendingCorrections: { total: 3 },
    collegeReviewsCompleted: { total: 15, pending: 4, completionRate: 39 },
    selections: { total: 12, selectionRate: 32 },
    confirmedPayments: { amount: 648000, studentCount: 12, coverageRate: 32 },
  },
  applicationStageDistribution: [
    { stageKey: "DRAFT", stageLabel: "Draft", stageName: "Draft", count: 7, percentage: 16 },
    { stageKey: "SUBMITTED", stageLabel: "Submitted", stageName: "Submitted", count: 10, percentage: 22 },
    { stageKey: "COLLEGE_REVIEW", stageLabel: "College Review", stageName: "College Review", count: 4, percentage: 9 },
    { stageKey: "CORRECTION_REQUIRED", stageLabel: "Correction Required", stageName: "Correction Required", count: 3, percentage: 7 },
    { stageKey: "COLLEGE_VERIFIED", stageLabel: "College Verified", stageName: "College Verified", count: 15, percentage: 33 },
    { stageKey: "PAID", stageLabel: "Paid Confirmed", stageName: "Paid Confirmed", count: 0, percentage: 0 },
    { stageKey: "CUSTOM_EXTRA_STATUS", stageLabel: "Custom Extra Status", stageName: "Custom Extra Status", count: 1, percentage: 2 },
  ],
  departmentDistribution: [
    { deptName: "Computer Science", count: 25 },
    { deptName: "Mechanical", count: 0 },
  ],
  commonDeficiencyReasons: [
    { reason: "INCOME_CERT_EXPIRED", count: 2 },
    { reason: "COMMUNITY_CERT_BLURRED", count: 0 },
  ],
  reviewDurations: { averageDays: 3.2, medianDays: 2.5 },
  pendingAgeBuckets: { averageAgeDays: 4.1, openCasesCount: 7, buckets: [] },
  weeklyTrends: {
    weeks: [
      { week: "01 Sep – 07 Sep", weekLabel: "01 Sep – 07 Sep", submissions: 12, reviewsCompleted: 8, series1: 12, series2: 8 },
      { week: "08 Sep – 14 Sep", weekLabel: "08 Sep – 14 Sep", submissions: 5, reviewsCompleted: 9, series1: 5, series2: 9 },
    ],
  },
  reviewerWorkload: [
    { reviewerId: "REV-01", reviewerName: "Dr. K. Ramanathan", assignedCount: 12, completedCount: 8, pendingCount: 4, overdueCount: 0 },
  ],
  upcomingDeadlines: [],
};

describe("CollegeDashboard UI & Chart Usability Enhancements", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AuthContextModule.useAuth.mockReturnValue({
      user: { userId: "COL-ADMIN-01", role: "COLLEGE_ADMIN", collegeId: "COL-001" },
      logout: jest.fn(),
    });

    apiModule.apiRequest.mockImplementation((url) => {
      if (url.includes("/api/college/stats")) return Promise.resolve(mockCollegeStats);
      if (url.includes("/api/common/schemes")) return Promise.resolve(mockSchemes);
      if (url.includes("/api/college/students")) return Promise.resolve(mockStudents);
      if (url.includes("/api/college/applications")) return Promise.resolve(mockApplications);
      if (url.includes("/api/college/analytics")) return Promise.resolve(mockAnalyticsData);
      return Promise.resolve({});
    });
  });

  test("1. Renders top KPI cards with accurate titles and descriptions distinguishing documents verified from pending reviews", async () => {
    render(
      <BrowserRouter>
        <CollegeDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("TOTAL STUDENTS ↗")).toBeInTheDocument();
      expect(screen.getByText("APPLICATIONS VERIFIED ↗")).toBeInTheDocument();
      expect(screen.getByText("ACTIVE SUBMISSIONS ↗")).toBeInTheDocument();
    });

    expect(screen.getByText("Applications with verified documents")).toBeInTheDocument();
    expect(screen.getByText("Awaiting college verification action")).toBeInTheDocument();
  });

  test("2. Displays visible filter labels, academic year selector, and Clear Filters button", async () => {
    render(
      <BrowserRouter>
        <CollegeDashboard />
      </BrowserRouter>
    );

    // Switch to Analytics tab
    const analyticsTabBtn = screen.getByRole("button", { name: /Analytics & Insights/i });
    fireEvent.click(analyticsTabBtn);

    await waitFor(() => {
      expect(screen.getByLabelText("Scheme")).toBeInTheDocument();
      expect(screen.getByLabelText("Department")).toBeInTheDocument();
      expect(screen.getByLabelText("Course")).toBeInTheDocument();
      expect(screen.getByLabelText("Academic Year")).toBeInTheDocument();
      expect(screen.getByText("✕ Clear Filters")).toBeInTheDocument();
    });

    // Test clear filters button resets filters
    fireEvent.change(screen.getByLabelText("Department"), { target: { value: "Computer Science" } });
    expect(screen.getByLabelText("Department").value).toBe("Computer Science");

    fireEvent.click(screen.getByText("✕ Clear Filters"));
    expect(screen.getByLabelText("Department").value).toBe("");
  });

  test("3. Renders readable application-stage labels and outside values with 0 applications for zero count", async () => {
    render(
      <BrowserRouter>
        <CollegeDashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Analytics & Insights/i }));

    await waitFor(() => {
      // Stage labels must be visible beside bars
      expect(screen.getByText("Draft")).toBeInTheDocument();
      expect(screen.getByText("College Review")).toBeInTheDocument();
      expect(screen.getByText("Correction Required")).toBeInTheDocument();
      expect(screen.getByText("Custom Extra Status")).toBeInTheDocument();
    });

    // Zero count must display outside bar as "0 applications"
    const zeroAppLabels = screen.getAllByText("0 applications");
    expect(zeroAppLabels.length).toBeGreaterThan(0);
  });

  test("4. Renders weekly trend chart with proper series names and actual dates", async () => {
    render(
      <BrowserRouter>
        <CollegeDashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Analytics & Insights/i }));

    await waitFor(() => {
      expect(screen.getByText("Applications submitted")).toBeInTheDocument();
      expect(screen.getByText("Reviews completed")).toBeInTheDocument();
    });

    // Weekly date labels must be visible
    expect(screen.getByText("01 Sep")).toBeInTheDocument();
    expect(screen.getByText("08 Sep")).toBeInTheDocument();
  });

  test("5. Displays overdue cases with configured deadline header instead of hardcoded 7 days", async () => {
    render(
      <BrowserRouter>
        <CollegeDashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Analytics & Insights/i }));

    await waitFor(() => {
      expect(screen.getByText("Overdue Cases (Configured Deadline)")).toBeInTheDocument();
    });
  });

  test("6. Clicking a bar switches to Applications Queue and displays filtered records with active scope indicator", async () => {
    render(
      <BrowserRouter>
        <CollegeDashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Analytics & Insights/i }));

    await waitFor(() => {
      expect(screen.getByText("Application Stage Distribution")).toBeInTheDocument();
    });

    // Click on the College Review bar
    const collegeReviewRow = screen.getByRole("button", { name: /College Review: 4 apps/i });
    fireEvent.click(collegeReviewRow);

    await waitFor(() => {
      expect(screen.getByText(/Filtered by:/i)).toBeInTheDocument();
      expect(screen.getByText("APP-001")).toBeInTheDocument();
      expect(screen.queryByText("APP-002")).not.toBeInTheDocument(); // APP-002 is MINISTRY_SCRUTINY, so filtered out!
    });

    // Test clear scope button
    fireEvent.click(screen.getByText("Clear Scope ✕"));
    await waitFor(() => {
      expect(screen.getByText("APP-001")).toBeInTheDocument();
      expect(screen.getByText("APP-002")).toBeInTheDocument();
    });
  });
});

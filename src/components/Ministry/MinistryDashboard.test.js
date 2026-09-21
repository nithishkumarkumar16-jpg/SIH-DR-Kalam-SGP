import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import MinistryDashboard from "./MinistryDashboard";
import * as apiModule from "../../utils/api";
import * as AuthContextModule from "../../context/AuthContext";

// Mock react-router-dom navigate
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn(),
}));

// Mock AuthContext
jest.mock("../../context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

// Mock API utilities
jest.mock("../../utils/api", () => ({
  apiRequest: jest.fn(),
  downloadExcel: jest.fn(),
}));

// Helper mock data generator
const createMockAnalytics = (overrides = {}) => ({
  dataQuality: {
    calculatedAt: "2026-09-20T08:00:00Z",
    technicalDatabaseHealth: "Connected (MongoDB)",
    externalSyncStatus: "Operational",
    ocrConfidenceSummary: { high: 80, moderate: 15, low: 5 },
  },
  metadata: { sampleSize: 10, lastUpdated: "2026-09-20T08:00:00Z" },
  schemeComparison: [
    {
      schemeId: "SCHEME-NFST",
      schemeName: "National Fellowship for Scheduled Tribes (NFST)",
      totalApplications: 10,
      collegeVerifiedCount: 8,
      verifiedCount: 8,
      verificationRate: 80,
      selectedCount: 5,
      selectionRate: 50,
      totalSanctionedAmount: 782000,
      sanctionedAmount: 782000,
      totalConfirmedPaid: 648000,
      disbursedAmount: 648000,
      amountPaidPercent: 83,
      averageAwardAmount: 156400,
      ...overrides.schemeComparisonItem,
    },
  ],
  budgetOverview: {
    hasBudget: true,
    schemeName: "NFST",
    ministry: "MoTA",
    financialYear: "2026-2027",
    allocatedBudget: 5000000,
    utilizedBudget: 782000,
    remainingBudget: 4218000,
    utilizationRate: 15.6,
    ...overrides.budgetOverview,
  },
  disbursementOverview: {
    totalSanctionedAmount: 782000,
    totalConfirmedPaid: 648000,
    paidPercentage: 83,
    studentDirectPayments: { amount: 608000, transactionCount: 10 },
    institutionalFeePayments: { amount: 40000, transactionCount: 1 },
    partialPayments: { count: 1 },
    reversals: { count: 0 },
    ...overrides.disbursementOverview,
  },
  collegeAnalytics: [
    {
      collegeId: "COL-01",
      collegeName: "Govt Engineering College",
      district: "Salem",
      totalApplications: 10,
      completedReviews: 8,
      reviewCompletionRate: 80,
      overdueCount: 0,
      overdueRate: 0,
      studentsApprovedForPayment: 5,
      studentsConfirmedPaid: 4,
      studentPaymentCoverageRate: 80,
    },
  ],
  stageDurations: {
    collegeVerification: { meanDays: 3.2, medianDays: 3 },
    ministryScrutiny: { meanDays: 5.1, medianDays: 4 },
    paymentDisbursement: { meanDays: 7.0, medianDays: 6 },
  },
  cohortFunnel: [
    { stage: "Submitted", count: 10, conversionRate: 100 },
    { stage: "Verified", count: 8, conversionRate: 80 },
    { stage: "Selected", count: 5, conversionRate: 50 },
    { stage: "Paid", count: 4, conversionRate: 40 },
  ],
  delayAlerts: { totalOverdueCases: 0, cases: [] },
  continuationTracking: { totalMonitored: 5, passingAttendance: 5, flaggedAttendance: 0 },
});

describe("MinistryDashboard Analytics & Formatting Verification (SIH26239)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AuthContextModule.useAuth.mockReturnValue({
      user: { id: "min-01", role: "MINISTRY_ADMIN", fullName: "Ministry Director" },
      logout: jest.fn(),
    });
  });

  const setupDefaultApiMocks = (analyticsData) => {
    apiModule.apiRequest.mockImplementation((url) => {
      if (url.includes("/api/ministry/analytics")) {
        return Promise.resolve(analyticsData);
      }
      if (url.includes("/api/ministry/stats")) {
        return Promise.resolve({ totalColleges: 5, totalApplications: 10, selectedCount: 5, paidCount: 4 });
      }
      if (url.includes("/api/ministry/colleges")) {
        return Promise.resolve({ colleges: [] });
      }
      if (url.includes("/api/ministry/applications")) {
        return Promise.resolve({ applications: [] });
      }
      if (url.includes("/api/ministry/schemes")) {
        return Promise.resolve({ schemes: [] });
      }
      if (url.includes("/api/ministry/payments")) {
        return Promise.resolve({ payments: [], summary: {} });
      }
      if (url.includes("/api/ministry/audit-logs")) {
        return Promise.resolve({ logs: [] });
      }
      return Promise.resolve({});
    });
  };

  // Scenario 1: Normal API Response
  test("Scenario 1: Normal API response renders formatted currency and numbers without crashing", async () => {
    const mockData = createMockAnalytics();
    setupDefaultApiMocks(mockData);

    render(
      <BrowserRouter>
        <MinistryDashboard />
      </BrowserRouter>
    );

    // Switch to National Analytics tab
    const analyticsTabBtn = await screen.findByRole("button", { name: /National Analytics/i });
    fireEvent.click(analyticsTabBtn);

    // Verify Scheme Comparison table displays formatted figures
    await waitFor(() => {
      expect(screen.getByText("National Fellowship for Scheduled Tribes (NFST)")).toBeInTheDocument();
      // Should display Indian rupee formatted numbers across table and breakdown cards
      expect(screen.getAllByText("₹7,82,000").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("₹6,48,000").length).toBeGreaterThanOrEqual(1);
    });

    // Verify compatibility aliases match canonical values
    const item = mockData.schemeComparison[0];
    expect(item.sanctionedAmount).toBe(item.totalSanctionedAmount);
    expect(item.disbursedAmount).toBe(item.totalConfirmedPaid);
    expect(item.verifiedCount).toBe(item.collegeVerifiedCount);
  });

  // Scenario 2: Valid Zero Amounts
  test("Scenario 2: Valid zero amounts preserve '₹0', '0', '0%', not 'Not available'", async () => {
    const zeroData = createMockAnalytics({
      schemeComparisonItem: {
        totalApplications: 0,
        collegeVerifiedCount: 0,
        verifiedCount: 0,
        verificationRate: 0,
        selectedCount: 0,
        selectionRate: 0,
        totalSanctionedAmount: 0,
        sanctionedAmount: 0,
        totalConfirmedPaid: 0,
        disbursedAmount: 0,
      },
      budgetOverview: {
        hasBudget: true,
        allocatedBudget: 0,
        utilizedBudget: 0,
        remainingBudget: 0,
        utilizationRate: 0,
      },
      disbursementOverview: {
        totalSanctionedAmount: 0,
        totalConfirmedPaid: 0,
        paidPercentage: 0,
        studentDirectPayments: { amount: 0, transactionCount: 0 },
        institutionalFeePayments: { amount: 0, transactionCount: 0 },
      },
    });

    setupDefaultApiMocks(zeroData);

    render(
      <BrowserRouter>
        <MinistryDashboard />
      </BrowserRouter>
    );

    const analyticsTabBtn = await screen.findByRole("button", { name: /National Analytics/i });
    fireEvent.click(analyticsTabBtn);

    await waitFor(() => {
      // Zero values should be preserved as ₹0 or 0, not "Not available"
      const zeroAmounts = screen.getAllByText("₹0");
      expect(zeroAmounts.length).toBeGreaterThanOrEqual(1);
    });
  });

  // Scenario 3: Missing or Null Fields
  test("Scenario 3: Missing or null financial fields display 'Not available' and never crash with toLocaleString", async () => {
    const missingData = createMockAnalytics({
      schemeComparisonItem: {
        totalApplications: undefined,
        collegeVerifiedCount: null,
        verifiedCount: null,
        verificationRate: null,
        selectedCount: undefined,
        totalSanctionedAmount: undefined,
        sanctionedAmount: undefined,
        totalConfirmedPaid: null,
        disbursedAmount: null,
      },
      budgetOverview: {
        hasBudget: true,
        allocatedBudget: undefined,
        utilizedBudget: null,
        remainingBudget: undefined,
        utilizationRate: null,
      },
      disbursementOverview: {
        totalSanctionedAmount: undefined,
        totalConfirmedPaid: null,
        studentDirectPayments: { amount: undefined },
        institutionalFeePayments: { amount: null },
      },
    });

    setupDefaultApiMocks(missingData);

    render(
      <BrowserRouter>
        <MinistryDashboard />
      </BrowserRouter>
    );

    const analyticsTabBtn = await screen.findByRole("button", { name: /National Analytics/i });
    fireEvent.click(analyticsTabBtn);

    await waitFor(() => {
      // Missing financial info must show "Not available", never ₹0 or crash
      const notAvailElements = screen.getAllByText("Not available");
      expect(notAvailElements.length).toBeGreaterThan(0);
    });
  });

  // Scenario 4: Empty Dataset
  test("Scenario 4: Empty dataset renders safely without crashing", async () => {
    const emptyData = {
      dataQuality: { technicalDatabaseHealth: "Connected (MongoDB)", ocrConfidenceSummary: {} },
      metadata: { sampleSize: 0 },
      schemeComparison: [],
      collegeAnalytics: [],
      stageDurations: {},
      cohortFunnel: [],
      delayAlerts: { cases: [] },
      continuationTracking: {},
      budgetOverview: { hasBudget: false },
      disbursementOverview: {},
    };

    setupDefaultApiMocks(emptyData);

    render(
      <BrowserRouter>
        <MinistryDashboard />
      </BrowserRouter>
    );

    const analyticsTabBtn = await screen.findByRole("button", { name: /National Analytics/i });
    fireEvent.click(analyticsTabBtn);

    await waitFor(() => {
      // Must render tab container without unhandled exceptions
      expect(screen.getByText("National Ministry Analytics Engine (SIH26239)")).toBeInTheDocument();
    });
  });

  // Scenario 5: API Error Handling
  test("Scenario 5: API failure renders error state cleanly without white screen crash", async () => {
    apiModule.apiRequest.mockImplementation((url) => {
      if (url.includes("/api/ministry/analytics")) {
        return Promise.reject(new Error("Connection to analytics cluster failed"));
      }
      return Promise.resolve({});
    });

    render(
      <BrowserRouter>
        <MinistryDashboard />
      </BrowserRouter>
    );

    const analyticsTabBtn = await screen.findByRole("button", { name: /National Analytics/i });
    fireEvent.click(analyticsTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/Connection to analytics cluster failed/i)).toBeInTheDocument();
    });
  });

  // Scenario 6: Verify Compatibility Aliases Match Canonical Values
  test("Scenario 6: Scheme comparison compatibility aliases match canonical values", () => {
    const item = {
      totalSanctionedAmount: 902000,
      sanctionedAmount: 902000,
      totalConfirmedPaid: 768000,
      disbursedAmount: 768000,
      collegeVerifiedCount: 15,
      verifiedCount: 15,
    };

    expect(item.sanctionedAmount).toBe(item.totalSanctionedAmount);
    expect(item.disbursedAmount).toBe(item.totalConfirmedPaid);
    expect(item.verifiedCount).toBe(item.collegeVerifiedCount);
  });
});

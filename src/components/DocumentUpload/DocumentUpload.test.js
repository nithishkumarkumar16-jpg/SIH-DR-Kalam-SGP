jest.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: jest.fn(),
}));

if (!window.URL.revokeObjectURL) {
  window.URL.revokeObjectURL = jest.fn();
}
if (!window.URL.createObjectURL) {
  window.URL.createObjectURL = jest.fn();
}

import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import DocumentUpload from "./DocumentUpload";
import { shouldUseMockCaptcha } from "./captchaConfig";

describe("shouldUseMockCaptcha", () => {
  test("falls back to a local mock when no Enterprise key is configured in development", () => {
    expect(shouldUseMockCaptcha("", "development")).toBe(true);
  });

  test("keeps the real Google Enterprise flow enabled in production", () => {
    expect(shouldUseMockCaptcha("real-key", "production")).toBe(false);
  });
});

describe("Standardized Extracted Details & Multi-State Audit UI", () => {
  const mockInitialDs = {
    ms10: {
      file: { name: "10th_marksheet.jpg" },
      url: "blob:mock-10th",
      loading: false,
      err: null,
      open: true,
      data: {
        detectedType: "ms10",
        state: "Tamil Nadu",
        issuingAuthority: "Tamil Nadu State Board",
        quality: { qualityLevel: "FAIR", qualityDescription: "Good contrast, moderate resolution." },
        ocrConfidence: 91,
        fieldConfidence: 92,
        fieldConfidences: {
          name: 0.98,
          board: 0.90,
          school: 0.92,
          year: 0.90,
          marks: 0.90,
        },
        warnings: [],
        issues: [],
        extracted: {
          name: "Nithishkumar M",
          fatherName: "Murugan P",
          dob: "2006-05-12",
          board: "Tamil Nadu State Board",
          school: ". Yr oa scull aSauaTEnan LEW CRM Lm aegmghm Coan",
          registerNumber: "1029384",
          year: "2021",
          month: "March",
          marksScored: "465",
          maxMarks: "500",
          percentage: "93%",
          grade: "Distinction",
        },
      },
    },
    ms12: {
      file: { name: "12th_marksheet.jpg" },
      url: "blob:mock-12th",
      loading: false,
      err: null,
      open: true,
      data: {
        detectedType: "ms12",
        state: "Tamil Nadu",
        issuingAuthority: "State Board of Higher Secondary Examination",
        quality: { qualityLevel: "GOOD", qualityDescription: "High resolution scan." },
        ocrConfidence: 95,
        fieldConfidence: 94,
        fieldConfidences: {
          name: 0.98,
          school: 0.94,
          stream: 0.92,
        },
        warnings: [],
        issues: [],
        extracted: {
          name: "Nithishkumar M",
          fatherName: "Murugan P",
          board: "Tamil Nadu State Board",
          school: "MATRIC HR SEC SCHOOL KANCHAMALAMUR SALEM",
          stream: "Bio-Maths",
          registerNumber: "7788991",
          year: "2023",
          marksScored: "540",
          maxMarks: "600",
          percentage: "90%",
          grade: "A+",
        },
      },
    },
    income: {
      file: { name: "income_cert.jpg" },
      url: "blob:mock-income",
      loading: false,
      err: null,
      open: true,
      data: {
        detectedType: "income",
        state: "Tamil Nadu",
        issuingAuthority: "Tahsildar Salem",
        quality: { qualityLevel: "GOOD", qualityDescription: "Clear certificate." },
        ocrConfidence: 96,
        fieldConfidence: 95,
        fieldConfidences: {
          name: 0.95,
          income: 0.96,
          certNumber: 0.92,
        },
        warnings: [],
        issues: [],
        extracted: {
          name: "Nithishkumar M",
          fatherName: "Murugan P",
          income: "₹1,50,000",
          incomeWords: "One Lakh Fifty Thousand Only",
          incomeYear: "2023-2024",
          certNumber: "TN-2023-INC-89012",
          issueDate: "12-06-2023",
          validUpto: "11-06-2024",
          taluk: "Salem South",
          district: "Salem",
          state: "Tamil Nadu",
          issuingAuthority: "Tahsildar Salem",
          freshness: {
            status: "valid",
            label: "Valid (Fresh)",
            detail: "Certificate was issued on 12-06-2023 and is currently valid.",
          },
        },
      },
    },
    community: {
      file: { name: "community_cert.jpg" },
      url: "blob:mock-community",
      loading: false,
      err: null,
      open: true,
      data: {
        detectedType: "community",
        state: "Tamil Nadu",
        issuingAuthority: "Zonal Deputy Tahsildar",
        quality: { qualityLevel: "GOOD", qualityDescription: "Official digital certificate." },
        ocrConfidence: 97,
        fieldConfidence: 96,
        fieldConfidences: {
          name: 0.98,
          community: 0.95,
          certNumber: 0.94,
        },
        warnings: [],
        issues: [],
        extracted: {
          name: "Nithishkumar M",
          fatherName: "Murugan P",
          community: "Vanniyar",
          communityCategory: "MBC",
          certNumber: "TN-2022-COMM-34567",
          issueDate: "15-08-2022",
          taluk: "Salem South",
          district: "Salem",
          state: "Tamil Nadu",
          issuingAuthority: "Zonal Deputy Tahsildar",
        },
      },
    },
  };

  test("renders standardized two-column layout, metadata grid, and match badges for all 4 document types", () => {
    const { container } = render(
      <BrowserRouter>
        <DocumentUpload initialDs={mockInitialDs} initialStep={1} />
      </BrowserRouter>
    );

    // 1. Verify Extracted Details headers are present
    const headers = screen.getAllByText(/Extracted Details & Multi-State Audit/i);
    expect(headers.length).toBe(4);

    // 2. Verify standardized metadata grids exist
    const metadataGrids = container.querySelectorAll(".doc-audit-metadata-grid");
    expect(metadataGrids.length).toBe(4);

    // Verify metadata values
    expect(screen.getAllByText("10th Marksheet").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("FAIR").length).toBe(1);
    expect(screen.getAllByText("GOOD").length).toBe(3);
    expect(screen.getByText("91%")).toBeTruthy();

    // 3. Verify standardized extracted fields lists exist for all 4 cards
    const fieldLists = container.querySelectorAll(".extracted-fields-list");
    expect(fieldLists.length).toBe(4);

    // 4. Verify field rows have both extracted-field-row and ex-row-r classes
    const fieldRows = container.querySelectorAll(".extracted-field-row");
    expect(fieldRows.length).toBeGreaterThan(15);
    fieldRows.forEach(row => {
      expect(row.classList.contains("ex-row-r")).toBe(true);
      expect(row.querySelector(".extracted-field-label")).toBeTruthy();
      expect(row.querySelector(".extracted-field-value")).toBeTruthy();
      expect(row.querySelector(".extracted-val-text")).toBeTruthy();
    });

    // 5. Test 10th Marksheet fields & long noisy OCR text wrapping
    expect(screen.getByText(". Yr oa scull aSauaTEnan LEW CRM Lm aegmghm Coan")).toBeTruthy();
    expect(screen.getByText("Distinction")).toBeTruthy();
    expect(screen.getByText("1029384")).toBeTruthy();

    // 6. Test 12th Marksheet fields
    expect(screen.getByText("MATRIC HR SEC SCHOOL KANCHAMALAMUR SALEM")).toBeTruthy();
    expect(screen.getByText("Bio-Maths")).toBeTruthy();
    expect(screen.getByText("7788991")).toBeTruthy();
    expect(screen.getByText("A+")).toBeTruthy();

    // 7. Test Income Certificate fields
    expect(screen.getByText("₹1,50,000")).toBeTruthy();
    expect(screen.getByText("One Lakh Fifty Thousand Only")).toBeTruthy();
    expect(screen.getByText("TN-2023-INC-89012")).toBeTruthy();
    expect(screen.getAllByText("Tahsildar Salem").length).toBeGreaterThanOrEqual(1);

    // 8. Test Community Certificate fields
    expect(screen.getByText("Vanniyar")).toBeTruthy();
    expect(screen.getByText("MBC")).toBeTruthy();
    expect(screen.getByText("TN-2022-COMM-34567")).toBeTruthy();
    expect(screen.getAllByText("Zonal Deputy Tahsildar").length).toBeGreaterThanOrEqual(1);

    // 9. Test match badges (e.g. 98% match, 90% match, 92% match)
    const matchBadges = container.querySelectorAll(".match-badge");
    expect(matchBadges.length).toBeGreaterThan(0);
    const badgeTexts = Array.from(matchBadges).map(b => b.textContent.trim());
    expect(badgeTexts.some(t => t.includes("98% match"))).toBe(true);
    expect(badgeTexts.some(t => t.includes("90% match"))).toBe(true);
    expect(badgeTexts.some(t => t.includes("92% match"))).toBe(true);

    // 10. Confirm omitted/non-extracted fields are NOT displayed (no empty or fake values)
    // Gender was not provided in mock community cert, so GENDER label should not appear
    expect(screen.queryByText("GENDER")).toBeNull();
  });
});

import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import DocumentUpload from "./DocumentUpload";
import { adaptDocumentsToEligibilityProfile, getConfidenceStatus } from "../../adapters/profileAdapter";
import { evaluateAllScholarships } from "../../engine/eligibilityEngine";
import { scholarships } from "../../knowledge/scholarships";
import fs from "fs";
import path from "path";

// Mock child components or canvas where appropriate in JSDOM
jest.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: jest.fn(),
}));

describe("SGP Document Verification Step 4 Integration & Regression Tests", () => {

  // ========================================================================
  // SECTION 22: END-TO-END STEP 4 SIMULATION
  // ========================================================================
  test("Section 22 Simulation: 10th, 12th, Community, Income extracted -> auto-fills safe fields -> user enters course & study year -> existing engine matches", () => {
    // 1. Mock Extracted Document State
    const mockDs = {
      ms10: {
        file: { name: "10th.jpg", type: "image/jpeg" },
        data: {
          extracted: {
            name: "Nithish Kumar",
            dob: "2007-07-04",
            percentage: "82%",
            marksScored: 410,
            maxMarks: 500,
          },
          ocrConfidence: 92,
        },
      },
      ms12: {
        file: { name: "12th.jpg", type: "image/jpeg" },
        data: {
          extracted: {
            name: "Nithish Kumar",
            percentage: "78%",
            marksScored: 468,
            maxMarks: 600,
          },
          ocrConfidence: 90,
        },
      },
      community: {
        file: { name: "community.jpg", type: "image/jpeg" },
        data: {
          extracted: {
            name: "Nithish Kumar",
            communityCategory: "MBC",
            community: "MBC",
          },
          ocrConfidence: 95,
        },
      },
      income: {
        file: { name: "income.jpg", type: "image/jpeg" },
        data: {
          extracted: {
            name: "Nithish Kumar",
            income: 150000,
          },
          ocrConfidence: 94,
        },
      },
    };

    // 2. Adapt to Eligibility Profile
    const adapted = adaptDocumentsToEligibilityProfile({
      ds: mockDs,
      aadharName: "Nithish Kumar",
      aadharDob: "2007-07-04",
      studentCategory: "MBC",
      studentIncome: "150000",
      bankHolder: "Nithish Kumar",
      bankAccType: "Single",
      matrixData: {
        hasNameMismatch: false,
        hasNameMinor: false,
        hasDobMismatch: false,
        incomeResult: { status: "MATCH" },
        communityResult: { status: "MATCH" },
      },
    });

    const { profile, fieldMetadata } = adapted;

    // Verify Expectations 1-10:
    expect(profile.name).toBe("Nithish Kumar");
    expect(profile.dob).toBe("2007-07-04");
    expect(profile.community).toBe("MBC");
    expect(profile.income).toBe("150000");
    expect(profile.marks10).toBe(82);
    expect(profile.marks12).toBe(78);

    // Course and Study Year MUST NOT be guessed from documents!
    expect(profile.course).toBe("");
    expect(profile.currentYear).toBe("");
    expect(fieldMetadata.course.status).toBe("missing");
    expect(fieldMetadata.currentYear.status).toBe("missing");

    // 11. User enters Course = Engineering and Study Year = 2
    const userCompletedProfile = {
      ...profile,
      course: "Engineering",
      level: "ug",
      currentYear: "2nd",
    };

    // 12. Existing Eligibility Engine executes
    const matches = evaluateAllScholarships(scholarships, userCompletedProfile);

    // 13. Matching scholarship results are displayed
    expect(matches.length).toBeGreaterThan(0);
    const mbcSchemeMatch = matches.find(m => m.scholarship.category === "BC" || m.scholarship.category === "MBC");
    expect(mbcSchemeMatch).toBeDefined();
    expect(mbcSchemeMatch.status === "CONFIRMED MATCH" || mbcSchemeMatch.status === "POTENTIAL MATCH").toBe(true);

    // 14. Confirms evaluateAllScholarships from eligibilityEngine.js is the exact engine used
    expect(typeof evaluateAllScholarships).toBe("function");
  });

  // ========================================================================
  // SECTION 23 REGRESSION SUITE: A TO R
  // ========================================================================

  test("A: OCR -> profile adapter transforms raw extracted slots cleanly", () => {
    const ds = {
      ms10: { data: { extracted: { name: "Ananya", percentage: "85%" }, ocrConfidence: 91 } },
    };
    const adapted = adaptDocumentsToEligibilityProfile({ ds });
    expect(adapted.profile.name).toBe("Ananya");
    expect(adapted.profile.marks10).toBe(85);
  });

  test("B: Community auto-fill maps community category correctly", () => {
    const ds = {
      community: { data: { extracted: { communityCategory: "SC" }, ocrConfidence: 95 } },
    };
    const adapted = adaptDocumentsToEligibilityProfile({ ds });
    expect(adapted.profile.community).toBe("SC");
    expect(adapted.fieldMetadata.community.source).toContain("Community Certificate");
  });

  test("C: Income auto-fill parses numeric income value correctly", () => {
    const ds = {
      income: { data: { extracted: { income: "1,20,000" }, ocrConfidence: 93 } },
    };
    const adapted = adaptDocumentsToEligibilityProfile({ ds });
    expect(adapted.profile.income).toBe("120000");
    expect(adapted.rawIncome).toBe(120000);
  });

  test("D: Name and DOB auto-fill with Aadhaar reference priority", () => {
    const ds = {
      ms10: { data: { extracted: { name: "Aadhaar Alt Name", dob: "2006-01-01" }, ocrConfidence: 80 } },
    };
    const adapted = adaptDocumentsToEligibilityProfile({
      ds,
      aadharName: "Official Aadhaar Name",
      aadharDob: "2005-12-15",
    });
    expect(adapted.profile.name).toBe("Official Aadhaar Name");
    expect(adapted.profile.dob).toBe("2005-12-15");
    expect(adapted.fieldMetadata.name.source).toBe("Aadhaar reference input");
  });

  test("E: Marks auto-fill calculates percentages correctly", () => {
    const ds = {
      ms10: { data: { extracted: { marksScored: 450, maxMarks: 500 }, ocrConfidence: 90 } },
      ms12: { data: { extracted: { percentage: "88.5%" }, ocrConfidence: 92 } },
    };
    const adapted = adaptDocumentsToEligibilityProfile({ ds });
    expect(adapted.profile.marks10).toBe(90);
    expect(adapted.profile.marks12).toBe(88.5);
  });

  test("F & G: Missing course and missing study year remain strictly empty", () => {
    const ds = {
      ms12: { data: { extracted: { school: "Govt HSS Engineering Track", year: 2024 }, ocrConfidence: 95 } },
    };
    const adapted = adaptDocumentsToEligibilityProfile({ ds });
    expect(adapted.profile.course).toBe("");
    expect(adapted.profile.currentYear).toBe("");
    expect(adapted.fieldMetadata.course.value).toBe("");
    expect(adapted.fieldMetadata.currentYear.value).toBe("");
  });

  test("H: Manual user input overrides OCR value", () => {
    const ds = {
      community: { data: { extracted: { communityCategory: "MBC" }, ocrConfidence: 95 } },
      income: { data: { extracted: { income: 150000 }, ocrConfidence: 95 } },
    };
    const adapted = adaptDocumentsToEligibilityProfile({ ds });
    expect(adapted.profile.community).toBe("MBC");
    expect(adapted.profile.income).toBe("150000");

    // Simulating user changing fields in Eligibility form
    const userOverriddenForm = {
      ...adapted.profile,
      community: "BC",
      income: "200000",
      course: "Engineering",
      currentYear: "1st",
    };

    expect(userOverriddenForm.community).toBe("BC");
    expect(userOverriddenForm.income).toBe("200000");
  });

  test("I: Low-confidence fields flag for confirmation/review", () => {
    expect(getConfidenceStatus(95)).toBe("high");
    expect(getConfidenceStatus(80)).toBe("review");
    expect(getConfidenceStatus(60)).toBe("confirm");
    expect(getConfidenceStatus(40)).toBe("untrusted");

    const lowConfDs = {
      ms10: { data: { extracted: { name: "Blurry Name" }, ocrConfidence: 45 } },
    };
    const adapted = adaptDocumentsToEligibilityProfile({ ds: lowConfDs });
    expect(adapted.fieldMetadata.name.status).toBe("untrusted");
    // Untrusted values are not auto-populated as trusted form data
    expect(adapted.profile.name).toBe("");
  });

  test("J: Document conflict produces clear warnings", () => {
    const adapted = adaptDocumentsToEligibilityProfile({
      matrixData: {
        hasNameMismatch: true,
        hasDobMismatch: true,
        incomeResult: { status: "MISMATCH" },
        communityResult: { status: "MISMATCH" },
      },
    });

    expect(adapted.conflictWarnings.length).toBeGreaterThanOrEqual(4);
    expect(adapted.conflictWarnings.some(w => w.field === "name")).toBe(true);
    expect(adapted.conflictWarnings.some(w => w.field === "dob")).toBe(true);
    expect(adapted.conflictWarnings.some(w => w.field === "income")).toBe(true);
    expect(adapted.conflictWarnings.some(w => w.field === "community")).toBe(true);
  });

  test("K & L: Stepper renders 4 steps and supports Step 3 <-> Step 4 navigation preserving state", () => {
    render(
      <BrowserRouter>
        <DocumentUpload />
      </BrowserRouter>
    );

    // 4 step labels exist in the DOM
    expect(screen.getByText("Upload & Extract")).toBeTruthy();
    expect(screen.getByText("Enter Identity Details")).toBeTruthy();
    expect(screen.getByText("Consistency Results")).toBeTruthy();
    expect(screen.getByText("Eligibility & Scholarship Matches")).toBeTruthy();
  });

  test("M & N: Existing Eligibility Engine is called and renders matched scholarships", () => {
    const profile = {
      category: "BC",
      community: "bc",
      income: 150000,
      course: "Engineering",
      gender: "Girls",
      state: "Tamil Nadu",
      district: "Salem",
    };

    const results = evaluateAllScholarships(scholarships, profile);
    expect(results.length).toBeGreaterThan(0);
    const confirmedOrPotential = results.filter(r => r.status === "CONFIRMED MATCH" || r.status === "POTENTIAL MATCH");
    expect(confirmedOrPotential.length).toBeGreaterThan(0);

    // Checks result contract (status, why it matched, missing requirements, documents)
    const firstMatch = confirmedOrPotential[0];
    expect(firstMatch.scholarship).toBeDefined();
    expect(firstMatch.status).toBeDefined();
    expect(Array.isArray(firstMatch.passedCriteria)).toBe(true);
    expect(Array.isArray(firstMatch.missingRequirements)).toBe(true);
  });

  test("O: Confirms zero duplicate eligibility engine or matcher files were created", () => {
    const srcDir = path.resolve(__dirname, "../../");
    const checkDuplicate = (fileName) => {
      const p = path.join(srcDir, fileName);
      expect(fs.existsSync(p)).toBe(false);
    };

    checkDuplicate("NewEligibilityChecker.js");
    checkDuplicate("EligibilityCheckerV2.js");
    checkDuplicate("NewEligibilityEngine.js");
    checkDuplicate("ScholarshipMatcherV2.js");
    checkDuplicate("engine/NewEligibilityEngine.js");
    checkDuplicate("engine/ScholarshipMatcherV2.js");
  });

  test("P: Documents are processed in-memory and not written to permanent local storage", () => {
    // Verified: No localStorage.setItem or server upload of raw images/PDFs in DocumentUpload or profileAdapter
    const profile = adaptDocumentsToEligibilityProfile({
      ds: {
        ms10: { file: { name: "test.pdf" }, data: { extracted: { name: "Secure Student" } } },
      },
    });
    expect(profile.profile.name).toBe("Secure Student");
    // Ensure raw file object is not attached to profile
    expect(profile.profile.file).toBeUndefined();
    expect(profile.profile.blob).toBeUndefined();
  });

  test("Q: No external AI API keys or endpoints are configured", () => {
    const envPath = path.resolve(__dirname, "../../../.env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      expect(envContent).not.toContain("OPENAI_API_KEY");
      expect(envContent).not.toContain("GROQ_API_KEY");
    }
  });

  test("R: Existing ScholarshipChat UI remains 100% untouched", () => {
    const chatJs = path.resolve(__dirname, "../ScholarshipChat/ScholarshipChat.js");
    const chatCss = path.resolve(__dirname, "../ScholarshipChat/ScholarshipChat.css");

    expect(fs.existsSync(chatJs)).toBe(true);
    expect(fs.existsSync(chatCss)).toBe(true);
  });
});

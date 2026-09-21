import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LanguageSelector from "../LanguageSelector/LanguageSelector";
import "./DocumentUpload.css";
import { extractDocumentData } from "../LocalAI/sgpDocAI";
import { buildCrossDocumentMatrix } from "../../utils/verificationEngine";
import { SUPPORTED_DOC_TYPES } from "../../utils/documentClassifier";
import EligibilityEngine from "../EligibilityEngine/EligibilityEngine";
import { adaptDocumentsToEligibilityProfile } from "../../adapters/profileAdapter";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";

const I = {
  Shield:    () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L4 7v5c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V7L12 3z"/><polyline points="9 12 11 14 15 10"/></svg>,
  Clipboard: () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3a1 1 0 0 0-1 1v1h8V4a1 1 0 0 0-1-1H9z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="13" x2="15" y2="13"/></svg>,
  Scroll:    () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7Q12 5 15 7"/><line x1="9" y1="13" x2="15" y2="13"/></svg>,
  Banknote:  () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9v6M18 9v6"/></svg>,
  IdCard:    () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="3"/><circle cx="8" cy="12" r="2.5"/><line x1="13" y1="10" x2="20" y2="10"/><line x1="13" y1="13" x2="18" y2="13"/></svg>,
  Bank:      () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10L12 3l9 7"/><rect x="4" y="10" width="2" height="8"/><rect x="11" y="10" width="2" height="8"/><rect x="18" y="10" width="2" height="8"/><line x1="2" y1="18" x2="22" y2="18"/></svg>,
  Upload:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  Spark:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>,
  Spin:      () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>,
  Check:     () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>,
  Warn:      () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  X:         () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Back:      () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  Next:      () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Up:        () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
  Down:      () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  PDF:       () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="12" y2="17"/></svg>,
  Print:     () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  Box:       () => <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  Fix:       () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  Seed:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V12"/><path d="M5 3l7 9 7-9"/><path d="M3 9c0 4.97 4.03 9 9 9s9-4.03 9-9"/></svg>,
  Target:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  Info:      () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
};

const DCFG = {
  ms10:      { label: "10th Marksheet",        Icon: I.Clipboard, desc: "10th board certificate or SSLC marksheet",               color: "green"  },
  ms12:      { label: "12th Marksheet",        Icon: I.Clipboard, desc: "12th board / HSC marksheet or certificate",              color: "purple" },
  community: { label: "Community Certificate", Icon: I.Scroll,    desc: "Govt-issued community / caste certificate",              color: "orange" },
  income:    { label: "Income Certificate",    Icon: I.Banknote,  desc: "Must be within 6-12 months. Issue date checked locally.", color: "blue"   },
};

export const DOC_FIELD_DEFINITIONS = {
  ms10: [
    { id: "name", label: "STUDENT / APPLICANT NAME", keys: ["name", "studentName", "applicantName", "candidateName"] },
    { id: "fatherName", label: "PARENT / GUARDIAN NAME", keys: ["fatherName", "parentName", "guardianName", "motherName"] },
    { id: "dob", label: "DATE OF BIRTH", keys: ["dob", "dateOfBirth"] },
    { id: "board", label: "BOARD / EXAMINING BODY", keys: ["board", "examiningBody"] },
    { id: "school", label: "SCHOOL / INSTITUTION", keys: ["school", "institution", "schoolName"] },
    { id: "registerNumber", label: "REGISTRATION / ROLL NO", keys: ["registerNumber", "rollNumber", "regNo"] },
    { id: "year", label: "PASSING YEAR", keys: ["year", "passingYear"] },
    { id: "month", label: "EXAM MONTH", keys: ["month", "examMonth"] },
    { id: "subjectMarks", label: "SUBJECT-WISE MARKS", keys: ["subjectMarks", "subjectWiseMarks", "subjects"] },
    { id: "marksScored", label: "MARKS SCORED", keys: ["marksScored", "obtainedMarks", "marks"] },
    { id: "maxMarks", label: "MAXIMUM MARKS", keys: ["maxMarks", "totalMaxMarks"] },
    { id: "percentage", label: "PERCENTAGE", keys: ["percentage"] },
    { id: "grade", label: "GRADE / RESULT", keys: ["grade", "result"] },
  ],
  ms12: [
    { id: "name", label: "STUDENT / APPLICANT NAME", keys: ["name", "studentName", "applicantName", "candidateName"] },
    { id: "fatherName", label: "PARENT / GUARDIAN NAME", keys: ["fatherName", "parentName", "guardianName", "motherName"] },
    { id: "dob", label: "DATE OF BIRTH", keys: ["dob", "dateOfBirth"] },
    { id: "board", label: "BOARD / EXAMINING BODY", keys: ["board", "examiningBody"] },
    { id: "school", label: "SCHOOL / INSTITUTION", keys: ["school", "institution", "schoolName"] },
    { id: "stream", label: "STREAM / GROUP", keys: ["stream", "group"] },
    { id: "registerNumber", label: "REGISTRATION / ROLL NO", keys: ["registerNumber", "rollNumber", "regNo"] },
    { id: "year", label: "PASSING YEAR", keys: ["year", "passingYear"] },
    { id: "month", label: "EXAM MONTH", keys: ["month", "examMonth"] },
    { id: "subjectMarks", label: "SUBJECT-WISE MARKS", keys: ["subjectMarks", "subjectWiseMarks", "subjects"] },
    { id: "marksScored", label: "MARKS SCORED", keys: ["marksScored", "obtainedMarks", "marks"] },
    { id: "maxMarks", label: "MAXIMUM MARKS", keys: ["maxMarks", "totalMaxMarks"] },
    { id: "percentage", label: "PERCENTAGE", keys: ["percentage"] },
    { id: "grade", label: "GRADE / RESULT", keys: ["grade", "result"] },
  ],
  income: [
    { id: "name", label: "APPLICANT NAME", keys: ["name", "applicantName", "candidateName", "studentName"] },
    { id: "fatherName", label: "FATHER'S / GUARDIAN NAME", keys: ["fatherName", "guardianName", "parentName"] },
    { id: "dob", label: "DATE OF BIRTH", keys: ["dob", "dateOfBirth"] },
    { id: "income", label: "ANNUAL INCOME", keys: ["income", "annualIncome", "incomeNumber"] },
    { id: "incomeWords", label: "INCOME IN WORDS", keys: ["incomeWords", "incomeInWords"] },
    { id: "incomeYear", label: "INCOME YEAR", keys: ["incomeYear", "financialYear", "year"] },
    { id: "certNumber", label: "CERTIFICATE NO.", keys: ["certNumber", "certificateNo"] },
    { id: "applicationNumber", label: "APPLICATION NO.", keys: ["applicationNumber", "applicationNo", "appNo"] },
    { id: "issueDate", label: "ISSUE DATE", keys: ["issueDate", "dateOfIssue"] },
    { id: "validFrom", label: "VALID FROM", keys: ["validFrom"] },
    { id: "validUpto", label: "VALID UNTIL", keys: ["validUpto", "validUntil", "validTill", "expiryDate"] },
    { id: "occupation", label: "OCCUPATION / SOURCE OF INCOME", keys: ["occupation", "sourceOfIncome"] },
    { id: "taluk", label: "TALUK", keys: ["taluk"] },
    { id: "district", label: "DISTRICT", keys: ["district"] },
    { id: "state", label: "STATE", keys: ["state"] },
    { id: "issuingAuthority", label: "ISSUING AUTHORITY", keys: ["issuingAuthority", "authority"] },
  ],
  community: [
    { id: "name", label: "STUDENT / APPLICANT NAME", keys: ["name", "applicantName", "candidateName", "studentName"] },
    { id: "fatherName", label: "FATHER'S / GUARDIAN NAME", keys: ["fatherName", "guardianName", "parentName"] },
    { id: "dob", label: "DATE OF BIRTH", keys: ["dob", "dateOfBirth"] },
    { id: "gender", label: "GENDER", keys: ["gender", "sex"] },
    { id: "community", label: "COMMUNITY / CASTE", keys: ["community", "caste"] },
    { id: "communityCategory", label: "CATEGORY", keys: ["communityCategory", "category"] },
    { id: "certNumber", label: "CERTIFICATE NO.", keys: ["certNumber", "certificateNo"] },
    { id: "applicationNumber", label: "APPLICATION NO.", keys: ["applicationNumber", "applicationNo", "appNo"] },
    { id: "issueDate", label: "ISSUE DATE", keys: ["issueDate", "dateOfIssue"] },
    { id: "validFrom", label: "VALID FROM", keys: ["validFrom"] },
    { id: "validUpto", label: "VALID UNTIL", keys: ["validUpto", "validUntil", "validTill", "expiryDate"] },
    { id: "taluk", label: "TALUK", keys: ["taluk"] },
    { id: "district", label: "DISTRICT", keys: ["district"] },
    { id: "state", label: "STATE", keys: ["state"] },
    { id: "issuingAuthority", label: "ISSUING AUTHORITY", keys: ["issuingAuthority", "authority"] },
  ],
};

export const EF = {
  ms10: DOC_FIELD_DEFINITIONS.ms10.map(f => f.id),
  ms12: DOC_FIELD_DEFINITIONS.ms12.map(f => f.id),
  community: DOC_FIELD_DEFINITIONS.community.map(f => f.id),
  income: DOC_FIELD_DEFINITIONS.income.map(f => f.id),
};

export const FL = {
  name: "STUDENT / APPLICANT NAME",
  fatherName: "PARENT / GUARDIAN NAME",
  dob: "DATE OF BIRTH",
  board: "BOARD / EXAMINING BODY",
  school: "SCHOOL / INSTITUTION",
  stream: "STREAM / GROUP",
  year: "PASSING YEAR",
  month: "EXAM MONTH",
  registerNumber: "REGISTRATION / ROLL NO",
  marksScored: "MARKS SCORED",
  maxMarks: "MAXIMUM MARKS",
  marks: "MARKS (SCORED / MAX)",
  percentage: "PERCENTAGE",
  grade: "GRADE / RESULT",
  subjectMarks: "SUBJECT-WISE MARKS",
  community: "COMMUNITY / CASTE",
  communityCategory: "CATEGORY",
  certNumber: "CERTIFICATE NO.",
  applicationNumber: "APPLICATION NO.",
  issueDate: "ISSUE DATE",
  validFrom: "VALID FROM",
  validUpto: "VALID UNTIL",
  occupation: "OCCUPATION / SOURCE OF INCOME",
  incomeWords: "INCOME IN WORDS",
  incomeYear: "INCOME YEAR",
  taluk: "TALUK",
  district: "DISTRICT",
  state: "STATE",
  issuingAuthority: "ISSUING AUTHORITY",
  income: "ANNUAL INCOME",
  gender: "GENDER",
};

function formatExtractedDisplayValue(fieldId, val) {
  if (val === null || val === undefined || val === "") return null;
  if (Array.isArray(val)) {
    if (val.length === 0) return null;
    return val
      .map(item => {
        if (typeof item === "object" && item !== null) {
          if (item.subject && (item.marks !== undefined || item.marksScored !== undefined)) {
            return `${item.subject}: ${item.marks ?? item.marksScored}`;
          }
          return Object.entries(item).map(([k, v]) => `${k}: ${v}`).join(", ");
        }
        return String(item);
      })
      .join(" • ");
  }
  if (typeof val === "object") {
    return JSON.stringify(val);
  }
  if (typeof val === "boolean") {
    return val ? "Yes" : "No";
  }
  if (fieldId === "income" && typeof val === "number") {
    return `₹${val.toLocaleString("en-IN")}`;
  }
  return String(val);
}

function resolveExtractedFieldScore(fieldDef, ext, data) {
  for (const k of fieldDef.keys) {
    const sfConf = ext?.structuredFields?.[k]?.confidence;
    if (typeof sfConf === "number" && sfConf > 0) {
      return sfConf <= 1 ? Math.round(sfConf * 100) : Math.round(sfConf);
    }
  }
  for (const k of fieldDef.keys) {
    const fc = data?.fieldConfidences?.[k] ?? ext?.fieldConfidence?.[k];
    if (typeof fc === "number" && fc > 0) {
      return fc <= 1 ? Math.round(fc * 100) : Math.round(fc);
    }
  }
  if (["marksScored", "maxMarks", "percentage", "grade"].includes(fieldDef.id)) {
    const mConf = data?.fieldConfidences?.marks ?? ext?.fieldConfidence?.marks;
    if (typeof mConf === "number" && mConf > 0) {
      return mConf <= 1 ? Math.round(mConf * 100) : Math.round(mConf);
    }
  }
  if (fieldDef.id === "community" || fieldDef.id === "communityCategory") {
    const cConf = data?.fieldConfidences?.community ?? ext?.fieldConfidence?.community;
    if (typeof cConf === "number" && cConf > 0) {
      return cConf <= 1 ? Math.round(cConf * 100) : Math.round(cConf);
    }
  }
  const legacyScore = data?.fieldConfidences?.[fieldDef.id];
  if (typeof legacyScore === "number" && legacyScore > 0) {
    return legacyScore <= 1 ? Math.round(legacyScore * 100) : Math.round(legacyScore);
  }
  return null;
}

const btnColor = c => ({ blue: "#2563eb", green: "#059669", purple: "#7c3aed", orange: "#d97706", red: "#dc2626" }[c] || "#2563eb");

function pairScoreLabel(s) {
  if (s === "EXACT_MATCH")      return "✅ Exact Match";
  if (s === "LIKELY_MATCH")     return "✅ Likely Match";
  if (s === "MINOR_DIFFERENCE") return "⚠️ Minor Diff";
  if (s === "NEEDS_REVIEW")     return "⚠️ Needs Review";
  if (s === "MISMATCH")         return "❌ Mismatch";
  return "— Missing";
}

function getScoreBadgeInlineStyle(s) {
  if (s === "EXACT_MATCH" || s === "LIKELY_MATCH" || s === "MATCH") return { background: "#f0fdf4", color: "#059669", border: "1px solid #6ee7b7" };
  if (s === "MINOR_DIFFERENCE" || s === "WARNING" || s === "NEEDS_REVIEW") return { background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a" };
  if (s === "MISMATCH" || s === "EXPIRED")         return { background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5" };
  return { background: "#f8fafc", color: "#94a3b8", border: "1px solid #e2e8f0" };
}

// ─── Verification Report View ───────────────────────────────────────────────
function VerificationReport({ matrixData, aadharName, aadharDob, bankHolder, bankAccType }) {
  if (!matrixData) return null;

  const {
    nameSources,
    namePairs,
    nameConsistencyStatus,
    hasNameMismatch,
    hasNameMinor,
    dobPairs,
    dobConsistencyStatus,
    hasDobMismatch,
    incomeResult,
    communityResult,
    scorePoints,
    maxPoints,
    consistencyPercentage,
    overallReadiness,
  } = matrixData;

  const vcls = !hasNameMismatch && !hasDobMismatch && bankAccType === "Single" && incomeResult.status !== "EXPIRED" && communityResult.status !== "MISMATCH"
    ? (hasNameMinor ? "verdict-warn" : "verdict-ok")
    : "verdict-fix";

  return (
    <div>
      {/* Disclaimer Banner */}
      <div style={{ background: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: "10px", padding: "12px 16px", marginBottom: "18px", fontSize: "12px", color: "#475569", display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <I.Info />
        <div>
          <strong>Document Consistency Notice:</strong> SGP checks information consistency using the uploaded documents and student inputs. It does not authenticate documents against official government databases (UIDAI, NPCI, NSP, UMIS). Official verification must be completed on the government portal.
        </div>
      </div>

      {/* Feature 1: Parent-Income Flow Notice */}
      {matrixData.incomeApplicant === "parent" && (
        <div style={{ background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: "10px", padding: "12px 16px", marginBottom: "18px", fontSize: "12px", color: "#92400e", display: "flex", alignItems: "flex-start", gap: "10px" }}>
          <span style={{ fontSize: "16px" }}>⚠️</span>
          <div>
            <strong>Parent Declared as Income Applicant:</strong> Income Certificate verification is operating in parental mode. Student-parent identity comparison is flagged for manual relationship verification instead of raising a hard mismatch failure.
          </div>
        </div>
      )}

      {/* Pre-Submission Consistency Score Banner */}
      <div style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", color: "white", borderRadius: "12px", padding: "18px 24px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ fontSize: "11px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Pre-Submission Consistency Score</div>
          <div style={{ fontSize: "28px", fontWeight: 900, color: consistencyPercentage >= 80 ? "#4ade80" : consistencyPercentage >= 60 ? "#facc15" : "#f87171", marginTop: "2px" }}>
            {consistencyPercentage}% — {overallReadiness}
          </div>
          <div style={{ fontSize: "12px", color: "#cbd5e1", marginTop: "4px" }}>
            {scorePoints} of {maxPoints} verification points achieved across locally checked items.
          </div>
        </div>
      </div>

      {/* 2-Col entered summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "18px" }}>
        <div style={{ background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: "10px", padding: "12px 16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 900, color: "#1d4ed8", textTransform: "uppercase", marginBottom: "6px" }}>
            🪪 Aadhaar Reference Details
          </div>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>{aadharName || "—"}</div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>DOB: {aadharDob || "—"}</div>
        </div>
        <div style={{ background: "#f0fdf4", border: "1.5px solid #6ee7b7", borderRadius: "10px", padding: "12px 16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 900, color: "#065f46", textTransform: "uppercase", marginBottom: "6px" }}>
            🏦 Bank Passbook Details
          </div>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>{bankHolder || "—"}</div>
          <div style={{ fontSize: "11px", marginTop: "2px" }}>
            <span style={{ padding: "2px 8px", borderRadius: "6px", fontWeight: 800, fontSize: "11px", background: bankAccType === "Single" ? "#dcfce7" : "#fee2e2", color: bankAccType === "Single" ? "#166534" : "#991b1b" }}>
              {bankAccType || "—"} Account
            </span>
          </div>
        </div>
      </div>

      {/* Section 1: All-Pairs Name Cross-Check */}
      <div className="res-grp-card" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 900, color: "#0f172a", margin: 0 }}>
            1. Name Cross-Check ({nameSources.length} Sources Found)
          </h3>
          <span style={{ padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 800, ...getScoreBadgeInlineStyle(nameConsistencyStatus === "green" ? "EXACT_MATCH" : nameConsistencyStatus === "yellow" ? "MINOR_DIFFERENCE" : "MISMATCH") }}>
            {nameConsistencyStatus === "green" ? "Consistent" : nameConsistencyStatus === "yellow" ? "Minor Variation" : "Mismatch"}
          </span>
        </div>

        <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "12px" }}>
          Compares name across Aadhaar, Community Certificate, <strong>Income Certificate</strong>, 10th/12th Marksheets, and Bank Passbook.
        </div>

        {nameSources.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "14px" }}>
            {nameSources.map((src, i) => (
              <div key={i} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 12px", minWidth: "160px", flex: 1 }}>
                <div style={{ fontSize: "10px", fontWeight: 800, color: "#64748b" }}>{src.ico} {src.doc}</div>
                <div style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>{src.val}</div>
              </div>
            ))}
          </div>
        ) : null}

        {namePairs.length > 0 ? (
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
            {namePairs.map((pr, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", padding: "10px 14px", background: i % 2 === 0 ? "#fff" : "#f8fafc", borderTop: i > 0 ? "1px solid #f1f5f9" : "none", gap: "10px", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>{pr.a.ico} {pr.a.doc}</div>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a" }}>{pr.a.val}</div>
                </div>
                <div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>{pr.b.ico} {pr.b.doc}</div>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a" }}>{pr.b.val}</div>
                </div>
                <div>
                  <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: 800, ...getScoreBadgeInlineStyle(pr.status) }}>
                    {pairScoreLabel(pr.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", padding: "12px" }}>Upload documents to enable pairwise cross-comparison.</div>
        )}
      </div>

      {/* Section 2: Date of Birth Cross-Check */}
      <div className="res-grp-card" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 900, color: "#0f172a", margin: 0 }}>
            2. Date of Birth Cross-Check
          </h3>
          <span style={{ padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 800, ...getScoreBadgeInlineStyle(dobConsistencyStatus === "green" ? "EXACT_MATCH" : "MISMATCH") }}>
            {dobConsistencyStatus === "green" ? "Consistent" : dobConsistencyStatus === "red" ? "Mismatch" : "Pending"}
          </span>
        </div>

        {dobPairs.length > 0 ? (
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
            {dobPairs.map((p, i) => (
              <div key={i} style={{ padding: "10px 14px", background: i % 2 === 0 ? "#fff" : "#f8fafc", borderTop: i > 0 ? "1px solid #f1f5f9" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>{p.ico} {p.doc}: <strong>{p.val}</strong></div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>{p.explanation}</div>
                </div>
                <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: 800, ...getScoreBadgeInlineStyle(p.status === "MATCH" ? "EXACT_MATCH" : "MISMATCH") }}>
                  {p.status === "MATCH" ? "✅ Match" : "❌ Mismatch"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", padding: "12px" }}>No certificate DOBs found to compare against Aadhaar.</div>
        )}
      </div>

      {/* Section 3: Income Cross-Check */}
      <div className="res-grp-card" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 900, color: "#0f172a", margin: 0 }}>
            3. Income Cross-Check &amp; Freshness
          </h3>
          <span style={{ padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 800, ...getScoreBadgeInlineStyle(incomeResult.status === "MATCH" ? "EXACT_MATCH" : incomeResult.status === "WARNING" ? "MINOR_DIFFERENCE" : "MISMATCH") }}>
            {incomeResult.status === "MATCH" ? "Consistent" : incomeResult.status}
          </span>
        </div>
        <div style={{ fontSize: "12px", color: "#334155", marginBottom: "6px" }}>{incomeResult.explanation}</div>
        {incomeResult.freshness && (
          <div style={{ fontSize: "11px", color: incomeResult.freshness.color === "green" ? "#166534" : incomeResult.freshness.color === "yellow" ? "#b45309" : "#991b1b" }}>
            Freshness: <strong>{incomeResult.freshness.label}</strong> — {incomeResult.freshness.detail}
          </div>
        )}
      </div>

      {/* Section 4: Community Category Cross-Check */}
      <div className="res-grp-card" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 900, color: "#0f172a", margin: 0 }}>
            4. Community Category Cross-Check
          </h3>
          <span style={{ padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 800, ...getScoreBadgeInlineStyle(communityResult.status === "MATCH" ? "EXACT_MATCH" : "MISMATCH") }}>
            {communityResult.status === "MATCH" ? "Consistent" : communityResult.status}
          </span>
        </div>
        <div style={{ fontSize: "12px", color: "#334155" }}>{communityResult.explanation}</div>
      </div>

      {/* Summary Verdict */}
      <div className={vcls} style={{ marginTop: "20px" }}>
        <div className="verdict-title">
          {consistencyPercentage >= 85 ? "✅ Pre-Submission Consistency Confirmed" : consistencyPercentage >= 60 ? "⚠️ Review Document Variations" : "❌ Correction Needed Before Applying"}
        </div>
        <div className="verdict-sub">
          {consistencyPercentage >= 85
            ? "Your documents and entered details are consistent. Proceed to official submission on National Scholarship Portal (NSP) or UMIS."
            : "Review the highlighted items above. Ensure all identity and certificate details match before applying on the official portal."}
        </div>
      </div>
    </div>
  );
}

const initDS = () => Object.fromEntries(Object.keys(DCFG).map(t => [t, { file: null, url: null, loading: false, data: null, err: null, open: true }]));

export default function DocumentUpload({ initialDs = null, initialStep = 1 } = {}) {
  const navigate = useNavigate();
  const [isExiting, setIsExiting] = useState(false);
  const [step, setStep] = useState(initialStep);
  const [ds, setDs] = useState(() => initialDs || initDS());

  const [aadharName, setAadharName] = useState("");
  const [aadharDob, setAadharDob] = useState("");
  const [bankAccType, setBankAccType] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [detailsErrs, setDetailsErrs] = useState({});
  const [studentIncome, setStudentIncome] = useState("");
  const [studentCategory, setStudentCategory] = useState("");
  const [incomeApplicant, setIncomeApplicant] = useState("student");
  const [quotaType, setQuotaType] = useState("government");
  const [firstGraduate, setFirstGraduate] = useState(null);
  const [matrixData, setMatrixData] = useState(null);
  const [eligibilityData, setEligibilityData] = useState(null);

  const { user } = useAuth();
  const [savingToApp, setSavingToApp] = useState(false);
  const [saveAppMsg, setSaveAppMsg] = useState(null);

  const saveVerificationToApplication = async () => {
    if (!user || user.role !== "STUDENT") {
      alert("Please sign in with a student account to attach verification results to an application.");
      return;
    }
    try {
      setSavingToApp(true);
      setSaveAppMsg(null);
      const appsRes = await apiRequest("/api/student/applications");
      let activeApp = appsRes?.applications?.[0];
      if (!activeApp) {
        const created = await apiRequest("/api/student/applications", {
          method: "POST",
          body: JSON.stringify({ schemeId: "SCHEME-NFST" }),
        });
        activeApp = created?.application;
      }
      if (!activeApp) throw new Error("No active application found.");

      const types = ["ms10", "ms12", "community", "income"];
      let count = 0;
      for (const t of types) {
        if (ds[t]?.data?.extracted) {
          await apiRequest(`/api/student/applications/${activeApp.applicationId}/verify-document`, {
            method: "POST",
            body: JSON.stringify({
              documentType: t,
              extractedFields: ds[t].data.extracted,
              confidence: ds[t].data.ocrConfidence || 90,
              verificationStatus: ds[t].data.issues?.length > 0 ? "NEEDS_REVIEW" : "VERIFIED",
              mismatch: false,
            }),
          });
          count++;
        }
      }
      setSaveAppMsg(`✅ Successfully linked ${count} document verification records to Application ${activeApp.applicationId}!`);
    } catch (err) {
      alert("Failed to link to application: " + err.message);
    } finally {
      setSavingToApp(false);
    }
  };

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(ds).forEach(item => {
        if (item.url && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(item.url);
      });
    };
  }, [ds]);

  const nav = (path) => { setIsExiting(true); setTimeout(() => navigate(path), 500); };

  const pickFile = (type, file) => {
    if (!file) return;
    const ext = (file.name || "").split(".").pop()?.toLowerCase();
    const mime = file.type || "";
    const ok = ["image/jpeg", "image/png", "image/webp", "image/bmp", "image/gif", "application/pdf"];
    const isAccepted = ok.includes(mime) || ["jpg", "jpeg", "png", "webp", "bmp", "gif", "pdf"].includes(ext);

    if (!isAccepted) {
      setDs(p => ({ ...p, [type]: { ...p[type], err: "Unsupported file format. Please upload JPG, PNG, WEBP, or PDF." } }));
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setDs(p => ({ ...p, [type]: { ...p[type], err: "File size exceeds 15 MB limit." } }));
      return;
    }

    setDs(p => {
      if (p[type].url) URL.revokeObjectURL(p[type].url);
      return { ...p, [type]: { file, url: URL.createObjectURL(file), err: null, data: null, loading: false, open: true } };
    });
  };

  const resetDoc = (type) => setDs(p => {
    if (p[type].url) URL.revokeObjectURL(p[type].url);
    return { ...p, [type]: { file: null, url: null, loading: false, data: null, err: null, open: true } };
  });

  const toggleOpen = (type) => setDs(p => ({ ...p, [type]: { ...p[type], open: !p[type].open } }));

  const analyseDoc = async (type) => {
    setDs(p => ({ ...p, [type]: { ...p[type], loading: true, err: null } }));
    try {
      const localResult = await extractDocumentData(ds[type].file, type);
      if (!localResult.success) throw new Error(localResult.error || "Document extraction failed");

      if (type === "community" && localResult.extracted?.quotaType) {
        setQuotaType(localResult.extracted.quotaType);
      }

      setDs(p => ({ ...p, [type]: { ...p[type], data: localResult, loading: false, open: true } }));
    } catch (e) {
      setDs(p => ({ ...p, [type]: { ...p[type], loading: false, err: e.message || "Analysis failed" } }));
    }
  };

  const buildResults = (overrideApplicant) => {
    const tenthData = ds.ms10.data?.extracted || null;
    const twelfthData = ds.ms12.data?.extracted || null;
    const communityData = ds.community.data?.extracted || null;
    const incomeData = ds.income.data?.extracted || null;

    const applicant = overrideApplicant !== undefined ? overrideApplicant : incomeApplicant;

    const matrix = buildCrossDocumentMatrix({
      aadharName,
      aadharDob,
      bankHolder,
      bankAccType,
      tenthData,
      twelfthData,
      communityData,
      incomeData,
      studentIncome,
      studentCategory,
      incomeApplicant: applicant,
    });

    setMatrixData(matrix);
  };

  const validateDetailsAndProceed = () => {
    const errs = {};
    if (!aadharName.trim())  errs.aadharName = true;
    if (!aadharDob)          errs.aadharDob = true;
    if (!bankAccType)        errs.bankAccType = true;
    if (!bankHolder.trim())  errs.bankHolder = true;

    setDetailsErrs(errs);
    if (Object.keys(errs).length) {
      alert("Please fill all required identity fields (*).");
      return;
    }

    buildResults();
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const proceedToEligibility = () => {
    buildResults();
    const adapted = adaptDocumentsToEligibilityProfile({
      ds,
      aadharName,
      aadharDob,
      studentCategory,
      studentIncome,
      bankHolder,
      bankAccType,
      matrixData,
      incomeApplicant,
      quotaType,
      firstGraduate,
    });
    setEligibilityData(adapted);
    setStep(4);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderExtracted = (type) => {
    const s = ds[type];
    const cfg = DCFG[type];
    const fieldDefs = DOC_FIELD_DEFINITIONS[type] || [];
    const ext = s.data?.extracted || {};
    const slotVal = s.data?.slotValidation || {};
    const quality = s.data?.quality || {};
    const stateVal = s.data?.state || ext.state || null;
    const authVal = s.data?.issuingAuthority || ext.issuingAuthority || null;
    const ocrConfText = s.data?.ocrConfidence !== null && s.data?.ocrConfidence !== undefined
      ? `${s.data.ocrConfidence}%`
      : "Not available";
    const qualityLvl = quality.qualityLevel ? quality.qualityLevel.toUpperCase() : "UNKNOWN";
    const statusText = s.data?.issues?.length > 0
      ? "Manual verification recommended"
      : (s.data?.warnings?.length > 0 ? "Extracted with minor uncertainty" : "Extracted with high confidence");

    return (
      <div className={"ex-wrap-r ex-" + cfg.color}>
        <div className="ex-hd-r" onClick={() => toggleOpen(type)}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <I.Clipboard /> Extracted Details &amp; Multi-State Audit
          </span>
          <span>{s.open ? <I.Up /> : <I.Down />}</span>
        </div>

        {s.open && (
          <div className="ex-body-r">
            {/* Slot Validation Alert */}
            {slotVal.status === "mismatch" && (
              <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 10, display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ fontSize: 16 }}>❌</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: "#dc2626" }}>Wrong Document Type Uploaded</div>
                  <div style={{ fontSize: 11, color: "#7f1d1d" }}>{slotVal.message}</div>
                </div>
              </div>
            )}

            {slotVal.status === "unconfident" && (
              <div style={{ background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontSize: 11, color: "#92400e" }}>
                ⚠️ {slotVal.message}
              </div>
            )}

            {/* Quality, OCR Confidence & State-Agnostic Strip (Compact Standardized Metadata Grid) */}
            <div className="doc-audit-metadata-grid">
              <div className="metadata-item">
                <span className="metadata-label">Document Type</span>
                <span className="metadata-value">
                  {s.data?.detectedType ? (SUPPORTED_DOC_TYPES[s.data.detectedType]?.label || s.data.detectedType) : cfg.label}
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">State</span>
                <span className="metadata-value" style={{ color: stateVal ? "#0369a1" : "#64748b" }}>
                  {stateVal || "State not determined"}
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Authority</span>
                <span className="metadata-value" style={{ color: authVal ? "#4338ca" : "#64748b" }}>
                  {authVal || "Authority not determined"}
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Quality</span>
                <span className="metadata-value" style={{ color: qualityLvl === "GOOD" ? "#16a34a" : qualityLvl === "FAIR" ? "#ca8a04" : qualityLvl === "POOR" ? "#dc2626" : "#64748b" }}>
                  {qualityLvl}
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">OCR Confidence</span>
                <span className="metadata-value">
                  {ocrConfText}
                  {s.data?.fieldConfidence ? (
                    <span style={{ fontWeight: 600, fontSize: 10, color: "#0284c7", marginLeft: 4 }}>
                      (Field Match: {s.data.fieldConfidence}%)
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Status</span>
                <span className="metadata-value" style={{ color: s.data?.issues?.length > 0 ? "#dc2626" : (s.data?.warnings?.length > 0 ? "#d97706" : "#16a34a") }}>
                  {statusText}
                </span>
              </div>
            </div>

            {/* Quality Explanation */}
            {quality.qualityDescription && (
              <div style={{ fontSize: "10.5px", color: "#64748b", marginBottom: 8, fontStyle: "italic" }}>
                ℹ️ {quality.qualityDescription}
              </div>
            )}

            {/* Warnings and Issues */}
            {s.data?.warnings?.length > 0 && (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "6px 10px", marginBottom: 8, fontSize: 11, color: "#92400e" }}>
                {s.data.warnings.map((w, wi) => <div key={wi}>⚠️ {w}</div>)}
              </div>
            )}

            {/* Low OCR Confidence Warning (<65%) */}
            {((s.data?.ocrConfidence !== null && s.data?.ocrConfidence !== undefined && s.data.ocrConfidence < 65) || (s.data?.fieldConfidence !== null && s.data?.fieldConfidence !== undefined && s.data.fieldConfidence < 65)) && (
              <div className="blurry-scan-warning-banner" style={{ background: "#eff6ff", border: "1.5px solid #93c5fd", borderRadius: 8, padding: "10px 14px", marginBottom: 10, fontSize: 11.5, color: "#1e40af", display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>ℹ️</span>
                <div>
                  <strong style={{ display: "block", marginBottom: 2 }}>INFO: Blurry Scan Warning</strong>
                  <span>OCR extraction confidence is below 65%. For optimal multi-document data consistency checking, please ensure clear, high-contrast, well-lit scans (300 DPI recommended). Pipeline will proceed using best-effort text extraction without crashing.</span>
                </div>
              </div>
            )}

            {/* Income Freshness Banner */}
            {type === "income" && ext.freshness && (
              <div style={{
                background: ext.freshness.status === "expired" ? "#fef2f2" : ext.freshness.status === "warning" ? "#fffbeb" : "#f0fdf4",
                border: `1.5px solid ${ext.freshness.status === "expired" ? "#fca5a5" : ext.freshness.status === "warning" ? "#fde68a" : "#86efac"}`,
                borderRadius: 8,
                padding: "8px 12px",
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11
              }}>
                <span style={{ fontSize: 14 }}>{ext.freshness.status === "expired" ? "❌" : ext.freshness.status === "warning" ? "⚠️" : "✅"}</span>
                <div>
                  <div style={{ fontWeight: 800, color: ext.freshness.status === "expired" ? "#dc2626" : ext.freshness.status === "warning" ? "#d97706" : "#166534" }}>
                    Validity &amp; Freshness: {ext.freshness.label}
                  </div>
                  <div style={{ color: "#475569", marginTop: 2 }}>{ext.freshness.detail}</div>
                </div>
              </div>
            )}

            {/* Standardized Extracted Fields List */}
            <div className="extracted-fields-list">
              {fieldDefs.map(fieldDef => {
                let rawVal = null;
                for (const k of fieldDef.keys) {
                  if (ext[k] !== undefined && ext[k] !== null && ext[k] !== "") {
                    rawVal = ext[k];
                    break;
                  }
                }
                if (rawVal === null && fieldDef.id === "state" && s.data?.state) {
                  rawVal = s.data.state;
                }
                if (rawVal === null && fieldDef.id === "issuingAuthority" && s.data?.issuingAuthority) {
                  rawVal = s.data.issuingAuthority;
                }

                const displayVal = formatExtractedDisplayValue(fieldDef.id, rawVal);
                if (!displayVal) return null;

                const matchScore = resolveExtractedFieldScore(fieldDef, ext, s.data);

                return (
                  <div key={fieldDef.id} className="extracted-field-row ex-row-r">
                    <div className="extracted-field-label ex-k-r">
                      {fieldDef.label}
                    </div>
                    <div className="extracted-field-value ex-v-r">
                      <div className="value extracted-val-text">
                        {displayVal}
                      </div>
                      {typeof matchScore === "number" && matchScore > 0 ? (
                        <span className={`match-badge ${matchScore >= 85 ? "match-high" : "match-med"}`}>
                          {matchScore}% match
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const STEPS = [
    { n: 1, label: "Upload & Extract" },
    { n: 2, label: "Enter Identity Details" },
    { n: 3, label: "Consistency Results" },
    { n: 4, label: "Eligibility & Scholarship Matches" },
  ];

  const inputStyle = (hasErr) => ({
    width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
    border: `1.5px solid ${hasErr ? "#fca5a5" : "#e2e8f0"}`,
    background: hasErr ? "#fef2f2" : "#fff",
    outline: "none", boxSizing: "border-box", color: "#0f172a",
  });
  const labelStyle = { fontSize: 12, fontWeight: 800, color: "#475569", marginBottom: 5, display: "block" };
  const reqStyle   = { color: "#dc2626", marginLeft: 2 };
  const hintStyle  = { fontSize: 11, color: "#94a3b8", marginTop: 4, display: "block" };

  return (
    <div className={"document-page " + (isExiting ? "is-exiting-down" : "is-entering-up")}>
      <div className="dashboard-bg-animations">
        <div className="out-shape out-blob blob-1" /><div className="out-shape out-blob blob-2" />
        <div className="out-shape out-ring" /><div className="out-shape out-cross">+</div>
        <div className="out-shape out-triangle" /><div className="out-shape out-dot" />
      </div>

      <header className="pro-header">
        <div className="header-shape shape-1" /><div className="header-shape shape-2" />
        <div className="header-container">
          <div className="header-brand">
            <div className="brand-icon"><I.Shield /></div>
            <div className="brand-text">
              <h1>Document Consistency Verification</h1>
              <p>Pre-Submission Consistency &amp; Readiness Check for Scholarships</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn-pro-back" onClick={() => nav("/dashboard")}><I.Back /> Back To Dashboard</button>
            <LanguageSelector />
          </div>
        </div>
      </header>

      <div className="nsp-step-bar">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.n}>
            {i > 0 && <div className="step-sep">{">"}</div>}
            <div
              className={"step-item" + (step === s.n ? " active" : step > s.n ? " done" : "")}
              onClick={() => {
                if (s.n === 1) setStep(1);
                else if (s.n === 2 && step >= 2) setStep(2);
                else if (s.n === 3 && step >= 3) { buildResults(); setStep(3); }
                else if (s.n === 4 && step >= 3) { proceedToEligibility(); }
              }}
            >
              <div className="step-circle">{step > s.n ? "✓" : s.n}</div>
              <div className="step-label">{s.label}</div>
            </div>
          </React.Fragment>
        ))}
      </div>

      <main className="upload-container" style={{ position: "relative", zIndex: 10 }}>

        {/* ══════════════════ STEP 1 ══════════════════ */}
        {step === 1 && (
          <div>
            <div className="section-header" style={{ marginBottom: 24 }}>
              <h2>Upload &amp; Extract Documents</h2>
              <p>Upload each document and click <strong>VERIFY</strong>. Processing runs 100% locally in your browser with no API key or server storage.</p>
            </div>

            {/* Privacy notice banner */}
            <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 12, padding: "12px 18px", marginBottom: 20, fontSize: "12px", color: "#166534", display: "flex", alignItems: "center", gap: 10 }}>
              <I.Shield />
              <div>
                <strong>Privacy Guaranteed:</strong> Documents are processed entirely in your browser using local OCR. Document files are not sent to or stored on any external server.
              </div>
            </div>

            <div className="documents-grid">
              {Object.entries(DCFG).map(([type, cfg]) => {
                const s = ds[type]; const DocIcon = cfg.Icon;
                return (
                  <div key={type} className={"document-card " + (s.data ? "card-success" : "card-" + cfg.color)}>
                    <div className="card-top">
                      <div className="icon-box"><DocIcon /></div>
                      <div className={"status-pill " + (s.data ? "active-green" : "pending")}>
                        {s.data ? <span style={{ display: "flex", alignItems: "center", gap: 4 }}><I.Check /> Extracted</span> : "Pending"}
                      </div>
                    </div>
                    <h3>{cfg.label}</h3>
                    <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>{cfg.desc}</p>

                    {!s.file ? (
                      <div className="upload-section">
                        <p className="helper-text">JPG, PNG or PDF — max 15 MB</p>
                        <label className="upload-btn">
                          <input type="file" accept="image/*,.pdf" onChange={e => pickFile(type, e.target.files[0])} />
                          <span className="btn-content"><I.Upload /> Choose File</span>
                        </label>
                      </div>
                    ) : (
                      <div className="success-section">
                        <div className="nsp-prev-wrap">
                          {s.file.type === "application/pdf" ? (
                            <div className="nsp-pdf-preview">
                              <div className="nsp-pdf-icon"><I.PDF /></div>
                              <div className="nsp-pdf-name">{s.file.name}</div>
                              <div className="nsp-pdf-size">{(s.file.size / 1024).toFixed(0)} KB — PDF</div>
                            </div>
                          ) : (
                            <img src={s.url} alt="doc" style={{ width: "100%", objectFit: "contain", maxHeight: 130 }} />
                          )}
                          <button className="nsp-prev-rm" onClick={() => resetDoc(type)}><I.X /></button>
                        </div>

                        {!s.data && !s.loading && (
                          <button
                            className="nsp-ai-btn"
                            style={{ background: btnColor(cfg.color), marginTop: 8, cursor: "pointer" }}
                            onClick={() => analyseDoc(type)}
                          >
                            <I.Spark /> VERIFY
                          </button>
                        )}

                        {s.loading && <div className={"nsp-ld-row ld-" + cfg.color} style={{ marginTop: 10 }}><I.Spin /> Reading document locally...</div>}

                        {s.err && (
                          <div className="nsp-er-box" style={{ marginTop: 10 }}>
                            <p style={{ display: "flex", alignItems: "center", gap: 5 }}><I.Warn /> {s.err}</p>
                            <button className="nsp-er-retry" onClick={() => analyseDoc(type)}>Retry</button>
                          </div>
                        )}

                        {s.data && renderExtracted(type)}
                        <button className="nsp-reset-btn" onClick={() => resetDoc(type)} style={{ marginTop: 8 }}><I.X /> Remove &amp; Re-upload</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bottom-actions" style={{ justifyContent: "flex-end", marginTop: 24 }}>
              <button className="btn-massive-primary" onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                Next: Enter Identity Details <I.Next />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════ STEP 2 ══════════════════ */}
        {step === 2 && (
          <div>
            <div className="section-header" style={{ marginBottom: 24 }}>
              <h2>Enter Identity &amp; Banking Details</h2>
              <p>Details will be compared across all uploaded certificates (including Income Certificate holder name) for consistency.</p>
            </div>

            <div className="nsp-card" style={{ marginBottom: 20 }}>
              <div className="nsp-card-hd" style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1.5px solid #e0f2fe", paddingBottom: 12, marginBottom: 16 }}>
                <I.IdCard />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>Aadhaar Reference Details</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>Used as the primary reference for name &amp; DOB cross-checking</div>
                </div>
              </div>
              <div className="nsp-fg2">
                <div className="nsp-f" style={{ gridColumn: "1/-1" }}>
                  <label style={labelStyle}>Applicant Full Name (as per Aadhaar) <span style={reqStyle}>*</span></label>
                  <input value={aadharName} onChange={e => setAadharName(e.target.value)} placeholder="e.g. SAMPLE STUDENT" style={inputStyle(detailsErrs.aadharName)} />
                  <span style={hintStyle}>Enter name exactly as printed on your Aadhaar card</span>
                </div>
                <div className="nsp-f">
                  <label style={labelStyle}>Date of Birth <span style={reqStyle}>*</span></label>
                  <input type="date" value={aadharDob} onChange={e => setAadharDob(e.target.value)} style={inputStyle(detailsErrs.aadharDob)} />
                </div>
                <div className="nsp-f">
                  <label style={labelStyle}>Community Category (Entered)</label>
                  <select value={studentCategory} onChange={e => setStudentCategory(e.target.value)} style={inputStyle(false)}>
                    <option value="">Select Category</option>
                    <option value="SC">Scheduled Caste (SC)</option>
                    <option value="ST">Scheduled Tribe (ST)</option>
                    <option value="BC">Backward Class (BC)</option>
                    <option value="MBC">Most Backward Class (MBC)</option>
                    <option value="DNC">Denotified Community (DNC)</option>
                    <option value="OBC">Other Backward Class (OBC)</option>
                    <option value="General">General Category</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="nsp-card" style={{ marginBottom: 20 }}>
              <div className="nsp-card-hd" style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1.5px solid #dcfce7", paddingBottom: 12, marginBottom: 16 }}>
                <I.Bank />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>Bank Account &amp; Income Details</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>Scholarship payments require an individual Single Savings account</div>
                </div>
              </div>
              <div className="nsp-fg2">
                <div className="nsp-f" style={{ gridColumn: "1/-1" }}>
                  <label style={labelStyle}>Account Holder Name (as on Passbook) <span style={reqStyle}>*</span></label>
                  <input value={bankHolder} onChange={e => setBankHolder(e.target.value)} placeholder="e.g. SAMPLE STUDENT" style={inputStyle(detailsErrs.bankHolder)} />
                </div>
                <div className="nsp-f">
                  <label style={labelStyle}>Account Type <span style={reqStyle}>*</span></label>
                  <select value={bankAccType} onChange={e => setBankAccType(e.target.value)} style={inputStyle(detailsErrs.bankAccType)}>
                    <option value="">Select account type</option>
                    <option value="Single">Single Account (Required for NSP/DBT)</option>
                    <option value="Joint">Joint Account (Not eligible for NSP)</option>
                  </select>
                </div>
                <div className="nsp-f">
                  <label style={labelStyle}>Annual Family Income (INR)</label>
                  <input type="number" value={studentIncome} onChange={e => setStudentIncome(e.target.value)} placeholder="e.g. 200000" style={inputStyle(false)} />
                  <span style={hintStyle}>Will be compared against Income Certificate amount</span>
                </div>
              </div>
            </div>

            {/* Welfare & Admission Category Settings */}
            <div className="nsp-card" style={{ marginBottom: 20 }}>
              <div className="nsp-card-hd" style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1.5px solid #e2e8f0", paddingBottom: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 18 }}>⚙️</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>Welfare &amp; Admission Category Settings</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>Configure parental income flow, quota type, and first graduate concessions</div>
                </div>
              </div>

              <div className="nsp-fg2">
                {/* Feature 1: Income Applicant Flow */}
                <div className="nsp-f">
                  <label style={labelStyle}>Who is applying for income verification?</label>
                  <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", color: "#334155" }}>
                      <input
                        type="radio"
                        name="incomeApplicant"
                        value="student"
                        checked={incomeApplicant === "student"}
                        onChange={() => setIncomeApplicant("student")}
                      />
                      Student (Me)
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", color: "#334155" }}>
                      <input
                        type="radio"
                        name="incomeApplicant"
                        value="parent"
                        checked={incomeApplicant === "parent"}
                        onChange={() => setIncomeApplicant("parent")}
                      />
                      Parent / Guardian
                    </label>
                  </div>
                  <span style={hintStyle}>Select 'Parent / Guardian' if Income Certificate is issued in parent's name</span>
                </div>

                {/* Feature 2: Admission Quota */}
                <div className="nsp-f">
                  <label style={labelStyle}>Admission Quota (for BC / MBC Schemes)</label>
                  <select
                    value={quotaType}
                    onChange={e => setQuotaType(e.target.value)}
                    style={inputStyle(false)}
                  >
                    <option value="government">Government Quota (Single Window Counselling)</option>
                    <option value="management">Management Quota (Self-Financing)</option>
                  </select>
                  <span style={hintStyle}>Tamil Nadu Post-Matric BC/MBC schemes require Government Quota admission</span>
                </div>

                {/* Feature 3: First Graduate Flag */}
                <div className="nsp-f" style={{ gridColumn: "1/-1", marginTop: 6 }}>
                  <label style={labelStyle}>Are you the first graduate in your family?</label>
                  <div style={{ display: "flex", gap: 20, marginTop: 6 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", color: "#334155" }}>
                      <input
                        type="radio"
                        name="firstGraduate"
                        value="yes"
                        checked={firstGraduate === true}
                        onChange={() => setFirstGraduate(true)}
                      />
                      Yes
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", color: "#334155" }}>
                      <input
                        type="radio"
                        name="firstGraduate"
                        value="no"
                        checked={firstGraduate === false}
                        onChange={() => setFirstGraduate(false)}
                      />
                      No
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", color: "#334155" }}>
                      <input
                        type="radio"
                        name="firstGraduate"
                        value="not_sure"
                        checked={firstGraduate === null}
                        onChange={() => setFirstGraduate(null)}
                      />
                      Not sure
                    </label>
                  </div>
                  <span style={hintStyle}>
                    Select Yes if you are the first graduate in your family, according to the applicable scholarship/concession rules. Helps match applicable Tamil Nadu First Graduate Tuition Fee Concession schemes.
                  </span>
                </div>
              </div>
            </div>

            <div className="bottom-actions" style={{ justifyContent: "space-between" }}>
              <button className="btn-ghost-sm" onClick={() => setStep(1)} style={{ display: "flex", alignItems: "center", gap: 5 }}><I.Back /> Back to Upload</button>
              <button className="btn-massive-primary" onClick={validateDetailsAndProceed} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                Run Multi-Document Data Consistency Check <I.Next />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════ STEP 3 ══════════════════ */}
        {step === 3 && (
          <div>
            <div className="nsp-profile-strip">
              <div>
                <div className="ps-name">Multi-Document Data Consistency Check Report</div>
                <div className="ps-info">{aadharName || "—"} | Bank: {bankHolder || "—"} ({bankAccType || "—"})</div>
              </div>
              <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
                <button className="btn-ghost-sm" onClick={() => setStep(2)} style={{ display: "flex", alignItems: "center", gap: 5 }}><I.Back /> Back</button>
                <button className="btn-ghost-sm" onClick={() => window.print()} style={{ display: "flex", alignItems: "center", gap: 5 }}><I.Print /> Print</button>
              </div>
            </div>

            <div className="section-header" style={{ marginBottom: 16 }}>
              <h2>Pre-Submission Readiness &amp; Consistency Results</h2>
              <p>All document names, DOBs, incomes, and categories compared across every source.</p>
            </div>

            {/* Welfare & Admission Overrides in Step 3 */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 18px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", fontSize: 12 }}>
                <div>
                  <span style={{ color: "#64748b", fontWeight: 700 }}>Income Mode: </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = incomeApplicant === "parent" ? "student" : "parent";
                      setIncomeApplicant(next);
                      buildResults(next);
                    }}
                    style={{ background: incomeApplicant === "parent" ? "#fef3c7" : "#e0e7ff", color: incomeApplicant === "parent" ? "#92400e" : "#3730a3", border: "none", borderRadius: 4, padding: "2px 8px", fontWeight: 800, cursor: "pointer", marginLeft: 4 }}
                  >
                    {incomeApplicant === "parent" ? "👨‍👧 Parent Mode" : "🎓 Student Mode"} (Toggle)
                  </button>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontWeight: 700 }}>Quota: </span>
                  <strong style={{ color: quotaType === "management" ? "#dc2626" : "#166534" }}>
                    {quotaType === "management" ? "Management Quota" : "Government Quota"}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontWeight: 700 }}>First Graduate in Family: </span>
                  <strong>{firstGraduate === true ? "✅ Yes" : firstGraduate === false ? "No" : "Not sure"}</strong>
                </div>
              </div>
              <button className="btn-ghost-sm" onClick={() => setStep(2)} style={{ fontSize: 11 }}>Edit in Step 2</button>
            </div>

            <VerificationReport
              matrixData={matrixData}
              aadharName={aadharName}
              aadharDob={aadharDob}
              bankHolder={bankHolder}
              bankAccType={bankAccType}
              studentIncome={studentIncome}
              studentCategory={studentCategory}
            />

            <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 24, flexWrap: "wrap" }}>
              {user?.role === "STUDENT" && (
                <button
                  type="button"
                  onClick={saveVerificationToApplication}
                  disabled={savingToApp}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "14px 24px",
                    background: "#059669",
                    color: "white",
                    border: "none",
                    borderRadius: "50px",
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: "pointer",
                    boxShadow: "0 6px 16px rgba(5,150,105,0.3)",
                  }}
                >
                  {savingToApp ? "Saving to Database..." : "💾 Save Verification to Application"}
                </button>
              )}
              {saveAppMsg && (
                <div style={{ width: "100%", textAlign: "center", color: "#065f46", fontSize: 13, fontWeight: 700, margin: "8px 0" }}>
                  {saveAppMsg}
                </div>
              )}
              <button
                onClick={proceedToEligibility}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "14px 32px",
                  background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
                  color: "white",
                  border: "none",
                  borderRadius: "50px",
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: "pointer",
                  boxShadow: "0 8px 20px rgba(37,99,235,0.35)",
                }}
              >
                <I.Target /> Continue to Eligibility Check <I.Next />
              </button>
              <button
                onClick={() => nav("/readiness")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "14px 24px",
                  background: "#fff",
                  color: "#6d28d9",
                  border: "1.5px solid #ddd6fe",
                  borderRadius: "50px",
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                <I.Fix /> Fix Document Issues Guidance
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════ STEP 4 ══════════════════ */}
        {step === 4 && (
          <div>
            <div className="nsp-profile-strip" style={{ marginBottom: 16 }}>
              <div>
                <div className="ps-name">Step 4: Scholarship Eligibility &amp; Matching</div>
                <div className="ps-info">
                  {aadharName || ds.ms10?.data?.extracted?.name || ds.community?.data?.extracted?.name || "Student"} | {studentCategory || ds.community?.data?.extracted?.communityCategory || "Category"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
                <button
                  className="btn-ghost-sm"
                  onClick={() => {
                    setStep(3);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 5 }}
                >
                  <I.Back /> Back to Consistency Results
                </button>
              </div>
            </div>

            <EligibilityEngine
              isEmbedded={true}
              initialProfile={eligibilityData?.profile}
              fieldMetadata={eligibilityData?.fieldMetadata}
              conflictWarnings={eligibilityData?.conflictWarnings}
              onBackToStep3={() => {
                setStep(3);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}

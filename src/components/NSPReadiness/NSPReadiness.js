import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { scholarships as allScholarships } from "../../knowledge/scholarships.js";
import { mergeWithNSPMetadata, getSchemeDocumentChecklist } from "../../knowledge/nspSchemes.js";
import { computeNSPReadiness } from "../../engine/nspReadinessEngine.js";
import { evaluateScholarship } from "../../engine/eligibilityEngine.js";
import "./NSPReadiness.css";

// ─── Step Configuration ───────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Select Scheme" },
  { id: 2, label: "Your Profile" },
  { id: 3, label: "Eligibility" },
  { id: 4, label: "Documents" },
  { id: 5, label: "Readiness Score" },
];

// ─── Default Profile ──────────────────────────────────────────────────────────

const defaultProfile = {
  studentName: "",
  dob: "",
  gender: "",
  category: "",
  community: "",
  state: "",
  domicile: "",
  district: "",
  income: "",
  incomeApplicant: "student",
  parentName: "",
  course: "",
  level: "Undergraduate",
  courseLevel: "Undergraduate",
  institutionType: "Regular",
  institution: "",
  academicYear: "2026-27",
  yearOfStudy: "1st Year",
  percentage: "",
  quotaType: "unknown",
  firstGraduate: null,
  disability: false,
  disabilityPercentage: null,
  armedForcesRelationship: null,
  otrGenerated: null,
  faceAuthDeviceAvailable: null,
};

// ─── Score Colour Helpers ─────────────────────────────────────────────────────

function getScoreColor(score, max) {
  const pct = max > 0 ? score / max : 0;
  if (pct >= 0.9) return "#10b981";
  if (pct >= 0.75) return "#f59e0b";
  if (pct >= 0.5)  return "#f97316";
  return "#ef4444";
}

function getDimIcon(key) {
  const icons = {
    identity: "🪪",
    documents: "📄",
    eligibility: "🎯",
    application: "📊",
    bank: "🏦",
    certificates: "📜",
  };
  return icons[key] || "✦";
}

// ─── Step 1: Select Scheme ────────────────────────────────────────────────────

function Step1SelectScheme({ selectedSchemeId, onSelect }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const filters = ["All", "Central / NSP", "Tamil Nadu", "Other States"];

  const filteredSchemes = useMemo(() => {
    return allScholarships.filter(s => {
      const matchesSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.state || "").toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        filter === "All" ||
        (filter === "Central / NSP" && s.state === "All-India") ||
        (filter === "Tamil Nadu" && s.state === "Tamil Nadu") ||
        (filter === "Other States" && s.state !== "All-India" && s.state !== "Tamil Nadu");

      return matchesSearch && matchesFilter;
    });
  }, [search, filter]);

  const getRuleTag = (id) => {
    const verified = [
      "nsp-central-sector","nsp-pm-yasasvi","nsp-minority-postmatric",
      "nsp-aicte-pragati","nsp-aicte-saksham",
      "tn-post-matric-bc-mbc","tn-post-matric-sc-st","tn-first-graduate",
    ];
    const partial = ["tn-bc-mbc-free-education"];
    if (verified.includes(id)) return { label: "✓ Verified", cls: "verified" };
    if (partial.includes(id)) return { label: "~ Partial", cls: "partial" };
    return null;
  };

  return (
    <div className="nsp-step-card">
      <h2>Select a Scholarship Scheme</h2>
      <p>Choose the scholarship you are preparing to apply for. SGP will generate a readiness check specific to that scheme.</p>

      <div className="nsp-scheme-search">
        <span className="nsp-scheme-search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search schemes by name or state…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="nsp-filter-pills">
        {filters.map(f => (
          <button
            key={f}
            className={`nsp-filter-pill ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {filteredSchemes.length === 0 ? (
        <div className="nsp-no-results">No schemes match your search. Try a different keyword.</div>
      ) : (
        <div className="nsp-scheme-list">
          {filteredSchemes.map(s => {
            const tag = getRuleTag(s.id);
            const isCentral = s.state === "All-India";
            const isTN = s.state === "Tamil Nadu";
            return (
              <div
                key={s.id}
                className={`nsp-scheme-item ${selectedSchemeId === s.id ? "selected" : ""}`}
                onClick={() => onSelect(s.id)}
              >
                <div className="nsp-scheme-item-info">
                  <div className="nsp-scheme-item-name">{s.name}</div>
                  <div className="nsp-scheme-item-meta">
                    <span className={`nsp-scheme-tag ${isCentral ? "central" : isTN ? "state" : ""}`}>
                      {s.state}
                    </span>
                    <span className="nsp-scheme-tag">{s.category}</span>
                    {tag && <span className={`nsp-scheme-tag ${tag.cls}`}>{tag.label}</span>}
                  </div>
                </div>
                <div style={{ fontSize: 18, color: selectedSchemeId === s.id ? "#a5b4fc" : "rgba(165,180,252,0.25)" }}>
                  {selectedSchemeId === s.id ? "●" : "○"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Profile Entry ────────────────────────────────────────────────────

function Step2Profile({ profile, onChange, scheme }) {
  const set = (key, val) => onChange({ ...profile, [key]: val });

  const showQuota = scheme?.requiresGovtQuota;
  const showFirstGrad = scheme?.requiresFirstGraduate;

  return (
    <div className="nsp-step-card">
      <h2>Enter Your Profile</h2>
      <p>Provide your details to check eligibility and generate your readiness score.</p>

      <div className="nsp-form-grid">
        <div className="nsp-form-group">
          <label>Student Name *</label>
          <input
            type="text"
            placeholder="As it appears on Aadhaar"
            value={profile.studentName}
            onChange={e => set("studentName", e.target.value)}
          />
        </div>

        <div className="nsp-form-group">
          <label>Date of Birth</label>
          <input
            type="text"
            placeholder="DD/MM/YYYY"
            value={profile.dob}
            onChange={e => set("dob", e.target.value)}
          />
        </div>

        <div className="nsp-form-group">
          <label>Gender</label>
          <select value={profile.gender} onChange={e => set("gender", e.target.value)}>
            <option value="">— Not specified —</option>
            <option value="Boys">Male</option>
            <option value="Girls">Female</option>
          </select>
        </div>

        <div className="nsp-form-group">
          <label>Category / Community *</label>
          <select value={profile.category} onChange={e => set("category", e.target.value)}>
            <option value="">— Select category —</option>
            <option value="SC">SC (Scheduled Caste)</option>
            <option value="ST">ST (Scheduled Tribe)</option>
            <option value="BC">BC (Backward Class)</option>
            <option value="MBC">MBC (Most Backward Class)</option>
            <option value="OBC">OBC (Other Backward Class)</option>
            <option value="EBC">EBC (Economically Backward Class)</option>
            <option value="DNT">DNT (De-Notified Tribe)</option>
            <option value="Minority">Minority Community</option>
            <option value="General">General / Open</option>
            <option value="EWS">EWS (Economically Weaker Section)</option>
          </select>
        </div>

        <div className="nsp-form-group">
          <label>State of Domicile *</label>
          <select value={profile.state} onChange={e => set("state", e.target.value)}>
            <option value="">— Select state —</option>
            <option value="Tamil Nadu">Tamil Nadu</option>
            <option value="Andhra Pradesh">Andhra Pradesh</option>
            <option value="Telangana">Telangana</option>
            <option value="Karnataka">Karnataka</option>
            <option value="Kerala">Kerala</option>
            <option value="Maharashtra">Maharashtra</option>
            <option value="Uttar Pradesh">Uttar Pradesh</option>
            <option value="West Bengal">West Bengal</option>
            <option value="Bihar">Bihar</option>
            <option value="Gujarat">Gujarat</option>
            <option value="Delhi">Delhi</option>
            <option value="Rajasthan">Rajasthan</option>
            <option value="Madhya Pradesh">Madhya Pradesh</option>
            <option value="Other">Other State</option>
          </select>
        </div>

        <div className="nsp-form-group">
          <label>Annual Family Income (₹) *</label>
          <input
            type="number"
            placeholder="e.g. 150000"
            value={profile.income}
            onChange={e => set("income", e.target.value ? Number(e.target.value) : "")}
            min="0"
          />
        </div>

        <div className="nsp-form-group">
          <label>Course / Programme</label>
          <select value={profile.course} onChange={e => set("course", e.target.value)}>
            <option value="">— Select course —</option>
            <option value="Engineering">Engineering (B.E. / B.Tech)</option>
            <option value="MBBS">Medical (MBBS)</option>
            <option value="Arts">Arts (B.A.)</option>
            <option value="Science">Science (B.Sc.)</option>
            <option value="Commerce">Commerce (B.Com.)</option>
            <option value="Law">Law (B.L. / LLB)</option>
            <option value="Agriculture">Agriculture (B.Sc. Agri)</option>
            <option value="Polytechnic">Polytechnic / Diploma</option>
            <option value="ITI">ITI</option>
            <option value="School">School (Class 9–12)</option>
            <option value="Postgraduate">Post-Graduation (PG)</option>
          </select>
        </div>

        <div className="nsp-form-group">
          <label>Institution Type</label>
          <select value={profile.institutionType} onChange={e => set("institutionType", e.target.value)}>
            <option value="">— Not specified —</option>
            <option value="Government">Government Institution</option>
            <option value="Government Aided">Government Aided</option>
            <option value="Self-Finance">Self-Financing (Private)</option>
          </select>
        </div>

        {/* Income Mode — Parent / Student */}
        <div className="nsp-income-mode full-width">
          <label>Who is providing the income information?</label>
          <div className="nsp-radio-group">
            <label
              className={`nsp-radio-option ${profile.incomeApplicant === "student" ? "selected" : ""}`}
              onClick={() => set("incomeApplicant", "student")}
            >
              <input type="radio" name="incomeApplicant" value="student" readOnly checked={profile.incomeApplicant === "student"} />
              👤 Student's own income
            </label>
            <label
              className={`nsp-radio-option ${profile.incomeApplicant === "parent" ? "selected" : ""}`}
              onClick={() => set("incomeApplicant", "parent")}
            >
              <input type="radio" name="incomeApplicant" value="parent" readOnly checked={profile.incomeApplicant === "parent"} />
              👨‍👩‍👧 Parent / Guardian income
            </label>
          </div>
          {profile.incomeApplicant === "parent" && (
            <div className="nsp-parent-mode-note">
              ℹ️ Your parent/guardian is providing the income information. <strong>You remain the scholarship applicant.</strong> The parent name will not be compared as a student identity mismatch.
            </div>
          )}
        </div>

        {profile.incomeApplicant === "parent" && (
          <div className="nsp-form-group full-width">
            <label>Parent / Guardian Name (on income certificate)</label>
            <input
              type="text"
              placeholder="Name as it appears on income certificate"
              value={profile.parentName}
              onChange={e => set("parentName", e.target.value)}
            />
          </div>
        )}

        {showQuota && (
          <div className="nsp-form-group">
            <label>Admission Quota *</label>
            <select value={profile.quotaType} onChange={e => set("quotaType", e.target.value)}>
              <option value="unknown">— Not confirmed —</option>
              <option value="government">Government Quota (single-window counseling)</option>
              <option value="management">Management Quota</option>
            </select>
          </div>
        )}

        {showFirstGrad && (
          <div className="nsp-form-group">
            <label>First Graduate in Family? *</label>
            <select
              value={profile.firstGraduate === null ? "" : String(profile.firstGraduate)}
              onChange={e => {
                const v = e.target.value;
                set("firstGraduate", v === "" ? null : v === "true");
              }}
            >
              <option value="">— Not answered —</option>
              <option value="true">Yes — first graduate in family</option>
              <option value="false">No — family member has graduated</option>
            </select>
          </div>
        )}

        {/* 2026 Mandatory NSP OTR & Face-Authentication Readiness Tracker */}
        {(scheme?.jurisdiction === "CENTRAL" || scheme?.portal === "NSP" || scheme?.state === "All-India") && (
          <div style={{ gridColumn: "1 / -1", marginTop: 16, padding: "14px 16px", borderRadius: 10, background: "rgba(30, 41, 59, 0.7)", border: "1.5px solid rgba(99, 102, 241, 0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>📱</span>
              <strong style={{ fontSize: 13, color: "#e2e8f0" }}>2026 Mandatory NSP Compliance (OTR &amp; Face-Auth)</strong>
            </div>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 12px 0", lineHeight: 1.5 }}>
              NSP OTR Tracker: Please ensure you have generated your official One-Time Registration (OTR) number via the official NSP portal. Face-Authentication must be executed via the official AadhaarFaceRD mobile framework.
            </p>
            <div className="nsp-form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="nsp-form-group">
                <label style={{ fontSize: 11.5 }}>Official 14-Digit NSP OTR Generated?</label>
                <select
                  value={profile.otrGenerated === null ? "" : String(profile.otrGenerated)}
                  onChange={e => {
                    const v = e.target.value;
                    set("otrGenerated", v === "" ? null : v === "true");
                  }}
                >
                  <option value="">— Not yet confirmed —</option>
                  <option value="true">Yes — OTR number generated</option>
                  <option value="false">No — Not yet registered on NSP</option>
                </select>
              </div>
              <div className="nsp-form-group">
                <label style={{ fontSize: 11.5 }}>Access to Android/iOS with AadhaarFaceRD?</label>
                <select
                  value={profile.faceAuthDeviceAvailable === null ? "" : String(profile.faceAuthDeviceAvailable)}
                  onChange={e => {
                    const v = e.target.value;
                    set("faceAuthDeviceAvailable", v === "" ? null : v === "true");
                  }}
                >
                  <option value="">— Unsure / Check later —</option>
                  <option value="true">Yes — Smartphone with AadhaarFaceRD ready</option>
                  <option value="false">No — Smartphone with camera unavailable</option>
                </select>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "rgba(148, 163, 184, 0.8)", marginTop: 8, fontStyle: "italic" }}>
              ℹ️ SGP does not simulate or perform face recognition or OTR registration. These official steps must be performed on the official NSP portal / AadhaarFaceRD app.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 3: Eligibility Check ────────────────────────────────────────────────

function Step3Eligibility({ profile, scheme }) {
  const result = useMemo(() => {
    if (!scheme) return null;
    return evaluateScholarship(scheme, profile);
  }, [scheme, profile]);

  if (!result) return <div className="nsp-empty">No scheme selected.</div>;

  const statusMap = {
    "CONFIRMED MATCH": { cls: "confirmed", icon: "✅", title: "Confirmed Match", sub: "You appear to meet all stated eligibility criteria." },
    "POTENTIAL MATCH": { cls: "potential", icon: "🟡", title: "Potential Match", sub: "Most criteria pass — some unconfirmed details remain." },
    "NEEDS MORE INFORMATION": { cls: "needs-info", icon: "⚠️", title: "Needs More Information", sub: "Required information is missing to confirm eligibility." },
    "NOT MATCHED": { cls: "not-matched", icon: "🚫", title: "Not Matched", sub: "One or more eligibility criteria failed." },
  };

  const info = statusMap[result.status] || statusMap["NEEDS MORE INFORMATION"];

  return (
    <div className="nsp-step-card">
      <h2>Eligibility Check</h2>
      <p>Based on your profile against <strong style={{ color: "#a5b4fc" }}>{scheme.name}</strong>.</p>

      <div className={`nsp-elig-result ${info.cls}`}>
        <div className="nsp-elig-icon">{info.icon}</div>
        <div className="nsp-elig-text">
          <h3>{info.title}</h3>
          <p>{info.sub}</p>
        </div>
      </div>

      <div className="nsp-criteria-list">
        {(result.evaluations || []).map((ev, i) => {
          const icon = ev.status === "PASSED" ? "✓" : ev.status === "FAILED" ? "✗" : "⚠";
          const color = ev.status === "PASSED" ? "#10b981" : ev.status === "FAILED" ? "#ef4444" : "#f59e0b";
          return (
            <div className="nsp-criterion" key={i}>
              <div className="nsp-criterion-icon" style={{ color }}>{icon}</div>
              <div>
                <div className="nsp-criterion-name">{ev.criterion}</div>
                <div className="nsp-criterion-detail">{ev.reason}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="nsp-rule-note">
        <strong>SGP Note:</strong> "Potentially eligible based on the information provided." SGP is a pre-submission readiness system. This result does not guarantee scholarship approval or constitute official eligibility verification.
      </div>
    </div>
  );
}

// ─── Step 4: Document Checklist ───────────────────────────────────────────────

function Step4Documents({ scheme }) {
  const checklist = useMemo(() => {
    if (!scheme) return null;
    const merged = mergeWithNSPMetadata(scheme);
    return getSchemeDocumentChecklist(merged);
  }, [scheme]);

  if (!checklist) return <div className="nsp-empty">No scheme selected.</div>;

  const statusLabel = checklist.ruleStatus === "VERIFIED"
    ? { label: "Source Verified", cls: "verified" }
    : checklist.ruleStatus === "PARTIALLY_VERIFIED"
    ? { label: "Partially Verified", cls: "partial" }
    : { label: "Rule Unverified — Guidance Only", cls: "partial" };

  return (
    <div className="nsp-step-card">
      <h2>Document Checklist</h2>
      <p>Documents required for <strong style={{ color: "#a5b4fc" }}>{scheme.name}</strong>.</p>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
        <span className={`nsp-scheme-tag ${statusLabel.cls}`}>{statusLabel.label}</span>
        <span className="nsp-scheme-tag">{checklist.academicYear}</span>
        {checklist.stateOnly && <span className="nsp-scheme-tag state">{checklist.stateOnly} only</span>}
      </div>

      <div className="nsp-doc-section-title">Required Documents</div>
      <div className="nsp-doc-list">
        {checklist.required.map((doc, i) => (
          <div className="nsp-doc-item" key={i}>
            <div className="nsp-doc-icon required">📋</div>
            <div className="nsp-doc-body">
              <div className="nsp-doc-label">{doc.label}</div>
              <div className="nsp-doc-purpose">{doc.purpose}</div>
              {doc.notes && <div className="nsp-doc-notes">{doc.notes}</div>}
            </div>
          </div>
        ))}
      </div>

      {checklist.optional.length > 0 && (
        <>
          <div className="nsp-doc-section-title">Optional / If Applicable</div>
          <div className="nsp-doc-list">
            {checklist.optional.map((doc, i) => (
              <div className="nsp-doc-item" key={i}>
                <div className="nsp-doc-icon optional">📎</div>
                <div className="nsp-doc-body">
                  <div className="nsp-doc-label">{doc.label}</div>
                  <div className="nsp-doc-purpose">{doc.purpose}</div>
                  {doc.notes && <div className="nsp-doc-notes">{doc.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {checklist.quotaNote && (
        <div className="nsp-rule-note">
          <strong>Quota Rule:</strong> {checklist.quotaNote}
        </div>
      )}

      {checklist.firstGraduateNote && (
        <div className="nsp-rule-note">
          <strong>First Graduate:</strong> {checklist.firstGraduateNote}
        </div>
      )}

      {checklist.sourceUrl && (
        <div style={{ marginTop: 12 }}>
          <a
            href={checklist.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="nsp-source-badge"
          >
            🔗 Official Source — {checklist.sourceUrl}
          </a>
        </div>
      )}

      <div className="nsp-rule-note" style={{ marginTop: 16 }}>
        <strong>Note:</strong> SGP cannot verify document authenticity. This checklist is based on published government sources and is provided as a readiness guide only.
      </div>
    </div>
  );
}

// ─── Step 5: Readiness Score ──────────────────────────────────────────────────

function Step5Score({ profile, scheme }) {
  const result = useMemo(() => {
    if (!scheme) return null;
    // Provide empty documentData — user can upload documents via Document Upload module
    return computeNSPReadiness(profile, scheme, {});
  }, [profile, scheme]);

  if (!result) return <div className="nsp-empty">No scheme selected.</div>;

  const {
    readinessScore,
    readinessLevelInfo,
    riskItems,
    boundaryStatement,
    applicationComparison,
    documentMatrix,
  } = result;
  const scoreColor = readinessLevelInfo?.color || "#6366f1";
  const breakdown = readinessScore.breakdown;

  return (
    <div className="nsp-step-card">
      {/* SGP Pre-Submission Check Badge */}
      <div style={{ background: "rgba(30, 41, 59, 0.85)", border: "1.5px solid rgba(148, 163, 184, 0.25)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, textAlign: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#38bdf8", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>
          🛡️ SGP PRE-SUBMISSION CHECK
        </div>
        <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.5 }}>
          This result is a readiness assessment, not an official government verification or approval decision. SGP does not replace government verification.
        </div>
      </div>

      <h2>NSP Readiness Score</h2>
      <p>Pre-submission readiness for <strong style={{ color: "#a5b4fc" }}>{scheme.name}</strong>.</p>

      {/* Score Hero */}
      <div className="nsp-score-hero">
        <div
          className="nsp-score-circle"
          style={{ borderColor: scoreColor, color: scoreColor }}
        >
          <div className="nsp-score-number">{readinessScore.total}</div>
          <div className="nsp-score-max">/ {readinessScore.max}</div>
        </div>

        <div
          className="nsp-level-badge"
          style={{
            color: scoreColor,
            borderColor: scoreColor,
            background: readinessLevelInfo?.bgColor,
          }}
        >
          {readinessLevelInfo?.icon} {readinessLevelInfo?.label}
        </div>

        <p style={{ fontSize: 13, color: "rgba(165,180,252,0.7)", margin: "8px 0 12px" }}>
          {readinessLevelInfo?.description}
        </p>

        <div className="nsp-boundary-note">{boundaryStatement}</div>
      </div>

      {/* Score Breakdown Grid */}
      <div className="nsp-breakdown-grid">
        {Object.entries(breakdown).map(([key, dim]) => {
          const color = getScoreColor(dim.score, dim.max);
          const pct = dim.max > 0 ? (dim.score / dim.max) * 100 : 0;
          return (
            <div className="nsp-breakdown-box" key={key}>
              <div className="nsp-breakdown-label">
                {getDimIcon(key)} {dim.label}
              </div>
              <div className="nsp-breakdown-score" style={{ color }}>
                {dim.score}
              </div>
              <div className="nsp-breakdown-max">/ {dim.max}</div>
              <div className="nsp-breakdown-bar">
                <div
                  className="nsp-breakdown-bar-fill"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
              {dim.lostPoints > 0 && (
                <div className="nsp-lost-points-tag">
                  -{dim.lostPoints} pts (check attention items)
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Risk Items */}
      <div className="nsp-risk-section-title">
        Attention Items ({riskItems.length})
        {result.highAttentionCount > 0 && (
          <span style={{ marginLeft: 10, color: "#fca5a5", fontSize: 13 }}>
            {result.highAttentionCount} High
          </span>
        )}
        {result.mediumAttentionCount > 0 && (
          <span style={{ marginLeft: 8, color: "#fcd34d", fontSize: 13 }}>
            {result.mediumAttentionCount} Medium
          </span>
        )}
      </div>

      {riskItems.length === 0 ? (
        <div className="nsp-risk-empty">
          ✅ No attention items found. Review the official portal and proceed to apply!
        </div>
      ) : (
        <div className="nsp-risk-list">
          {riskItems.map((item, i) => {
            const severityIcon = item.severity === "HIGH_ATTENTION"
              ? "🔴" : item.severity === "MEDIUM_ATTENTION" ? "🟡" : "🔵";
            const needsOfficialConfirmation =
              item.id.includes("UNKNOWN") ||
              item.id.includes("AADHAAR") ||
              item.id.includes("OTR") ||
              item.id.includes("RULE_UNVERIFIED");

            return (
              <div className={`nsp-risk-item ${item.severity}`} key={i}>
                <div className="nsp-risk-severity">{severityIcon}</div>
                <div className="nsp-risk-body">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <div className="nsp-risk-title">{item.title}</div>
                    {needsOfficialConfirmation && (
                      <span style={{ fontSize: "10.5px", fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
                        Official confirmation required
                      </span>
                    )}
                  </div>
                  <div className="nsp-risk-detail">{item.detail}</div>
                  <div className="nsp-risk-action">💡 {item.action}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Application vs Document Comparison */}
      {applicationComparison && applicationComparison.length > 0 && (
        <div className="nsp-comparison-card">
          <div className="nsp-comparison-title">
            📄 Application Data vs. Document Evidence
          </div>
          <div className="nsp-comparison-subtitle">
            Cross-checks entered application fields against extracted certificate evidence. Check original documents before applying.
          </div>
          <div className="nsp-comp-table-wrap">
            <table className="nsp-comp-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Application Data</th>
                  <th>Document Evidence</th>
                  <th>Status</th>
                  <th>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {applicationComparison.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{row.field}</td>
                    <td>{row.applicationValue}</td>
                    <td style={{ color: "#c7d2fe" }}>{row.documentEvidence}</td>
                    <td>
                      <span className={`nsp-status-pill ${row.status}`}>
                        {row.status === "MATCH" ? "✓ MATCH" : row.status === "MINOR_DIFFERENCE" ? "⚠ MINOR" : row.status === "MISMATCH" ? "✕ MISMATCH" : "— MISSING"}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: "rgba(226,232,240,0.8)" }}>{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Document Comparison Matrix */}
      {documentMatrix && (
        <div className="nsp-comparison-card">
          <div className="nsp-comparison-title">
            📋 Cross-Document Consistency Matrix
          </div>
          <div className="nsp-comparison-subtitle">
            Overview of field consistency across all uploaded certificates.
          </div>
          <div className="nsp-matrix-grid">
            <div className="nsp-matrix-box">
              <div className="nsp-matrix-box-title">🪪 Identity Consistency</div>
              <div className="nsp-matrix-item"><span className="nsp-matrix-item-label">Aadhaar Name:</span> <span>{documentMatrix.identity?.name?.aadhaar || "—"}</span></div>
              <div className="nsp-matrix-item"><span className="nsp-matrix-item-label">10th Name:</span> <span>{documentMatrix.identity?.name?.tenth || "—"}</span></div>
              <div className="nsp-matrix-item"><span className="nsp-matrix-item-label">Status:</span> <span style={{ color: documentMatrix.identity?.name?.status === "MATCH" ? "#34d399" : "#f87171" }}>{documentMatrix.identity?.name?.status}</span></div>
            </div>
            <div className="nsp-matrix-box">
              <div className="nsp-matrix-box-title">💰 Financial / Income</div>
              <div className="nsp-matrix-item"><span className="nsp-matrix-item-label">Provider Role:</span> <span>{documentMatrix.financial?.incomeProvider?.role === "parent" ? "Parent / Guardian" : "Student"}</span></div>
              <div className="nsp-matrix-item"><span className="nsp-matrix-item-label">Certificate Holder:</span> <span>{documentMatrix.financial?.incomeProvider?.certName || "—"}</span></div>
              <div className="nsp-matrix-item"><span className="nsp-matrix-item-label">Validity:</span> <span style={{ color: documentMatrix.financial?.validity?.expired ? "#f87171" : "#34d399" }}>{documentMatrix.financial?.validity?.expired ? "Expired (>1 yr)" : "Current"}</span></div>
            </div>
            <div className="nsp-matrix-box">
              <div className="nsp-matrix-box-title">🏦 Bank &amp; DBT Mapping</div>
              <div className="nsp-matrix-item"><span className="nsp-matrix-item-label">Account Holder:</span> <span>{documentMatrix.bank?.accountHolderName?.value || "—"}</span></div>
              <div className="nsp-matrix-item"><span className="nsp-matrix-item-label">IFSC Code:</span> <span>{documentMatrix.bank?.ifsc?.value || "—"}</span></div>
              <div className="nsp-matrix-item"><span className="nsp-matrix-item-label">IFSC Format:</span> <span style={{ color: documentMatrix.bank?.ifsc?.isValidFormat ? "#34d399" : "#fbbf24" }}>{documentMatrix.bank?.ifsc?.isValidFormat ? "Valid" : "Check Passbook"}</span></div>
            </div>
            <div className="nsp-matrix-box">
              <div className="nsp-matrix-box-title">📍 Residence &amp; Domicile</div>
              <div className="nsp-matrix-item"><span className="nsp-matrix-item-label">State:</span> <span>{documentMatrix.residence?.state?.value || "—"}</span></div>
              <div className="nsp-matrix-item"><span className="nsp-matrix-item-label">Domicile:</span> <span>{documentMatrix.residence?.domicile?.value || "—"}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Official Portal Link */}
      <div style={{ marginTop: 28, textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "rgba(165,180,252,0.6)", marginBottom: 14 }}>
          Once all attention items are resolved, proceed to the official scholarship portal.
        </p>
        <a
          href={scheme.sourceUrl || scheme.officialPortal || "https://scholarships.gov.in"}
          target="_blank"
          rel="noopener noreferrer"
          className="nsp-btn nsp-btn-nsp-link"
          style={{ display: "inline-flex" }}
        >
          🌐 Open Official Portal — {scheme.sourceUrl || scheme.officialPortal || "scholarships.gov.in"}
        </a>
      </div>
    </div>
  );
}

// ─── Main NSPReadiness Component ──────────────────────────────────────────────

export default function NSPReadiness() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedSchemeId, setSelectedSchemeId] = useState(null);
  const [profile, setProfile] = useState(defaultProfile);

  const selectedScheme = useMemo(() => {
    if (!selectedSchemeId) return null;
    return allScholarships.find(s => s.id === selectedSchemeId) || null;
  }, [selectedSchemeId]);

  const canProceed = useMemo(() => {
    if (step === 1) return !!selectedSchemeId;
    if (step === 2) return !!profile.studentName && !!profile.category && !!profile.state;
    return true;
  }, [step, selectedSchemeId, profile]);

  const handleNext = () => {
    if (step < 5 && canProceed) setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1);
    else navigate("/dashboard");
  };

  return (
    <div className="nsp-page">
      {/* Header */}
      <header className="nsp-header">
        <div className="nsp-header-inner">
          <div className="nsp-header-brand">
            <div className="nsp-header-icon">🇮🇳</div>
            <div>
              <div className="nsp-header-title">Prepare for NSP</div>
              <div className="nsp-header-subtitle">All-India Scholarship Pre-Submission Readiness</div>
            </div>
          </div>
          <button className="nsp-back-btn" onClick={() => navigate("/dashboard")}>
            ← Dashboard
          </button>
        </div>
      </header>

      <div className="nsp-container">
        {/* Hero */}
        <div className="nsp-hero">
          <div className="nsp-hero-badge">🎓 All-India · Pre-Submission · Offline</div>
          <h1>NSP Scholarship Readiness Check</h1>
          <p>
            Identify document gaps, eligibility issues, and application inconsistencies
            <strong> before</strong> submitting to the National Scholarship Portal.
          </p>
          <div className="nsp-hero-disclaimer">
            ⚠️ SGP is a pre-submission readiness guide, not an official NSP application portal. Always apply on the official NSP portal: scholarships.gov.in
          </div>
        </div>

        {/* Step Navigator */}
        <div className="nsp-steps">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`nsp-step-item ${step === s.id ? "active" : step > s.id ? "completed" : ""}`}
            >
              <div className="nsp-step-circle">
                {step > s.id ? "✓" : s.id}
              </div>
              <div className="nsp-step-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Step Content */}
        {step === 1 && (
          <Step1SelectScheme
            selectedSchemeId={selectedSchemeId}
            onSelect={id => { setSelectedSchemeId(id); }}
          />
        )}
        {step === 2 && (
          <Step2Profile
            profile={profile}
            onChange={setProfile}
            scheme={selectedScheme}
          />
        )}
        {step === 3 && (
          <Step3Eligibility profile={profile} scheme={selectedScheme} />
        )}
        {step === 4 && (
          <Step4Documents scheme={selectedScheme} />
        )}
        {step === 5 && (
          <Step5Score profile={profile} scheme={selectedScheme} />
        )}

        {/* Navigation */}
        <div className="nsp-nav-buttons">
          <button className="nsp-btn nsp-btn-secondary" onClick={handleBack}>
            ← {step === 1 ? "Dashboard" : "Back"}
          </button>
          {step < 5 && (
            <button
              className="nsp-btn nsp-btn-primary"
              onClick={handleNext}
              disabled={!canProceed}
            >
              {step === 4 ? "View Readiness Score →" : "Next →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

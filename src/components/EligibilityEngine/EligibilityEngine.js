import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import LanguageSelector from "../LanguageSelector/LanguageSelector";
import "./EligibilityEngine.css";
import { SCHOLARSHIP_SCHEMES, matchScholarshipSchemes } from "../../data/scholarshipSchemes";
import { scholarships } from "../../knowledge/scholarships";
import { evaluateAllScholarships } from "../../engine/eligibilityEngine";
import { buildUnifiedProfile } from "../../adapters/profileAdapter";

const MINORITY_LABELS = ["Muslim", "Sikh", "Christian", "Buddhist", "Zoroastrian", "Jain"];
function normalizeCommunity(raw) {
  const c = (raw || "").toUpperCase().trim();
  if (MINORITY_LABELS.map(x => x.toUpperCase()).includes(c)) return "MIN";
  return c;
}

function checkEligibility(form) {
  return matchScholarshipSchemes({
    income: form.income,
    community: normalizeCommunity(form.community),
    course: form.course,
    armedForces: form.armedForces,
  });
}

function getDisplayAmount(scheme, course) {
  if (scheme.amountType === "tiered")
    return course === "pg" ? `₹${scheme.amountPG.toLocaleString("en-IN")}/yr` : `₹${scheme.amountUG.toLocaleString("en-IN")}/yr`;
  if (scheme.amountType === "fixed")  return "₹2,000–₹2,250/mo";
  if (scheme.amountType === "full")   return "Full support";
  return `₹${scheme.amountMin.toLocaleString("en-IN")}–${scheme.amountMax.toLocaleString("en-IN")}/yr`;
}

function getBaseAmount(scheme, course) {
  if (scheme.amountType === "tiered") return course === "pg" ? scheme.amountPG : scheme.amountUG;
  if (scheme.amountType === "fixed")  return scheme.amountBoys;
  if (scheme.amountType === "full")   return scheme.amountMin;
  return Math.round((scheme.amountMin + scheme.amountMax) / 2);
}

const COMMUNITY_OPTIONS = [
  { label: "SC", value: "SC" }, { label: "ST", value: "ST" },
  { label: "BC", value: "BC" }, { label: "MBC", value: "MBC" },
  { label: "DNC/DNT", value: "DNC" }, { label: "OBC", value: "OBC" },
  { label: "EBC", value: "EBC" }, { label: "General", value: "GEN" },
  { label: "Muslim", value: "Muslim" }, { label: "Christian", value: "Christian" },
  { label: "Sikh", value: "Sikh" }, { label: "Buddhist", value: "Buddhist" },
];
const COURSE_OPTIONS = [
  { label: "UG", value: "ug" }, { label: "PG", value: "pg" },
  { label: "Diploma", value: "diploma" }, { label: "ITI", value: "iti" },
  { label: "Ph.D", value: "phd" },
];
const YEAR_OPTIONS = ["1st", "2nd", "3rd", "4th"];

function EligibilityEngine({
  initialProfile = null,
  fieldMetadata = null,
  conflictWarnings = [],
  onBackToStep3 = null,
  isEmbedded = false,
}) {
  const navigate = useNavigate();
  const [isExiting, setIsExiting] = useState(false);
  const [step, setStep]           = useState("form");
  const [form, setForm]           = useState(() => ({
    name: initialProfile?.name || "",
    community: initialProfile?.community || "",
    income: initialProfile?.income !== undefined && initialProfile?.income !== null ? String(initialProfile.income) : "",
    course: initialProfile?.course || "",
    currentYear: initialProfile?.currentYear || "",
    armedForces: initialProfile?.armedForces || "no",
    incomeApplicant: initialProfile?.incomeApplicant || "student",
    quotaType: initialProfile?.quotaType || "government",
    firstGraduate: initialProfile?.firstGraduate !== undefined ? initialProfile.firstGraduate : null,
  }));
  const [errors, setErrors]             = useState({});
  const [eligible, setEligible]         = useState([]);
  const [evaluationResults, setEvaluationResults] = useState([]);

  // Sync with initialProfile if provided and form is untouched
  React.useEffect(() => {
    if (initialProfile) {
      setForm(prev => ({
        name: prev.name || initialProfile.name || "",
        community: prev.community || initialProfile.community || "",
        income: prev.income || (initialProfile.income !== undefined && initialProfile.income !== null ? String(initialProfile.income) : ""),
        course: prev.course || initialProfile.course || "",
        currentYear: prev.currentYear || initialProfile.currentYear || "",
        armedForces: prev.armedForces || initialProfile.armedForces || "no",
        incomeApplicant: initialProfile.incomeApplicant || prev.incomeApplicant || "student",
        quotaType: initialProfile.quotaType || prev.quotaType || "government",
        firstGraduate: initialProfile.firstGraduate !== undefined ? initialProfile.firstGraduate : prev.firstGraduate,
      }));
    }
  }, [initialProfile]);

  const handleNavigation = (path) => { setIsExiting(true); setTimeout(() => navigate(path), 500); };

  const validate = () => {
    const e = {};
    if (!form.name.trim())   e.name      = "Name is required";
    if (!form.community)     e.community = "Select a community";
    if (!form.income || isNaN(form.income) || parseInt(form.income) < 0) e.income = "Enter valid annual income";
    if (!form.course)        e.course    = "Select a course";
    if (!form.currentYear)   e.currentYear = "Select current year";
    return e;
  };

  const handleCheck = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});

    // 1. Run basic scheme matches with financial projection calculations
    const basicMatches = checkEligibility(form);
    setEligible(basicMatches);

    // 2. Run multi-criteria eligibility engine using statutory rules on 25 schemes
    const unifiedProf = buildUnifiedProfile({
      name: form.name,
      studentName: form.name,
      parentName: initialProfile?.parentName,
      community: form.community,
      category: form.community,
      income: parseInt(form.income, 10),
      course: form.course === "ug" ? "Engineering" : form.course === "diploma" ? "Diploma" : form.course,
      level: form.course,
      armedForces: form.armedForces,
      district: initialProfile?.district,
      state: initialProfile?.state,
      marks10: initialProfile?.marks10,
      marks12: initialProfile?.marks12,
      incomeApplicant: form.incomeApplicant,
      quotaType: form.quotaType,
      firstGraduate: form.firstGraduate,
    });

    const evals = evaluateAllScholarships(scholarships, unifiedProf);
    setEvaluationResults(evals);

    setStep("result");
    if (isEmbedded) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleReset = () => {
    setStep("form");
    setEligible([]);
    setEvaluationResults([]);
    if (initialProfile) {
      setForm({
        name: initialProfile.name || "",
        community: initialProfile.community || "",
        income: initialProfile.income !== undefined && initialProfile.income !== null ? String(initialProfile.income) : "",
        course: "",
        currentYear: "",
        armedForces: "no",
        incomeApplicant: initialProfile.incomeApplicant || "student",
        quotaType: initialProfile.quotaType || "government",
        firstGraduate: !!initialProfile.firstGraduate,
      });
    } else {
      setForm({ name:"", community:"", income:"", course:"", currentYear:"", armedForces:"no", incomeApplicant:"student", quotaType:"government", firstGraduate:false });
    }
  };

  const yearsLeft      = { "1st":4, "2nd":3, "3rd":2, "4th":1 };
  const remainingYears = yearsLeft[form.currentYear] || 4;
  const currentYearNum = { "1st":1, "2nd":2, "3rd":3, "4th":4 }[form.currentYear] || 1;

  return (
    <div className={`eligibility-page ${isEmbedded ? "is-embedded-step" : (isExiting ? "is-exiting-down" : "is-entering-up")}`}>

      {/* BG Animations — only when standalone */}
      {!isEmbedded && (
        <div className="dashboard-bg-animations">
          <div className="out-shape out-blob blob-1"></div>
          <div className="out-shape out-blob blob-2"></div>
          <div className="out-shape out-ring ring-out-1"></div>
          <div className="out-shape out-ring ring-out-2"></div>
          <div className="out-shape out-ring ring-out-3"></div>
          <div className="out-shape out-cross cross-out-1">+</div>
          <div className="out-shape out-cross cross-out-2">+</div>
          <div className="out-shape out-cross cross-out-3">+</div>
          <div className="out-shape out-triangle tri-out-1"></div>
          <div className="out-shape out-triangle tri-out-2"></div>
          <div className="out-shape out-triangle tri-out-3"></div>
          <div className="out-shape out-text squig-out-1">~</div>
          <div className="out-shape out-text squig-out-2">~</div>
          <div className="out-shape out-text squig-out-3">~</div>
          <div className="out-shape out-dot dot-out-1"></div>
          <div className="out-shape out-dot dot-out-2"></div>
          <div className="out-shape out-dot dot-out-3"></div>
          <div className="out-shape out-dot dot-out-4"></div>
        </div>
      )}

      {/* HEADER — only when standalone */}
      {!isEmbedded && (
        <header className="pro-header">
          <div className="header-shape shape-1"></div>
          <div className="header-shape shape-2"></div>
          <div className="header-container">
            <div className="header-brand">
              <div className="brand-icon">🎯</div>
              <div className="brand-text">
                <h1>Eligibility Engine</h1>
                <p>Potentially Matching Scholarship Schemes</p>
              </div>
            </div>
            <div className="header-actions">
              <button className="btn-pro-back" onClick={() => handleNavigation("/dashboard")}> 
                Back To Dashboard
              </button>
              <LanguageSelector />
            </div>
          </div>
        </header>
      )}

      <main className={`eligibility-container ${isEmbedded ? "is-embedded-container" : ""}`} style={isEmbedded ? { maxWidth: "100%", padding: "10px 0" } : {}}>

        {/* ══════════ FORM ══════════ */}
        {step === "form" && (
          <>
            <div className="section-header">
              <h2>Find Matching Scholarships</h2>
              <p>Enter or confirm your details to check potentially matching government scholarship schemes ({SCHOLARSHIP_SCHEMES.length} maintained schemes).</p>
            </div>

            {/* Document Conflict Warnings (if any) */}
            {conflictWarnings && conflictWarnings.length > 0 && (
              <div className="conflict-warnings-box" style={{ marginBottom: "20px" }}>
                {conflictWarnings.map((w, idx) => (
                  <div key={idx} style={{
                    background: w.type === "danger" ? "#fef2f2" : "#fffbeb",
                    border: `1.5px solid ${w.type === "danger" ? "#fca5a5" : "#fde68a"}`,
                    borderRadius: "10px",
                    padding: "10px 16px",
                    marginBottom: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "12px",
                    color: w.type === "danger" ? "#991b1b" : "#92400e"
                  }}>
                    <span style={{ fontSize: "16px" }}>{w.type === "danger" ? "⚠️" : "ℹ️"}</span>
                    <div><strong>{w.type === "danger" ? "Document Notice:" : "Verification Note:"}</strong> {w.message}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Information Ready for Eligibility Check (Section 8) */}
            {isEmbedded && fieldMetadata && (
              <div className="ready-info-panel" style={{
                background: "#ffffff",
                border: "1.5px solid #e2e8f0",
                borderRadius: "14px",
                padding: "18px 22px",
                marginBottom: "22px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.03)"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
                  <div>
                    <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                      📋 Information Ready for Eligibility Check
                    </h3>
                    <p style={{ fontSize: "11.5px", color: "#64748b", margin: "2px 0 0 0" }}>
                      Safe extracted fields from uploaded documents. You can review or edit any value below before matching.
                    </p>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 800, padding: "3px 10px", borderRadius: "20px", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" }}>
                    ✓ Auto-Filled
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "10px" }}>
                  <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 700 }}>Student Full Name</div>
                    <div style={{ fontSize: "12.5px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>{form.name || "—"}</div>
                    <div style={{ fontSize: "10px", color: "#059669", marginTop: "4px", fontWeight: 700 }}>✓ From {fieldMetadata?.name?.source || "uploaded documents"}</div>
                  </div>

                  <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 700 }}>Community Category</div>
                    <div style={{ fontSize: "12.5px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>{form.community || "—"}</div>
                    <div style={{ fontSize: "10px", color: "#059669", marginTop: "4px", fontWeight: 700 }}>✓ From {fieldMetadata?.community?.source || "certificate"}</div>
                  </div>

                  <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 700 }}>Annual Family Income</div>
                    <div style={{ fontSize: "12.5px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                      {form.income ? `₹${parseInt(form.income, 10).toLocaleString("en-IN")}` : "—"}
                    </div>
                    <div style={{ fontSize: "10px", color: "#059669", marginTop: "4px", fontWeight: 700 }}>✓ From {fieldMetadata?.income?.source || "certificate"}</div>
                  </div>

                  {fieldMetadata?.marks10?.value && (
                    <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 700 }}>10th Percentage</div>
                      <div style={{ fontSize: "12.5px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>{fieldMetadata.marks10.value}</div>
                      <div style={{ fontSize: "10px", color: "#059669", marginTop: "4px", fontWeight: 700 }}>✓ From 10th Marksheet</div>
                    </div>
                  )}

                  {fieldMetadata?.marks12?.value && (
                    <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 700 }}>12th Percentage</div>
                      <div style={{ fontSize: "12.5px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>{fieldMetadata.marks12.value}</div>
                      <div style={{ fontSize: "10px", color: "#059669", marginTop: "4px", fontWeight: 700 }}>✓ From 12th Marksheet</div>
                    </div>
                  )}

                  <div style={{ background: form.course ? "#f8fafc" : "#fffbeb", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${form.course ? "#e2e8f0" : "#fde68a"}` }}>
                    <div style={{ fontSize: "10.5px", color: form.course ? "#64748b" : "#92400e", fontWeight: 700 }}>Course Level</div>
                    <div style={{ fontSize: "12.5px", fontWeight: 800, color: form.course ? "#0f172a" : "#b45309", marginTop: "2px" }}>
                      {form.course ? form.course.toUpperCase() : "Not provided"}
                    </div>
                    <div style={{ fontSize: "10px", color: form.course ? "#059669" : "#b45309", marginTop: "4px", fontWeight: 700 }}>
                      {form.course ? "✓ Selected" : "→ Please select below"}
                    </div>
                  </div>

                  <div style={{ background: form.currentYear ? "#f8fafc" : "#fffbeb", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${form.currentYear ? "#e2e8f0" : "#fde68a"}` }}>
                    <div style={{ fontSize: "10.5px", color: form.currentYear ? "#64748b" : "#92400e", fontWeight: 700 }}>Current Year of Study</div>
                    <div style={{ fontSize: "12.5px", fontWeight: 800, color: form.currentYear ? "#0f172a" : "#b45309", marginTop: "2px" }}>
                      {form.currentYear ? `${form.currentYear} Year` : "Not provided"}
                    </div>
                    <div style={{ fontSize: "10px", color: form.currentYear ? "#059669" : "#b45309", marginTop: "4px", fontWeight: 700 }}>
                      {form.currentYear ? "✓ Selected" : "→ Please select below"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TOP DISCLAIMER BANNER ── */}
            <div className="top-disc-banner">
              <div className="tdb-left">
                <span className="tdb-warn-icon">⚠️</span>
                <div>
                  <p className="tdb-heading">Indicative Guidance — Pre-Submission Check</p>
                  <p className="tdb-sub">
                    Matches are indicative and based on entered criteria.
                    Actual eligibility and award confirmation is determined officially on <strong>National Scholarship Portal (NSP)</strong> or <strong>UMIS</strong>.
                  </p>
                </div>
              </div>
              <div className="tdb-chips">
                <span className="tdb-chip chip-orange">📋 Results are indicative estimates</span>
                <span className="tdb-chip chip-blue">🌐 NSP — Central schemes</span>
                <span className="tdb-chip chip-purple">🏛️ UMIS — TN State schemes</span>
              </div>
            </div>

            <div className="elig-form-card glass-panel">

              <div className="elig-field">
                <label>Full Name</label>
                <input type="text" placeholder="e.g. Sample Student" value={form.name}
                  onChange={e => setForm({...form, name:e.target.value})}
                  className={errors.name ? "input-error" : ""} />
                {errors.name && <span className="err-msg">{errors.name}</span>}
              </div>

              <div className="elig-field">
                <label>Community / Category</label>
                <div className="pill-group">
                  {COMMUNITY_OPTIONS.map(c => (
                    <button key={c.value} className={`pill-btn ${form.community===c.value?"pill-active":""}`}
                      onClick={() => setForm({...form, community:c.value})}>{c.label}</button>
                  ))}
                </div>
                {errors.community && <span className="err-msg">{errors.community}</span>}
              </div>

              <div className="elig-field">
                <label>Annual Family Income (₹)</label>
                <input type="number" placeholder="e.g. 150000" value={form.income}
                  onChange={e => setForm({...form, income:e.target.value})}
                  className={errors.income ? "input-error" : ""} />
                <span className="field-hint">
                  SC / ST — up to ₹2.5 Lakh &nbsp;|&nbsp; OBC — up to ₹1 Lakh &nbsp;|&nbsp; Others — up to ₹4.5 Lakh
                </span>
                {errors.income && <span className="err-msg">{errors.income}</span>}
              </div>

              <div className="elig-field">
                <label>Course Level</label>
                <div className="pill-group">
                  {COURSE_OPTIONS.map(c => (
                    <button key={c.value} className={`pill-btn ${form.course===c.value?"pill-active":""}`}
                      onClick={() => setForm({...form, course:c.value})}>{c.label}</button>
                  ))}
                </div>
                {errors.course && <span className="err-msg">{errors.course}</span>}
              </div>

              <div className="elig-field">
                <label>Current Year of Study</label>
                <div className="pill-group">
                  {YEAR_OPTIONS.map(y => (
                    <button key={y} className={`pill-btn ${form.currentYear===y?"pill-active":""}`}
                      onClick={() => setForm({...form, currentYear:y})}>{y} Year</button>
                  ))}
                </div>
                {errors.currentYear && <span className="err-msg">{errors.currentYear}</span>}
              </div>

              <div className="elig-field">
                <label>Ward of Armed Forces / Police / CRPF?</label>
                <div className="pill-group">
                  {["yes","no"].map(v => (
                    <button key={v} className={`pill-btn ${form.armedForces===v?"pill-active":""}`}
                      onClick={() => setForm({...form, armedForces:v})}>{v==="yes"?"Yes":"No"}</button>
                  ))}
                </div>
              </div>

              <div className="elig-field">
                <label>Admission Quota (for BC / MBC Schemes)</label>
                <div className="pill-group">
                  <button
                    type="button"
                    className={`pill-btn ${form.quotaType === "government" ? "pill-active" : ""}`}
                    onClick={() => setForm({ ...form, quotaType: "government" })}
                  >
                    Government Quota
                  </button>
                  <button
                    type="button"
                    className={`pill-btn ${form.quotaType === "management" ? "pill-active" : ""}`}
                    onClick={() => setForm({ ...form, quotaType: "management" })}
                  >
                    Management Quota
                  </button>
                </div>
              </div>

              <div className="elig-field">
                <label>Are you the first graduate in your family?</label>
                <div className="pill-group">
                  <button
                    type="button"
                    className={`pill-btn ${form.firstGraduate === true ? "pill-active" : ""}`}
                    onClick={() => setForm({ ...form, firstGraduate: true })}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className={`pill-btn ${form.firstGraduate === false ? "pill-active" : ""}`}
                    onClick={() => setForm({ ...form, firstGraduate: false })}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    className={`pill-btn ${form.firstGraduate === null ? "pill-active" : ""}`}
                    onClick={() => setForm({ ...form, firstGraduate: null })}
                  >
                    Not sure
                  </button>
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary, #64748b)", marginTop: "4px" }}>
                  Select Yes if you are the first graduate in your family, according to the applicable scholarship/concession rules. Helps match applicable Tamil Nadu First Graduate Tuition Fee Concession schemes.
                </div>
              </div>

              <button className="btn-massive-primary check-btn" onClick={handleCheck}>
                🔍 Check Potential Eligibility
              </button>

              {isEmbedded && onBackToStep3 && (
                <div style={{ marginTop: "14px", textAlign: "center" }}>
                  <button type="button" className="btn-glass-secondary" onClick={onBackToStep3} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    ← Back to Consistency Results
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ══════════ RESULT ══════════ */}
        {step === "result" && (
          <>
            <div className="section-header">
              <h2>Potentially Matching Scholarships</h2>
              <p>For <strong>{form.name}</strong> — {form.community} | {form.course.toUpperCase()} | ₹{parseInt(form.income, 10).toLocaleString("en-IN")}</p>
            </div>

            {/* Verified strip */}
            <div className="criteria-section glass-panel">
              <div className="section-title">
                <span className="section-icon">✅</span>
                <h3>Submitted Criteria</h3>
              </div>
              <div className="criteria-grid">
                {[["NAME",form.name.toUpperCase()],["COMMUNITY",form.community],
                  ["INCOME",`₹${parseInt(form.income, 10).toLocaleString("en-IN")}`],
                  ["COURSE",form.course.toUpperCase()],["YEAR",form.currentYear]
                ].map(([lbl,val]) => (
                  <div key={lbl} className="criteria-item">
                    <span className="label">{lbl}</span>
                    <span className={`value ${lbl==="INCOME"?"text-green":""}`}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Count / no-match */}
            {eligible.length > 0 ? (
              <div className="match-count-banner">
                <span className="match-icon">🎯</span>
                <span>
                  <strong>{eligible.length} Potential Scheme{eligible.length>1?"s":""} Matched</strong>
                  {" "}— Based on income, community, and academic criteria. Final eligibility must be submitted and confirmed on NSP / UMIS.
                </span>
              </div>
            ) : (
              <div className="pro-warning-banner glass-panel no-eligibility">
                <div className="warning-icon-wrapper"><span>⚠️</span></div>
                <div className="warning-text">
                  <strong>No Matching Schemes Found in Database</strong>
                  <p>Your income or community criteria did not match the {SCHOLARSHIP_SCHEMES.length} maintained schemes in our database. Please check the official NSP and UMIS portals directly for additional state or specialized schemes.</p>
                </div>
              </div>
            )}

            {/* Scheme cards */}
            <div className="scholarships-section">
              {eligible.map((scheme) => {
                const baseAmt = getBaseAmount(scheme, form.course);
                const evalItem = evaluationResults.find(ev =>
                  ev.scholarship?.id === scheme.id ||
                  ev.scholarship?.name?.toLowerCase() === scheme.name?.toLowerCase() ||
                  (ev.scholarship?.name?.includes("BC") && scheme.id === "tn-bc-mbc")
                );
                const whyList = evalItem?.passedCriteria && evalItem.passedCriteria.length > 0
                  ? evalItem.passedCriteria
                  : [`Category appears to match: ${form.community}`, `Income within threshold (≤ ₹${scheme.maxIncome?.toLocaleString("en-IN")})`, `Course level matched`];
                const stillReqList = evalItem?.missingRequirements && evalItem.missingRequirements.length > 0
                  ? evalItem.missingRequirements
                  : ["Confirm current study year enrollment", "Confirm institution AISHE/UMIS eligibility"];
                const docsList = scheme.requiredDocuments || evalItem?.scholarship?.documents || [];
                const matchStatus = evalItem?.matchType === "CONFIRMED MATCH" ? "CONFIRMED MATCH" : "POTENTIAL MATCH";

                return (
                  <div key={scheme.id} className="scheme-result-card" style={{ borderLeftColor: scheme.color }}>

                    <div className="src-header" style={{ background: scheme.color + "10" }}>
                      <div className="src-icon" style={{ background: scheme.color + "20", color: scheme.color }}>{scheme.icon}</div>
                      <div className="src-title">
                        <h3>{scheme.name}</h3>
                        <p>{scheme.provider}</p>
                      </div>
                      <div className="src-badges">
                        <span className="badge-portal" style={{ background: scheme.color + "20", color: scheme.color }}>{scheme.portal}</span>
                        {evalItem?.scholarship?.quota === "govt-only" && (
                          <span className="badge-portal" style={{ background: "#e0e7ff", color: "#3730a3", fontWeight: 700 }}>
                            🏛️ Govt Quota Only
                          </span>
                        )}
                        {(evalItem?.scholarship?.requiresFirstGraduate || evalItem?.scholarship?.id === "tn-first-graduate") && (
                          <span className="badge-portal" style={{ background: "#fdf2f8", color: "#9d174d", fontWeight: 700 }}>
                            🎓 First-Gen Only
                          </span>
                        )}
                        <span className="badge-status" style={{ background: matchStatus === "CONFIRMED MATCH" ? "#dcfce7" : "#fef9c3", color: matchStatus === "CONFIRMED MATCH" ? "#166534" : "#854d0e" }}>
                          {matchStatus === "CONFIRMED MATCH" ? "✅ Confirmed Match" : "⚡ Potential Match"}
                        </span>
                      </div>
                    </div>

                    <div className="src-amount-note" style={{ borderLeftColor: scheme.color }}>
                      <span className="amt-label">💰 Estimated Amount</span>
                      <span className="amt-value">{scheme.amountNote}</span>
                    </div>

                    {/* Why Matched Breakdown (Section 13) */}
                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "10px 14px", margin: "14px 20px 0 20px", fontSize: "12px" }}>
                      <strong style={{ color: "#166534", display: "block", marginBottom: "4px" }}>Why it matched:</strong>
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px", color: "#15803d" }}>
                        {whyList.map((item, idx) => (
                          <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span>✓</span> <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Still Required Breakdown (Section 13) */}
                    {stillReqList.length > 0 && (
                      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "10px 14px", margin: "8px 20px 0 20px", fontSize: "12px" }}>
                        <strong style={{ color: "#92400e", display: "block", marginBottom: "4px" }}>Still required for official confirmation:</strong>
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px", color: "#b45309" }}>
                          {stillReqList.map((item, idx) => (
                            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span>•</span> <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Required Documents List */}
                    {docsList.length > 0 && (
                      <div style={{ margin: "10px 20px 0 20px", padding: "8px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "11px", color: "#475569" }}>
                        <strong>Required Documents:</strong> {docsList.slice(0, 4).join(" • ")}{docsList.length > 4 ? ` • +${docsList.length - 4} more` : ""}
                      </div>
                    )}

                    <div className="src-body">
                      <div className="breakdown-label">📅 4-Year Estimated Projection</div>
                      <div className="year-breakdown">
                        {[1,2,3,4].map(yn => {
                          const isPast    = yn < currentYearNum;
                          const isCurrent = yn === currentYearNum;
                          return (
                            <div key={yn} className={`year-cell ${isCurrent?"year-current":""} ${isPast?"year-past":""}`}>
                              <div className="year-label">Year {yn}</div>
                              <div className="year-amount">
                                {isPast
                                  ? <span className="past-text">—</span>
                                  : <span style={{ color: isCurrent ? scheme.color : "#1e293b", fontSize:"12px" }}>
                                      {getDisplayAmount(scheme, form.course)}
                                    </span>
                                }
                              </div>
                              {isCurrent && <div className="current-tag" style={{ background: scheme.color }}>Now</div>}
                            </div>
                          );
                        })}
                      </div>

                      <div className="src-summary">
                        {[
                          ["Per Year (est.)",   `₹${baseAmt.toLocaleString("en-IN")}`,               scheme.color],
                          ["Remaining Yrs",     `${remainingYears} yr${remainingYears>1?"s":""}`,     null],
                          ["Remaining (est.)",  `₹${(baseAmt*remainingYears).toLocaleString("en-IN")}`, scheme.color],
                          ["4-Yr Total (est.)", `₹${(baseAmt*4).toLocaleString("en-IN")}`,           scheme.color],
                        ].map(([lbl,val,clr], i, arr) => (
                          <React.Fragment key={lbl}>
                            <div className="summary-item">
                              <span>{lbl}</span>
                              <strong style={clr ? { color: clr } : {}}>{val}</strong>
                            </div>
                            {i < arr.length-1 && <div className="summary-divider"></div>}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    <div className="src-footer" style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", justifyContent: "space-between" }}>
                      <span className="apply-note">
                        Apply via <strong>{scheme.portal==="NSP"?"scholarships.gov.in":"umis.tn.gov.in"}</strong>
                      </span>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button
                          className="apply-btn"
                          style={{ background: "#1e293b" }}
                          onClick={() => navigate(`/student/application?scheme=${encodeURIComponent(scheme.name || scheme.id)}`)}
                        >
                          📋 Track in SGP Portal
                        </button>
                        <button className="apply-btn" style={{ background: scheme.color }}
                          onClick={() => window.open(scheme.officialUrl,"_blank","noopener,noreferrer")}>
                          Apply on {scheme.portal} →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Result page compact reminder */}
            <div className="result-reminder-strip">
              ⚠️ <strong>Indicative results only.</strong> Official application and document verification must be completed on <strong>NSP</strong> or <strong>UMIS</strong>.
            </div>

            <div className="action-buttons">
              <button className="btn-massive-primary" onClick={handleReset}>🔄 Check Again</button>
              {isEmbedded && onBackToStep3 ? (
                <button className="btn-glass-secondary" onClick={onBackToStep3}>← Back to Consistency Results</button>
              ) : (
                <button className="btn-glass-secondary" onClick={() => handleNavigation("/dashboard")}>← Dashboard</button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default EligibilityEngine;


import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import LanguageSelector from "../LanguageSelector/LanguageSelector";
import "./RenewalAlert.css";

const scholarships = [
  {
    name: "NSP Post-Matric Scholarship",
    authority: "Ministry of Education / State Govt.",
    deadline: "October - November (Every Year)",
    renewalDoc: "Marksheet, Income Certificate, Bank Passbook",
    icon: "Scholarship",
    color: "#3b82f6",
  },
  {
    name: "NSP Pre-Matric Scholarship",
    authority: "Ministry of Social Justice & Empowerment",
    deadline: "September - October (Every Year)",
    renewalDoc: "Previous Year Marksheet, Caste Certificate",
    icon: "Book",
    color: "#8b5cf6",
  },
  {
    name: "Merit-cum-Means Scholarship",
    authority: "Ministry of Minority Affairs",
    deadline: "September - October (Every Year)",
    renewalDoc: "Marksheet (60%+ required), Income Proof",
    icon: "Award",
    color: "#f59e0b",
  },
  {
    name: "Central Sector Scheme (CSS)",
    authority: "Ministry of Education",
    deadline: "October - November (Every Year)",
    renewalDoc: "College Bonafide Certificate, Marksheet",
    icon: "Scheme",
    color: "#10b981",
  },
  {
    name: "State Government Scholarships (UMIS etc.)",
    authority: "State Welfare / SC-ST / OBC Dept.",
    deadline: "Varies by State (Aug - Nov)",
    renewalDoc: "Caste Certificate, Income, Marksheet, Bank DBT",
    icon: "State",
    color: "#ec4899",
  },
];

const renewalRules = [
  {
    icon: "Attendance",
    title: "Minimum Attendance Requirement",
    desc: "Students must have a minimum of 75% attendance in the previous academic year. Scholarships can be cancelled if attendance falls below this threshold.",
    color: "#fef2f2",
    accent: "#dc2626",
  },
  {
    icon: "Marks",
    title: "Minimum Marks / Pass Criteria",
    desc: "Most scholarships require students to have passed their previous year exams. Merit-cum-Means requires 60%+. Failing a year may impact renewal eligibility under scheme rules.",
    color: "#fff7ed",
    accent: "#ea580c",
  },
  {
    icon: "DBT",
    title: "DBT-Enabled Bank Account Required",
    desc: "Renewal payment will only be credited to a DBT-enabled Aadhaar-seeded bank account. Ensure NPCI mapping is active before renewal submission.",
    color: "#fef9c3",
    accent: "#ca8a04",
  },
  {
    icon: "Income",
    title: "Fresh Income Certificate Required",
    desc: "Income certificates older than 1 year are typically flagged for correction or expired status during renewal. Obtain a fresh certificate from the Tahsildar/Revenue Department before applying.",
    color: "#f0fdf4",
    accent: "#16a34a",
  },
  {
    icon: "Portal",
    title: "Same Portal as Original Application",
    desc: "Renewals must be submitted on the same portal where the original application was made - NSP for central scholarships, state portals for state scholarships.",
    color: "#eff6ff",
    accent: "#2563eb",
  },
  {
    icon: "Verify",
    title: "Institute Verification Is Mandatory",
    desc: "After submitting renewal, the college/institute must verify and forward the application. Pending institute verification is one of the most common causes of renewal failure.",
    color: "#f5f3ff",
    accent: "#7c3aed",
  },
];

const steps = [
  { num: "01", icon: "Docs", title: "Gather Required Documents", desc: "Collect marksheet, income certificate (fresh), caste certificate, Aadhaar, bank passbook, and bonafide letter from your college." },
  { num: "02", icon: "DBT", title: "Verify Your DBT Status", desc: "Confirm your bank account is Aadhaar-seeded and DBT-enabled with NPCI mapping before starting the renewal form." },
  { num: "03", icon: "Login", title: "Login to the Portal", desc: "Go to scholarships.gov.in (NSP) or your state portal (UMIS, etc.) and login with your application ID and password from the original application." },
  { num: "04", icon: "Form", title: "Fill the Renewal Form", desc: "Select 'Renewal Application', verify pre-filled details, update academic year, marks, and upload fresh documents as required." },
  { num: "05", icon: "Submit", title: "Submit & Get Acknowledgement", desc: "Submit the form and download the acknowledgement receipt. Note your renewal application number for future tracking." },
  { num: "06", icon: "Institute", title: "Institute Verification", desc: "Visit your college admin or remind the scholarship coordinator to verify and forward your renewal on the portal before the deadline." },
];

const faqs = [
  {
    q: "Will my scholarship automatically renew every year?",
    a: "No. Government scholarships do not auto-renew. You must manually apply for renewal on the NSP or state scholarship portal every academic year within the deadline period.",
  },
  {
    q: "What happens if I miss the renewal deadline?",
    a: "If you miss the deadline, your scholarship for that year will lapse. Some portals allow late submission with institute approval, but this is not guaranteed. Always apply early.",
  },
  {
    q: "Can I renew if I got a back paper or failed a subject?",
    a: "It depends on the scholarship. Most central scholarships require a full pass. Some state scholarships may allow renewal with a backlog if the student is promoted. Check your specific scheme rules.",
  },
  {
    q: "Do I need to submit physical documents for renewal?",
    a: "For NSP, renewal is mostly online with scanned uploads. However, your institute may collect physical copies for their records. Check with your college scholarship coordinator.",
  },
  {
    q: "My bank account changed - what do I do during renewal?",
    a: "Update your bank details on the portal before submitting renewal. Ensure the new account is also DBT-enabled and Aadhaar-seeded. Scholarship payments will fail if sent to a non-DBT account.",
  },
];

function RenewalAlert() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="renewal-page">
      <div className="renewal-header">
        <div className="renewal-header-brand">
          <h1>Four-Year Renewal Planning & Reminder Framework</h1>
          <p>Planning / local guidance unless persistent backend is enabled. Prepare renewals on time without missing key checks.</p>
        </div>
        <div className="renewal-header-actions">
          <button className="renewal-btn-back" onClick={() => navigate("/dashboard")}>
            Back To Dashboard
          </button>
          <LanguageSelector />
        </div>
      </div>

      <div className="container">
        <div className="section-header">
          <h2>Government Scholarship Renewal Guide</h2>
          <p>Four-Year Renewal Planning & Reminder Framework — Local guidance and schedule planning before official portal submission.</p>
        </div>

        <div className="alert-banner">
          <span className="alert-icon">Important</span>
          <div>
            <strong>Important:</strong> Scholarships do not auto-renew. You must
            apply manually on the official portal every academic year. Missing the
            deadline means losing that year's scholarship amount. Current status: Local guidance unless persistent backend notification delivery is enabled.
          </div>
        </div>

        <div className="renewal-card">
          <h3>Scholarship-wise Renewal Details</h3>
          <div className="scholarship-table">
            {scholarships.map((s, i) => (
              <div key={i} className="scholarship-row" style={{ borderLeftColor: s.color }}>
                <div className="scholarship-icon" style={{ background: s.color + "18", color: s.color }}>
                  {s.icon}
                </div>
                <div className="scholarship-info">
                  <h4 style={{ color: s.color }}>{s.name}</h4>
                  <p><strong>Authority:</strong> {s.authority}</p>
                  <p><strong>Renewal Deadline:</strong> {s.deadline}</p>
                  <p><strong>Documents Needed:</strong> {s.renewalDoc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="preferences-section">
          <h3>Key Renewal Rules & Eligibility Conditions</h3>
          <div className="features-list">
            {renewalRules.map((rule, i) => (
              <div key={i} className="feature" style={{ background: rule.color, borderLeft: `4px solid ${rule.accent}` }}>
                <span className="feature-icon">{rule.icon}</span>
                <div>
                  <h4 style={{ color: rule.accent }}>{rule.title}</h4>
                  <p>{rule.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="timeline-section">
          <h3>Step-by-Step Renewal Process</h3>
          <div className="timeline">
            {steps.map((step, i) => (
              <div key={i} className="timeline-item">
                <div className="timeline-marker">{step.num}</div>
                <div className="timeline-content">
                  <h4>{step.icon} {step.title}</h4>
                  <p>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="timeline-section">
          <h3>Frequently Asked Questions</h3>
          <div className="faq-list">
            {faqs.map((item, i) => (
              <div
                key={i}
                className={`faq-item ${openFaq === i ? "open" : ""}`}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div className="faq-question">
                  <span>{item.q}</span>
                  <span className="faq-chevron">{openFaq === i ? "^" : "v"}</span>
                </div>
                {openFaq === i && <div className="faq-answer">{item.a}</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="action-buttons">
          <button className="btn-primary" onClick={() => navigate("/readiness")}>
            Check My Readiness
          </button>
          <button className="btn-secondary" onClick={() => navigate("/documents")}>
            Upload Documents
          </button>
          <button className="btn-secondary" onClick={() => navigate("/dashboard")}>
            Back To Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default RenewalAlert;

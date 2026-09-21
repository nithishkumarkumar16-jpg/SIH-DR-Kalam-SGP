import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import LanguageSelector from "../LanguageSelector/LanguageSelector";
import "./ScholarshipImportants.css";

const sections = [
  { id: "problem", label: "The Problem", icon: "⚠️" },
  { id: "dbt", label: "What is DBT?", icon: "💳" },
  { id: "difference", label: "Key Differences", icon: "🔍" },
  { id: "solution", label: "Our Solution", icon: "🚀" },
  { id: "steps", label: "Action Steps", icon: "📋" },
  { id: "faq", label: "FAQ", icon: "❓" },
];

const faqData = [
  {
    q: "Is Aadhaar linking enough for scholarship payment?",
    a: "No. Aadhaar linking alone is NOT sufficient. You must also have DBT (Direct Benefit Transfer) activated via NPCI mapping at your bank branch. Without this, your scholarship will fail even if the application is approved.",
  },
  {
    q: "What is NPCI mapping?",
    a: "NPCI (National Payments Corporation of India) mapping links your Aadhaar to your bank account in the national DBT system. This enables the government to directly transfer scholarship amounts into your account.",
  },
  {
    q: "How do I know if my account is DBT enabled?",
    a: "Visit your bank branch and ask the bank official to confirm NPCI Aadhaar seeding and DBT activation status. You can also check via the UIDAI portal or ask the bank to print your DBT status.",
  },
  {
    q: "Which scholarships require DBT?",
    a: "All central government scholarships on NSP (National Scholarship Portal) and many state government scholarships including post-matric, pre-matric, merit-cum-means and minority scholarships require DBT-enabled accounts.",
  },
  {
    q: "What happens if DBT is not activated?",
    a: "Your scholarship application may get approved but the payment will fail or remain pending. This can delay scholarship receipt by months or even result in cancellation of the award for that year.",
  },
];

function ScholarshipImportants() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("problem");
  const [openFaq, setOpenFaq] = useState(null);

  const scrollTo = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="si-page">
      {/* Background blobs */}
      <div className="si-bg">
        <div className="si-blob si-blob-1" />
        <div className="si-blob si-blob-2" />
        <div className="si-blob si-blob-3" />
      </div>

      {/* HEADER */}
      <header className="si-header">
        <div className="si-header-inner">
          <div className="si-brand">
            <div className="si-brand-icon"><img src="/sgp-emblem.png" alt="SGP Emblem" style={{width:"100%", height:"100%", objectFit:"cover", borderRadius:"10px"}} /></div>
              <div className="si-brand-copy">
              <h1>Scholarship Guidance Platform</h1>
              <p>Smart Pre-Submission Verification System</p>
            </div>
          </div>
          <div className="si-header-actions">
            <button className="si-back-btn" onClick={() => navigate("/dashboard")}>
              Back To Dashboard
            </button>
            <LanguageSelector />
          </div>
        </div>
      </header>

      {/* HERO BANNER */}
      <section className="si-hero">
        <div className="si-hero-badge">🏆 Smart India Hackathon Solution</div>
        <h2>Scholarship Importants</h2>
        <p className="si-hero-sub">
          Everything you need to know before applying on NSP or UMIS —<br />
          awareness, DBT readiness, and step-by-step guidance.
        </p>

        {/* Quick nav pills */}
        <div className="si-nav-pills">
          {sections.map((s) => (
            <button
              key={s.id}
              className={`si-pill ${activeSection === s.id ? "active" : ""}`}
              onClick={() => scrollTo(s.id)}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </section>

      <div className="si-content">

        {/* ── PROBLEM SECTION ── */}
        <section id="problem" className="si-section">
          <div className="si-section-label red">⚠️ The Problem</div>
          <h3 className="si-section-title">Why Students Lose Their Scholarships</h3>
          <p className="si-section-desc">
            Thousands of eligible students apply on NSP every year but never receive their
            scholarship money — not because they were rejected, but because of a simple,
            preventable banking mistake.
          </p>

          <div className="si-problem-grid">
            <div className="si-problem-card">
              <div className="si-problem-icon" style={{ background: "#fef2f2", color: "#dc2626" }}>📉</div>
              <h4>Low Awareness</h4>
              <p>Most students are unaware of the difference between Aadhaar-linked accounts and DBT-enabled accounts. They assume linking Aadhaar is sufficient.</p>
            </div>
            <div className="si-problem-card">
              <div className="si-problem-icon" style={{ background: "#fff7ed", color: "#ea580c" }}>💸</div>
              <h4>Payment Failures</h4>
              <p>Scholarship payments fail silently — the application is approved, but the disbursement never reaches the student's account due to missing DBT activation.</p>
            </div>
            <div className="si-problem-card">
              <div className="si-problem-icon" style={{ background: "#fdf4ff", color: "#9333ea" }}>🏘️</div>
              <h4>Rural Impact</h4>
              <p>Students from rural areas and first-generation learners are most affected. They lack access to guidance and often miss the NPCI mapping step entirely.</p>
            </div>
            <div className="si-problem-card">
              <div className="si-problem-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}>🛠️</div>
              <h4>No Pre-Check System</h4>
              <p>Official portals like NSP do not provide pre-submission verification. Students only discover problems after their payment fails — sometimes months later.</p>
            </div>
          </div>

          <div className="si-highlight-box red-box">
            <span className="si-highlight-icon">🚨</span>
            <div>
              <strong>Critical Fact:</strong> Aadhaar linking alone is <u>not sufficient</u> for scholarship disbursement.
              Your account must be <strong>DBT-enabled with NPCI mapping</strong> to receive government scholarship money.
            </div>
          </div>
        </section>

        {/* ── DBT SECTION ── */}
        <section id="dbt" className="si-section">
          <div className="si-section-label blue">💳 What is DBT?</div>
          <h3 className="si-section-title">Direct Benefit Transfer — Explained Simply</h3>
          <p className="si-section-desc">
            DBT (Direct Benefit Transfer) is the Government of India's system to send money
            directly to citizens' bank accounts without any middlemen — ensuring full,
            transparent, and timely scholarship disbursement.
          </p>

          <div className="si-dbt-flow">
            {[
              { icon: "🏛️", label: "Government", sub: "Ministry / NSP" },
              { icon: "➡️", label: "", sub: "" },
              { icon: "🏦", label: "NPCI", sub: "National Payments Corp." },
              { icon: "➡️", label: "", sub: "" },
              { icon: "🏧", label: "Your Bank", sub: "DBT Enabled Account" },
              { icon: "➡️", label: "", sub: "" },
              { icon: "🎓", label: "You", sub: "Scholarship Received" },
            ].map((item, i) => (
              item.label === "" ? (
                <div key={i} className="si-flow-arrow">→</div>
              ) : (
                <div key={i} className="si-flow-node">
                  <div className="si-flow-icon">{item.icon}</div>
                  <div className="si-flow-label">{item.label}</div>
                  <div className="si-flow-sub">{item.sub}</div>
                </div>
              )
            ))}
          </div>

          <div className="si-dbt-cards">
            <div className="si-dbt-card">
              <h4>🎯 Purpose of DBT</h4>
              <ul>
                <li>Eliminates middlemen and corruption</li>
                <li>Ensures 100% of scholarship reaches the student</li>
                <li>Provides real-time transaction tracking</li>
                <li>Reduces processing time from weeks to days</li>
              </ul>
            </div>
            <div className="si-dbt-card">
              <h4>📌 Scholarships Using DBT</h4>
              <ul>
                <li>NSP Central Scholarships (Pre & Post Matric)</li>
                <li>Merit-cum-Means Scholarship</li>
                <li>Minority Welfare Scholarships</li>
                <li>State Government Scholarships (UMIS, Tamil Nadu, etc.)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── KEY DIFFERENCES SECTION ── */}
        <section id="difference" className="si-section">
          <div className="si-section-label purple">🔍 Key Differences</div>
          <h3 className="si-section-title">3 Types of Bank Account — Know the Difference</h3>
          <p className="si-section-desc">
            Not all "Aadhaar-linked" accounts are the same. Here is exactly what each
            account type means for your scholarship payment.
          </p>

          <div className="si-diff-table">
            {[
              {
                type: "Aadhaar Linked Account",
                icon: "🔗",
                color: "#fef2f2",
                border: "#fca5a5",
                badge: "❌ NOT ENOUGH",
                badgeColor: "#dc2626",
                points: [
                  "Aadhaar number is associated with account",
                  "Basic identity verification only",
                  "Cannot receive DBT government payments",
                  "Scholarship WILL FAIL even if approved",
                ],
              },
              {
                type: "Aadhaar Seeded Account",
                icon: "📄",
                color: "#fff7ed",
                border: "#fdba74",
                badge: "⚠️ PARTIALLY READY",
                badgeColor: "#ea580c",
                points: [
                  "Aadhaar stored and verified in bank database",
                  "Identity authentication enabled",
                  "NPCI mapping may not yet be active",
                  "DBT payments may still fail",
                ],
              },
              {
                type: "DBT Enabled Aadhaar Seeded",
                icon: "✅",
                color: "#f0fdf4",
                border: "#86efac",
                badge: "✅ SCHOLARSHIP READY",
                badgeColor: "#16a34a",
                points: [
                  "Aadhaar fully mapped with NPCI",
                  "DBT payments activated at bank",
                  "Government can transfer directly",
                  "Scholarship WILL be credited successfully",
                ],
              },
            ].map((item, i) => (
              <div
                key={i}
                className="si-diff-card"
                style={{ background: item.color, borderColor: item.border }}
              >
                <div className="si-diff-icon">{item.icon}</div>
                <h4>{item.type}</h4>
                <div className="si-diff-badge" style={{ color: item.badgeColor, borderColor: item.badgeColor }}>
                  {item.badge}
                </div>
                <ul>
                  {item.points.map((p, j) => <li key={j}>{p}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── OUR SOLUTION SECTION ── */}
        <section id="solution" className="si-section">
          <div className="si-section-label green">🚀 Our Solution</div>
          <h3 className="si-section-title">What This Platform Does for You</h3>
          <p className="si-section-desc">
            Our Smart India Hackathon solution addresses the critical issue of low awareness
            among students regarding DBT requirements — integrating learning directly into the
            user workflow, making it interactive and actionable.
          </p>

          <div className="si-solution-grid">
            {[
              {
                icon: "🔎",
                title: "Pre-Verification Check",
                desc: "Guides students through a complete eligibility and document readiness check before they submit on NSP or UMIS — catching problems early.",
                color: "#eff6ff",
                accent: "#3b82f6",
              },
              {
                icon: "💡",
                title: "DBT Awareness Engine",
                desc: "Explains DBT requirements using simple language and visual content so students understand that Aadhaar linking alone is not sufficient.",
                color: "#f5f3ff",
                accent: "#8b5cf6",
              },
              {
                icon: "🚨",
                title: "Smart Alert System",
                desc: "Automatically detects and alerts users if eligibility, document readiness, or DBT status has an issue — with step-by-step guidance to resolve it.",
                color: "#fef2f2",
                accent: "#ef4444",
              },
              {
                icon: "📊",
                title: "8-Box Readiness Dashboard",
                desc: "Tracks Aadhaar seeding, DBT activation, bank linking, document completeness, and more across 8 key criteria with visual progress indicators.",
                color: "#f0fdf4",
                accent: "#16a34a",
              },
              {
                icon: "🌍",
                title: "Accessible for Rural Students",
                desc: "Designed with mobile-first, simple UI and AI translation support to ensure students from rural areas and non-English backgrounds can use it easily.",
                color: "#fff7ed",
                accent: "#f59e0b",
              },
              {
                icon: "🤖",
                title: "AI Document Verification",
                desc: "Upload certificates and let the AI extract and verify data automatically — reducing errors from manual entry before official portal submission.",
                color: "#ecfdf5",
                accent: "#10b981",
              },
            ].map((item, i) => (
              <div key={i} className="si-solution-card" style={{ background: item.color, borderColor: item.accent + "40" }}>
                <div className="si-solution-icon" style={{ background: item.accent + "20", color: item.accent }}>
                  {item.icon}
                </div>
                <h4 style={{ color: item.accent }}>{item.title}</h4>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="si-highlight-box purple-box">
            <span className="si-highlight-icon">🏆</span>
            <div>
              <strong>SIH Problem Statement:</strong> This platform directly targets the critical gap in student
              awareness about DBT requirements — integrating learning into the user workflow to reduce
              common application errors and improve scholarship disbursement success rates across India.
            </div>
          </div>
        </section>

        {/* ── ACTION STEPS SECTION ── */}
        <section id="steps" className="si-section">
          <div className="si-section-label orange">📋 Action Steps</div>
          <h3 className="si-section-title">What You Must Do Before Applying</h3>
          <p className="si-section-desc">
            Follow these steps in order to ensure your scholarship application is successful
            and your payment is received without any delay.
          </p>

          <div className="si-steps-list">
            {[
              {
                num: "01",
                icon: "🏦",
                title: "Visit Your Bank Branch",
                desc: "Go to the bank branch where your account is held. Carry your Aadhaar card, passbook, and a photocopy of both.",
                tag: "In-Person Required",
                color: "#3b82f6",
              },
              {
                num: "02",
                icon: "📝",
                title: "Fill Aadhaar Seeding Form",
                desc: "Request and fill the Aadhaar seeding form at the bank. Submit it with your Aadhaar photocopy. The bank will update their database.",
                tag: "Bank Form",
                color: "#8b5cf6",
              },
              {
                num: "03",
                icon: "🔗",
                title: "Request NPCI DBT Activation",
                desc: "Specifically ask the bank official to activate NPCI mapping for DBT. This is a separate step from Aadhaar seeding and is critical.",
                tag: "Most Important Step",
                color: "#ef4444",
              },
              {
                num: "04",
                icon: "📱",
                title: "Link Your Mobile Number",
                desc: "Ensure your mobile number is linked to both your bank account and your Aadhaar. This enables OTP-based verification for scholarship applications.",
                tag: "OTP Required",
                color: "#f59e0b",
              },
              {
                num: "05",
                icon: "✅",
                title: "Confirm DBT Status",
                desc: "Ask the bank for a written confirmation or SMS confirmation that your account is now DBT-enabled with NPCI mapping. Keep this for your records.",
                tag: "Get Confirmation",
                color: "#10b981",
              },
              {
                num: "06",
                icon: "🚀",
                title: "Use This Platform to Verify",
                desc: "Before applying on NSP or UMIS, run through our readiness dashboard and eligibility checker to confirm everything is in order.",
                tag: "Pre-Submission Check",
                color: "#6366f1",
              },
            ].map((step, i) => (
              <div key={i} className="si-step-item" style={{ borderLeftColor: step.color }}>
                <div className="si-step-num" style={{ background: step.color }}>{step.num}</div>
                <div className="si-step-body">
                  <div className="si-step-header">
                    <span className="si-step-icon">{step.icon}</span>
                    <h4>{step.title}</h4>
                    <span className="si-step-tag" style={{ background: step.color + "20", color: step.color }}>
                      {step.tag}
                    </span>
                  </div>
                  <p>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ SECTION ── */}
        <section id="faq" className="si-section">
          <div className="si-section-label teal">❓ FAQ</div>
          <h3 className="si-section-title">Frequently Asked Questions</h3>
          <p className="si-section-desc">
            Common questions students ask about DBT, Aadhaar seeding, and scholarship payments.
          </p>

          <div className="si-faq-list">
            {faqData.map((item, i) => (
              <div
                key={i}
                className={`si-faq-item ${openFaq === i ? "open" : ""}`}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div className="si-faq-question">
                  <span>{item.q}</span>
                  <span className="si-faq-chevron">{openFaq === i ? "▲" : "▼"}</span>
                </div>
                {openFaq === i && (
                  <div className="si-faq-answer">{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="si-cta">
          <h3>Ready to Check Your Scholarship Status?</h3>
          <p>Use our tools to verify your eligibility, documents, and DBT readiness before applying.</p>
          <div className="si-cta-buttons">
            <button onClick={() => navigate("/readiness")} className="si-cta-btn primary">📊 Check Readiness Status</button>
            <button onClick={() => navigate("/eligibility")} className="si-cta-btn secondary">✅ Check Eligibility</button>
            <button onClick={() => navigate("/documents")} className="si-cta-btn outline">📁 Upload Documents</button>
          </div>
        </section>

      </div>
    </div>
  );
}

export default ScholarshipImportants;


import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import LanguageSelector from "../LanguageSelector/LanguageSelector";
import "./ReadinessDashboard.css";

const cardsData = [
  {
    id: "bank-seeding",
    icon: "🔗",
    title: "Bank Aadhaar Seeding",
    description: "Verify Aadhaar seeding with your bank account.",
    buttonText: "Check Status",
    color: "#dc2626",
    gradient: "linear-gradient(135deg, #dc2626, #f87171)",
    shadow: "rgba(220, 38, 38, 0.35)",
    steps: [
      "Go to your bank branch where your account is maintained",
      "Ask the bank staff for Aadhaar linking or KYC update form",
      "Fill the form with your correct details (name, address, phone number, Aadhaar number)",
      "Submit a photocopy of your Aadhaar card",
      "Show your original Aadhaar card for verification if requested",
      "Complete biometric verification (fingerprint) or OTP verification",
      "The bank will verify your Aadhaar details with the government database",
      "After verification, your Aadhaar will be linked to your bank account",
      "You will receive an SMS confirmation once linking is successful",
      "After linking, you can receive DBT payments, scholarships, and government benefits"
    ],
    docs: [
      "Aadhaar Card (original + photocopy)",
      "Bank Passbook / Account number",
      "Mobile number registered with Aadhaar",
      "KYC Form (available at branch)"
    ],
    links: [
      { label: "🔍 Check Aadhaar-Bank Link Status", url: "https://myaadhaar.uidai.gov.in/check-aadhaar-bank-linking-status" }
    ]
  },
  {
    id: "aadhar-correction",
    icon: "✏️",
    title: "Aadhaar Correction",
    description: "Correct or update Aadhaar details.",
    buttonText: "Correct Aadhaar",
    color: "#6d28d9",
    gradient: "linear-gradient(135deg, #6d28d9, #a855f7)",
    shadow: "rgba(109, 40, 217, 0.35)",
    steps: [
      "Visit the nearest Aadhaar Enrollment/Update Center",
      "Ask for the Aadhaar Update/Correction Form",
      "Fill the form with the correct details you want to update",
      "Submit the form along with valid supporting documents",
      "The staff will verify your submitted documents",
      "Your biometric details (fingerprint/photo) may be taken if required",
      "Pay the required update fee",
      "You will receive an acknowledgement slip with URN number",
      "Use the URN to track your update status online",
      "After verification, your updated Aadhaar can be downloaded or will be sent by post"
    ],
    docs: [
      "Passport (Name/DOB)",
      "PAN Card (Name/DOB)",
      "Voter ID (Name/Address)",
      "Birth Certificate (DOB)",
      "10th Marksheet (Name/DOB)",
      "Electricity Bill (Address)",
      "Bank Passbook (Address)"
    ],
    links: [
      { label: "✏️ Update Aadhaar Online", url: "https://myaadhaar.uidai.gov.in/update-aadhaar" },
      { label: "🔍 Track Update Status",   url: "https://myaadhaar.uidai.gov.in/checkAadhaarStatus" }
    ]
  },
  {
    id: "community-certificate",
    icon: "📜",
    title: "Community Certificate",
    description: "Correct or obtain your community certificate.",
    buttonText: "Correct Certificate",
    color: "#0891b2",
    gradient: "linear-gradient(135deg, #0891b2, #06b6d4)",
    shadow: "rgba(8, 145, 178, 0.35)",
    steps: [
      "Visit the nearest Taluk Office / VAO Office / e-Sevai Center",
      "Ask for the Community Certificate Correction Form",
      "Fill the form with the correct information",
      "Attach supporting documents (Aadhaar card, ration card, school records, etc.)",
      "Submit the form to the revenue officer or staff",
      "The officer will verify the documents and details",
      "In some cases, the Village Administrative Officer (VAO) may verify your details",
      "Pay the required processing fee",
      "Receive an acknowledgement slip with application number",
      "To track the status click the below button (Track Application Status / Download Certificate) and click Verify Certificate",
      "In Verify Certificate: enter your certificate number (as per the acknowledgement slip) and mobile number, click Generate OTP, enter the OTP received and click Verify to check the status",
      "After verification, the updated community certificate will be issued"
    ],
    docs: [
      "Father's / Mother's Community Certificate",
      "School Transfer Certificate (TC)",
      "Aadhaar Card",
      "Ration Card",
      "Nativity Certificate",
      "Affidavit if first-time applicant"
    ],
    links: [
      { label: "📋 Track Application Status / Download Certificate", url: "https://tnedistrict.tn.gov.in" },
      { label: "📞 Helpline: 1800 425 6463", url: "https://tnedistrict.tn.gov.in/static/contactus.html" }
    ]
  },
  {
    id: "income-certificate",
    icon: "💰",
    title: "Income Certificate",
    description: "Correct or obtain your income certificate.",
    buttonText: "Correct Certificate",
    color: "#059669",
    gradient: "linear-gradient(135deg, #059669, #10b981)",
    shadow: "rgba(5, 150, 105, 0.35)",
    steps: [
      "Visit the nearest Taluk Office / VAO Office / e-Sevai Center",
      "Ask for the Income Certificate Application / Correction Form",
      "Fill the form with correct income and personal details",
      "Attach required documents (salary slip, bank passbook, Aadhaar card, ration card, etc.)",
      "Submit the form to the officer or staff at the center",
      "The officer will verify your income details and documents",
      "In some cases, the Village Administrative Officer (VAO) may verify your details",
      "Pay the required processing fee",
      "Collect the acknowledgement slip with application number",
      "To track the status click the below button (Track Application Status / Download Certificate) and click Verify Certificate",
      "In Verify Certificate: enter your certificate number (as per the acknowledgement slip) and mobile number, click Generate OTP, enter the OTP received and click Verify to check the status",
      "After verification, the updated income certificate will be issued"
    ],
    docs: [
      "Latest Salary Slip (last 3 months)",
      "Form 16 / IT Returns",
      "Employer Certificate / Letter",
      "Aadhaar Card",
      "Ration Card",
      "Bank Passbook (last 6 months)"
    ],
    links: [
      { label: "📋 Track Application Status / Download Certificate", url: "https://tnedistrict.tn.gov.in" },
      { label: "📞 Helpline: 1800 425 6463", url: "https://tnedistrict.tn.gov.in/static/contactus.html" }
    ]
  },
  {
    id: "apply-umis",
    icon: "🏛️",
    title: "Apply via UMIS",
    description: "Apply through institutional portal.",
    buttonText: "Apply Now",
    color: "#7c3aed",
    gradient: "linear-gradient(135deg, #7c3aed, #8b5cf6)",
    shadow: "rgba(124, 58, 237, 0.35)",
    steps: [
      "Login to college UMIS portal with your User ID & Password",
      "Open the Scholarship / DBT Section",
      "Select correct scheme (SC / ST / BC / MBC / DNC)",
      "Enter personal details exactly as in Aadhaar",
      "Fill academic and course details",
      "Enter bank account details (Aadhaar linked)",
      "Upload all required documents",
      "Verify all details carefully before submitting",
      "Submit application and save the acknowledgement"
    ],
    docs: [
      "UMIS User ID & Password from your college",
      "Aadhaar linked with bank account",
      "10th / 12th marksheets",
      "Income & community certificate",
      "Bank passbook (student name)",
      "Fee receipt / bonafide certificate"
    ],
    links: [
      { label: "🏛️ Go to UMIS Portal",            url: "https://umis.tn.gov.in" },
      { label: "📞 UMIS Helpline: 044-2827 2000", url: "https://umis.tn.gov.in/static/helpline.html" },
      { label: "🎥 Video Guidance",               url: "https://youtu.be/fJ_FHcR3UHk?si=i80Y5TBqTea1l0Hj" }
    ]
  },
  {
    id: "nsp",
    icon: "🌐",
    title: "NSP Portal",
    description: "Access the National Scholarship Portal.",
    buttonText: "Go to NSP",
    color: "#0369a1",
    gradient: "linear-gradient(135deg, #0369a1, #0ea5e9)",
    shadow: "rgba(3, 105, 161, 0.35)",
    steps: [
      "Go to the official website of National Scholarship Portal (NSP)",
      "Click on 'New Registration'",
      "Read the guidelines carefully and accept the terms and conditions",
      "Enter your basic details (name, date of birth, mobile number, email, etc.)",
      "Create your login ID and password",
      "Remember or save your login ID and password",
      "Login to the portal using your application ID and password",
      "Fill the scholarship application form with personal, academic, and bank details",
      "Upload required documents (Aadhaar, income certificate, mark sheet, etc.)",
      "Check all details carefully before submitting the application",
      "Submit the application form",
      "After submission, login to NSP portal and track your application status online"
    ],
    docs: [
      "Aadhaar Card (linked to bank)",
      "Community Certificate",
      "Income Certificate",
      "10th / 12th Marksheets",
      "Bank Passbook (student name)",
      "Fee Receipt / Bonafide Certificate",
      "Passport-size photograph"
    ],
    links: [
      { label: "🌐 Open National Scholarship Portal", url: "https://scholarships.gov.in" },
      { label: "🎥 Video Guidance",                  url: "https://youtu.be/7e7IQnq0-cM?si=qG8iHTNcdg5VYjBB" }
    ]
  }
];

// ============================================
// DETAIL VIEW
// ============================================
function DetailView({ card, onBack }) {
  const [docsOpen, setDocsOpen] = useState(false);

  return (
    <div className="rd-detail-wrap is-entering-up">
      <div className="rd-detail-top" style={{ background: card.gradient }}>
        <div className="rd-detail-icon">{card.icon}</div>
        <div className="rd-detail-heading">
          <h2>{card.title}</h2>
          <p>{card.description}</p>
        </div>
      </div>

      <div className="rd-detail-body">
        <div className="rd-steps-title">📋 Step-by-Step Guide</div>

        <ol className="rd-steps">
          {card.steps.map((step, i) => (
            <li key={i}>
              <span className="rd-step-num" style={{ background: card.gradient }}>
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <button
          className="rd-docs-toggle"
          onClick={() => setDocsOpen((prev) => !prev)}
          style={{ borderColor: card.color, color: card.color }}
        >
          {docsOpen ? "▲ Hide" : "▼ Show"} Required Documents
        </button>

        {docsOpen && (
          <div className="rd-docs-list">
            {card.docs.map((doc, i) => (
              <span
                key={i}
                className="rd-doc-chip"
                style={{
                  background: `${card.color}15`,
                  borderColor: `${card.color}40`,
                  color: card.color
                }}
              >
                📄 {doc}
              </span>
            ))}
          </div>
        )}

        <div className="rd-links-title">🔗 Official Portals</div>

        <div className="rd-links-group">
          {card.links.map((lnk, i) => (
            <a
              key={i}
              href={lnk.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rd-cta-btn"
              style={{
                background:  i === 0 ? card.gradient : "transparent",
                color:       i === 0 ? "#fff"        : card.color,
                border:      i === 0 ? "none"        : `2px solid ${card.color}`,
                boxShadow:   i === 0 ? `0 8px 20px ${card.shadow}` : "none"
              }}
            >
              {lnk.label}
            </a>
          ))}
        </div>

        <button className="rd-back-btn" onClick={onBack}>
          ← Back To Dashboard
        </button>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
function ReadinessDashboard() {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState(null);
  const [isExiting, setIsExiting] = useState(false);

  const handleNavigation = (path) => {
    setIsExiting(true);
    setTimeout(() => navigate(path), 500);
  };

  const activeCard = activePage ? cardsData.find((c) => c.id === activePage) : null;

  return (
    <div className={`readiness-page ${isExiting ? "is-exiting-down" : "is-entering-up"}`}>

      {/* BACKGROUND ANIMATIONS */}
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

      {/* HEADER */}
      <header className="pro-header">
        <div className="header-shape shape-1"></div>
        <div className="header-shape shape-2"></div>
        <div className="header-container">
          <div className="header-brand">
            <div className="brand-icon">📊</div>
            <div className="brand-text">
              <h1>{activeCard ? activeCard.title : "Scholarship Guide"}</h1>
              <p>{activeCard ? "Tap back to return to dashboard" : "Track your NSP application readiness"}</p>
            </div>
          </div>
          <div className="header-actions">
            {activePage ? (
              <button className="btn-pro-back" onClick={() => setActivePage(null)}>Back To Dashboard</button>
            ) : (
              <button className="btn-pro-back" onClick={() => handleNavigation("/dashboard")}>Back To Dashboard</button>
            )}
            <LanguageSelector />
          </div>
        </div>
      </header>

      <main className="readiness-container">

        {/* HOME VIEW — 3×2 GRID */}
        {!activePage && (
          <>
            <div className="section-header">
              <h2>Your Scholarship Application Readiness</h2>
              <p>Track your progress across 6 key steps required for NSP.</p>
            </div>

            <div className="readiness-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              {cardsData.map((card) => (
                <div
                  key={card.id}
                  className="readiness-box"
                  onClick={() => setActivePage(card.id)}
                >
                  <div className="card-top">
                    <div
                      className="icon-box"
                      style={{ background: card.gradient, color: "#fff", boxShadow: `0 4px 12px ${card.shadow}` }}
                    >
                      {card.icon}
                    </div>
                  </div>
                  <h3>{card.title}</h3>
                  <p className="box-desc">{card.description}</p>
                  <button
                    className="rd-card-btn"
                    style={{ background: card.gradient, color: "#fff", border: "none", boxShadow: `0 4px 12px ${card.shadow}` }}
                    onClick={(e) => { e.stopPropagation(); setActivePage(card.id); }}
                  >
                    {card.buttonText}
                  </button>
                </div>
              ))}
            </div>

          </>
        )}

        {/* DETAIL VIEW */}
        {activePage && activeCard && (
          <DetailView card={activeCard} onBack={() => setActivePage(null)} />
        )}

      </main>
    </div>
  );
}

export default ReadinessDashboard;

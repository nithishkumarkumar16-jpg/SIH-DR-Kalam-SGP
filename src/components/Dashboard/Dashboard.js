import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import LanguageSelector from "../LanguageSelector/LanguageSelector";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [currentAd, setCurrentAd] = useState(0);
  const [showDeleteWarning, setShowDeleteWarning] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeApp, setActiveApp] = useState(null);
  const notifRef = useRef(null);
  const mobileNavRef = useRef(null);

  // Fetch active student application if logged in as student
  useEffect(() => {
    if (user?.role === "STUDENT") {
      try {
        const req = apiRequest("/api/student/applications");
        if (req && typeof req.then === "function") {
          req
            .then((data) => {
              if (data?.applications && data.applications.length > 0) {
                setActiveApp(data.applications[0]);
              }
            })
            .catch(() => {});
        }
      } catch (e) {}
    }
  }, [user]);

  // Close notifications on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (mobileNavRef.current && !mobileNavRef.current.contains(e.target) && !e.target.closest(".mobile-hamburger-btn")) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdowns and mobile menu on Escape key press
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setShowNotifications(false);
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const newsItems = [
    "CENTRAL SECTOR SCHOLARSHIP APPLICATIONS ARE NOW OPEN — APPLY ONLINE",
    "STATE SCHOLARSHIP RENEWAL WINDOW CLOSES IN 15 DAYS — SET YOUR REMINDER",
    "PMS-MINORITY INCOME LIMIT REVISED FOR 2026-27 — RECHECK ELIGIBILITY",
    "AADHAAR-SEED YOUR BANK ACCOUNT BEFORE APPLYING TO AVOID DBT PAYMENT FAILURE",
    "PMS-OBC APPLICATION DEADLINE EXTENDED — VERIFY DOCUMENTS BEFORE RESUBMITTING",
  ];

  const scholarshipAds = [
    {
      id: 1,
      title: "What is Direct Benefit Transfer (DBT)?",
      description: "Direct Benefit Transfer (DBT) is a system used by the Government of India to transfer scholarship money directly into students' bank accounts without intermediaries. This ensures faster payments, transparency, and reduced corruption in welfare schemes.",
      icon: "💳",
      background: "linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)",
      eligibility: "Scholarship Payments",
      incomeLimit: "Requires DBT Enabled Account",
      flow: [["🏛️", "Government Scheme"], ["💳", "DBT System"], ["🏦", "Bank Transfer"], ["🎓", "Student Account"]]
    },
    {
      id: 2,
      title: "Why DBT is Important for Scholarships",
      description: "Government scholarships such as NSP scholarships, state scholarships, and central schemes are credited only through DBT. This system prevents fraud, eliminates middlemen, and ensures students receive the full scholarship amount directly in their bank account.",
      icon: "🎓",
      background: "linear-gradient(135deg, #059669 0%, #10B981 100%)",
      eligibility: "All Students",
      incomeLimit: "DBT Required",
      flow: [["🔗", "Aadhaar Linked"], ["📄", "Aadhaar Seeded"], ["🏦", "NPCI Mapping"], ["💰", "DBT Enabled"], ["🎓", "Scholarship Credited"]]
    },
    {
      id: 3,
      title: "Aadhaar Linked Bank Account",
      description: "An Aadhaar linked account means your Aadhaar number is connected to your bank account. However, Aadhaar linking alone does not guarantee that your account can receive government benefits through DBT.",
      icon: "🔗",
      background: "linear-gradient(135deg, #7c3aed 0%, #8B5CF6 100%)",
      eligibility: "Bank Linked",
      incomeLimit: "Not DBT Ready",
      flow: [["🪪", "Aadhaar"], ["🏦", "Bank Account"], ["🔗", "Linked"]]
    },
    {
      id: 4,
      title: "Aadhaar Seeded Bank Account",
      description: "Aadhaar seeding means your Aadhaar number is stored and verified in the bank's database. This step allows the bank to authenticate your identity but still requires NPCI mapping for DBT payments.",
      icon: "📄",
      background: "linear-gradient(135deg, #b45309 0%, #f59e0b 100%)",
      eligibility: "IFSC & Structural Length Values Match Common Parameters",
      incomeLimit: "Partially Ready",
      flow: [["🪪", "Aadhaar"], ["🏦", "Bank Database"], ["✔️", "Seeded"]]
    },
    {
      id: 5,
      title: "DBT Enabled Aadhaar Seeded Account",
      description: "A DBT enabled account means your Aadhaar is successfully mapped with NPCI (National Payments Corporation of India). This allows government benefits like scholarships, subsidies, and welfare payments to be transferred directly to your account.",
      icon: "🏦",
      background: "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
      eligibility: "Fully Ready",
      incomeLimit: "Scholarship Ready",
      flow: [["🪪", "Aadhaar"], ["🏦", "Bank"], ["🏛️", "NPCI"], ["💰", "DBT Enabled"]]
    },
    {
      id: 6,
      title: "Why Students Face Scholarship Delays",
      description: "Many students only link Aadhaar with their bank but do not activate DBT mapping with NPCI. Because of this, scholarship payments fail or get delayed even though the application is approved.",
      icon: "⚠️",
      background: "linear-gradient(135deg, #be185d 0%, #ec4899 100%)",
      eligibility: "Common Issue",
      incomeLimit: "DBT Not Activated",
      flow: [["🪪", "Aadhaar Linked"], ["❌", "No NPCI"], ["⏳", "Payment Delay"]]
    },
    {
      id: 7,
      title: "How to Activate DBT",
      description: "Students must visit their bank branch and request Aadhaar seeding along with DBT activation. Bank officials will verify the Aadhaar details and update NPCI mapping to make the account eligible for DBT payments.",
      icon: "🏦",
      background: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)",
      eligibility: "All Students",
      incomeLimit: "Bank Verification Required",
      flow: [["🏦", "Visit Bank"], ["📄", "Submit Aadhaar"], ["✔️", "DBT Activated"]]
    },
    {
      id: 8,
      title: "Steps to Activate DBT",
      description: "1️⃣ Visit your bank branch\n2️⃣ Submit Aadhaar photocopy\n3️⃣ Fill Aadhaar seeding form\n4️⃣ Request NPCI DBT activation\n5️⃣ Confirm mobile number linked to bank\nAfter verification your account becomes DBT enabled.",
      icon: "📝",
      background: "linear-gradient(135deg, #065f46 0%, #10b981 100%)",
      eligibility: "Simple Process",
      incomeLimit: "1 Bank Visit",
      flow: [["1", "Bank Visit"], ["2", "Submit Aadhaar"], ["3", "Fill Form"], ["4", "NPCI Mapping"]]
    },
    {
      id: 9,
      title: "Check Your DBT Readiness",
      description: "Before applying for scholarships on NSP or state portals, students should confirm whether their bank account is Aadhaar seeded and DBT enabled. This prevents scholarship payment failures.",
      icon: "📊",
      background: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)",
      eligibility: "Before Application",
      incomeLimit: "Avoid Payment Delay",
      flow: [["📊", "Check Aadhaar"], ["🏦", "Check Bank"], ["✔️", "Ready for DBT"]]
    },
    {
      id: 10,
      title: "Important Scholarship Notice",
      description: "Scholarships will ONLY be credited to DBT-enabled Aadhaar seeded bank accounts. Students must ensure Aadhaar seeding and NPCI DBT activation before submitting scholarship applications.",
      icon: "🔔",
      background: "linear-gradient(135deg, #9a3412 0%, #ea580c 100%)",
      eligibility: "All Scholarship Applicants",
      incomeLimit: "DBT Mandatory",
      flow: [["🪪", "Aadhaar"], ["🏦", "Bank"], ["💰", "Scholarship Paid"]]
    }
  ];

  // Carousel auto rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAd((prev) => (prev + 1) % scholarshipAds.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [scholarshipAds.length]);

  const handleNavigation = (path) => {
    setIsExiting(true);
    setTimeout(() => {
      navigate(path);
    }, 350);
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const ArrowIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"></line>
      <polyline points="12 5 19 12 12 19"></polyline>
    </svg>
  );

  const renderProcessFlow = (ad) => {
    return (
      <div className="process-flow">
        {ad.flow.map((step, idx) => (
          <React.Fragment key={idx}>
            <div className="process-step">
              <div className="circle">{step[0]}</div>
              <p>{step[1]}</p>
            </div>
            {idx < ad.flow.length - 1 && <div className="pflow-arrow">→</div>}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className={`dashboard-page ${isExiting ? "is-exiting-down" : "is-entering-up"}`}>

      {/* ============================================ PRO HEADER ============================================ */}
      <header className="pro-header" style={{ background: "#02065c" }}>
        <div className="header-container">
          <div className="header-brand" onClick={() => handleNavigation("/dashboard")} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && handleNavigation("/dashboard")} style={{ cursor: "pointer" }}>
            <div className="brand-icon">
              <img src="/sgp-emblem.png" alt="SGP Emblem" className="brand-logo-img" />
            </div>
            <div className="brand-text">
              <h1>Scholarship Guidance Platform</h1>
              <p>Smart Pre-Submission Verification System</p>
            </div>
          </div>

          {/* Desktop Navigation Actions */}
          <div className="header-actions desktop-header-actions">
            <button className="utility-link" aria-label="About Features" onClick={() => scrollToSection("features-section")}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              About
            </button>
            <button className="utility-link" aria-label="Explore Scholarships" onClick={() => handleNavigation("/scholarship")}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
              </svg>
              Explore
            </button>
            <button className="utility-link" aria-label="What's New Updates" onClick={() => scrollToSection("news-section")}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 11l18-5v12L3 14v-3z" />
                <path d="M11.6 16.8a2 2 0 0 1-3.2 2.4L6 15.5" />
              </svg>
              What's New
            </button>

            <div className="notif-wrapper" ref={notifRef} style={{ position: "relative" }}>
              <button
                className="utility-link utility-notify"
                aria-label="3 Unread Notifications"
                aria-haspopup="true"
                aria-expanded={showNotifications}
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                Notifications
                <span className="notify-badge" aria-hidden="true">3</span>
              </button>

              {showNotifications && (
                <div className="pro-notif-dropdown" role="region" aria-label="Notifications panel">
                  <div className="notif-header">
                    <h4>Pre-Submission Advisories</h4>
                    <span className="notif-badge-pill">3 Active</span>
                  </div>
                  <div className="notif-item" tabIndex={0} role="button" onClick={() => { setShowNotifications(false); handleNavigation("/readiness"); }} onKeyDown={(e) => e.key === "Enter" && (setShowNotifications(false), handleNavigation("/readiness"))}>
                    <span className="notif-icon">⚠️</span>
                    <div>
                      <strong>DBT Bank Seeding Mandatory</strong>
                      <p>Ensure bank account is mapped on NPCI before applying.</p>
                    </div>
                  </div>
                  <div className="notif-item" tabIndex={0} role="button" onClick={() => { setShowNotifications(false); handleNavigation("/eligibility"); }} onKeyDown={(e) => e.key === "Enter" && (setShowNotifications(false), handleNavigation("/eligibility"))}>
                    <span className="notif-icon">🎯</span>
                    <div>
                      <strong>Central Sector Scheme 2026</strong>
                      <p>Check eligibility criteria &amp; income ceilings now.</p>
                    </div>
                  </div>
                  <div className="notif-item" tabIndex={0} role="button" onClick={() => { setShowNotifications(false); handleNavigation("/documents"); }} onKeyDown={(e) => e.key === "Enter" && (setShowNotifications(false), handleNavigation("/documents"))}>
                    <span className="notif-icon">📄</span>
                    <div>
                      <strong>Document Name Matching</strong>
                      <p>Verify spelling between Aadhaar &amp; Marks Card to prevent portal delays.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="header-divider"></div>
            
            {/* AUTH STATUS / PORTAL LOGIN CONTROLS */}
            {isAuthenticated ? (
              <div className="user-header-group" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {user?.role === "STUDENT" ? (
                  <>
                    <button className="utility-link" aria-label="View Student Profile" onClick={() => handleNavigation("/student/profile")}>
                      👤 Profile
                    </button>
                    <button className="utility-link" aria-label="View Application Status" onClick={() => handleNavigation("/student/status")}>
                      📊 Application Status
                    </button>
                  </>
                ) : user?.role.startsWith("COLLEGE") ? (
                  <button className="utility-link" style={{ background: "#2563eb", color: "#fff", padding: "6px 12px", borderRadius: "6px" }} onClick={() => navigate("/college/dashboard")}>
                    🏛️ College Portal
                  </button>
                ) : (
                  <button className="utility-link" style={{ background: "#7c3aed", color: "#fff", padding: "6px 12px", borderRadius: "6px" }} onClick={() => navigate("/ministry/dashboard")}>
                    🇮🇳 Ministry Portal
                  </button>
                )}
                <button
                  className="utility-link btn-sign-out"
                  style={{ background: "#dc2626", color: "#fff", padding: "5px 10px", borderRadius: "6px", fontSize: "12px" }}
                  aria-label="Sign Out of Session"
                  onClick={logout}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                className="utility-link"
                style={{ background: "#2563eb", color: "#ffffff", padding: "7px 14px", borderRadius: "8px", fontWeight: 800 }}
                onClick={() => navigate("/login")}
              >
                🔐 Portal Login →
              </button>
            )}

            <div className="header-divider"></div>
            <LanguageSelector />
          </div>

          {/* Mobile Menu Controls */}
          <div className="mobile-header-controls">
            <button
              className="mobile-hamburger-btn"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="mobile-nav-drawer" ref={mobileNavRef} role="navigation" aria-label="Mobile Navigation Drawer">
            <div className="mobile-nav-list">
              <button className="mobile-nav-item" onClick={() => { setMobileMenuOpen(false); scrollToSection("features-section"); }}>
                ℹ️ About
              </button>
              <button className="mobile-nav-item" onClick={() => { setMobileMenuOpen(false); handleNavigation("/scholarship"); }}>
                🧭 Explore Scholarships
              </button>
              <button className="mobile-nav-item" onClick={() => { setMobileMenuOpen(false); scrollToSection("news-section"); }}>
                📢 What's New
              </button>

              <div className="mobile-nav-divider"></div>

              {isAuthenticated ? (
                <>
                  {user?.role === "STUDENT" ? (
                    <>
                      <button className="mobile-nav-item" onClick={() => { setMobileMenuOpen(false); handleNavigation("/student/profile"); }}>
                        👤 Profile
                      </button>
                      <button className="mobile-nav-item" onClick={() => { setMobileMenuOpen(false); handleNavigation("/student/status"); }}>
                        📊 Application Status
                      </button>
                    </>
                  ) : user?.role.startsWith("COLLEGE") ? (
                    <button className="mobile-nav-item" onClick={() => { setMobileMenuOpen(false); navigate("/college/dashboard"); }}>
                      🏛️ College Portal
                    </button>
                  ) : (
                    <button className="mobile-nav-item" onClick={() => { setMobileMenuOpen(false); navigate("/ministry/dashboard"); }}>
                      🇮🇳 Ministry Portal
                    </button>
                  )}
                  <button className="mobile-nav-item mobile-logout-item" onClick={() => { setMobileMenuOpen(false); logout(); }}>
                    🚪 Sign Out
                  </button>
                </>
              ) : (
                <button className="mobile-nav-item mobile-login-item" onClick={() => { setMobileMenuOpen(false); navigate("/login"); }}>
                  🔐 Portal Login →
                </button>
              )}

              <div className="mobile-nav-divider"></div>
              <div className="mobile-nav-lang">
                <LanguageSelector />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ============================================ NEWS TICKER + ALERT ============================================ */}
      <div className="news-alert-stack" id="news-section">
        <div className="news-ticker-bar">
          <span className="news-ticker-label">LATEST NEWS</span>
          <div className="news-ticker-viewport">
            <div className="news-ticker-track">
              {[...newsItems, ...newsItems].map((item, idx) => (
                <span className="news-ticker-item" key={idx}>
                  <span>{item}</span>
                  <span className="news-sep">|</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="scholarship-alert-bar">
          <span className="alert-icon">⚠️</span>
          <span className="alert-text">
            <strong>ALERT :</strong> SCHOLARSHIPS ARE CREDITED ONLY TO DBT-ENABLED, AADHAAR-SEEDED BANK ACCOUNTS.{" "}
            <button className="alert-link" onClick={() => handleNavigation("/readiness")}>
              Check Your Readiness Status
            </button>{" "}
            FOR ESSENTIAL GUIDELINES AND IMPORTANT DETAILS.
          </span>
        </div>
      </div>

      {/* ============================================ MAIN CONTAINER ============================================ */}
      <main className="dashboard-container">

        {showDeleteWarning && (
          <div className="pro-warning-banner" id="warningBanner">
            <div className="warning-icon-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <div className="warning-text">
              <strong>Privacy &amp; Security Notice</strong>
              <p>All uploaded documents and images are automatically deleted after you exit this page for your safety and privacy.</p>
            </div>
            <button className="warning-close" onClick={() => setShowDeleteWarning(false)}>✕</button>
          </div>
        )}

        {/* CAROUSEL */}
        <div className="pro-carousel-wrapper">
          <div className="carousel-track">
            {scholarshipAds.map((ad, index) => (
              <div
                key={ad.id}
                className={`pro-carousel-slide ${index === currentAd ? "active" : ""}`}
                style={{
                  background: ad.background,
                  opacity: index === currentAd ? 1 : 0,
                  transform: index === currentAd ? "scale(1) translateX(0)" : "scale(0.95) translateX(20px)",
                  pointerEvents: index === currentAd ? "auto" : "none",
                  zIndex: index === currentAd ? 2 : 1,
                }}
              >
                <div className="slide-content">
                  <div className="slide-left">
                    <div className="slide-icon">{ad.icon}</div>
                    <div className="slide-text">
                      <h3>{ad.title}</h3>
                      <p>{ad.description}</p>
                      <div className="slide-badges">
                        <span className="badge">👥 {ad.eligibility}</span>
                        <span className="badge income">💰 {ad.incomeLimit}</span>
                      </div>
                    </div>
                  </div>
                  <div className="slide-right">
                    {renderProcessFlow(ad)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button className="nav-btn prev" onClick={() => setCurrentAd((prev) => (prev - 1 + scholarshipAds.length) % scholarshipAds.length)}>‹</button>
          <button className="nav-btn next" onClick={() => setCurrentAd((prev) => (prev + 1) % scholarshipAds.length)}>›</button>

          <div className="slide-dots">
            {scholarshipAds.map((_, index) => (
              <div
                key={index}
                className={`dot ${index === currentAd ? "active" : ""}`}
                onClick={() => setCurrentAd(index)}
              />
            ))}
          </div>
          <div className="slide-counter">{currentAd + 1} / {scholarshipAds.length}</div>
        </div>

        {/* ACTIVE APPLICATION STATUS WIDGET (For authenticated students) */}
        {activeApp && (
          <div
            className="active-app-banner"
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              padding: "20px 24px",
              border: "1.5px solid #bfdbfe",
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.08)",
              marginBottom: "26px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                <span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 800 }}>
                  {activeApp.applicationId}
                </span>
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontSize: "11.5px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    background: activeApp.applicationStatus === "CORRECTION_REQUIRED" ? "#fee2e2" : activeApp.applicationStatus === "PAID" ? "#d1fae5" : "#dbeafe",
                    color: activeApp.applicationStatus === "CORRECTION_REQUIRED" ? "#b91c1c" : activeApp.applicationStatus === "PAID" ? "#065f46" : "#1d4ed8",
                  }}
                >
                  {activeApp.applicationStatus.replace(/_/g, " ")}
                </span>
              </div>
              <h3 style={{ margin: "2px 0 6px 0", fontSize: "17px", color: "#0f172a", fontWeight: 800 }}>
                {activeApp.schemeId}
              </h3>
              <p style={{ margin: 0, fontSize: "12.5px", color: "#64748b" }}>
                Stage: <strong>{activeApp.currentStage}</strong> &bull; Who Must Act: <strong style={{ color: "#2563eb" }}>{activeApp.whoMustAct}</strong>
              </p>
              <div style={{ marginTop: "6px", fontSize: "12px", color: "#92400e" }}>
                💡 <strong>Next Action:</strong> {activeApp.nextAction}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                onClick={() => navigate("/student/status")}
                style={{
                  background: "#02065c",
                  color: "#ffffff",
                  border: "none",
                  padding: "9px 18px",
                  borderRadius: "8px",
                  fontWeight: 800,
                  fontSize: "12.5px",
                  cursor: "pointer",
                }}
              >
                📊 Track Complete Status
              </button>
              {activeApp.applicationStatus === "CORRECTION_REQUIRED" && (
                <button
                  onClick={() => navigate("/student/deficiencies")}
                  style={{
                    background: "#dc2626",
                    color: "#ffffff",
                    border: "none",
                    padding: "9px 16px",
                    borderRadius: "8px",
                    fontWeight: 800,
                    fontSize: "12.5px",
                    cursor: "pointer",
                  }}
                >
                  ⚠️ Fix Deficiencies
                </button>
              )}
            </div>
          </div>
        )}

        {/* SECTION HEADER */}
        <div className="section-header" id="action-cards-grid">
          <h2>Choose Your Next Step</h2>
          <p>Everything you need to get ready for NSP</p>
        </div>

        {/* 6-CARD ACTION GRID */}
        <div className="pro-grid">

          {/* 1. SCHOLARSHIP IMPORTANTS */}
          <div className="pro-card card-blue" onClick={() => handleNavigation("/scholarship")}>
            <div className="card-top">
              <div className="icon-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="7" r="4" />
                  <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
                </svg>
              </div>
            </div>
            <div className="card-body">
              <h3>Scholarship Importants</h3>
              <p>Understand DBT, NSP &amp; scholarship essentials before you apply.</p>
            </div>
            <div className="card-bottom">
              <span>Get Started</span>
              <div className="action-arrow"><ArrowIcon /></div>
            </div>
          </div>

          {/* 2. UPLOAD DOCUMENTS */}
          <div className="pro-card card-green" onClick={() => handleNavigation("/documents")}>
            <div className="card-top">
              <div className="icon-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
            </div>
            <div className="card-body">
              <h3>Upload Documents</h3>
              <p>Upload &amp; extract data from your certificates (Auto-deleted).</p>
            </div>
            <div className="card-bottom">
              <span>Start Upload</span>
              <div className="action-arrow"><ArrowIcon /></div>
            </div>
          </div>

          {/* 3. CHECK ELIGIBILITY */}
          <div className="pro-card card-purple" onClick={() => handleNavigation("/eligibility")}>
            <div className="card-top">
              <div className="icon-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
            </div>
            <div className="card-body">
              <h3>Check Eligibility</h3>
              <p>See exactly which scholarships you qualify for instantly.</p>
            </div>
            <div className="card-bottom">
              <span>Check Now</span>
              <div className="action-arrow"><ArrowIcon /></div>
            </div>
          </div>

          {/* 4. READINESS STATUS */}
          <div className="pro-card card-orange" onClick={() => handleNavigation("/readiness")}>
            <div className="card-top">
              <div className="icon-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
            </div>
            <div className="card-body">
              <h3>Readiness Status</h3>
              <p>Track your progress with our smart 6-box dashboard.</p>
            </div>
            <div className="card-bottom">
              <span>View Status</span>
              <div className="action-arrow"><ArrowIcon /></div>
            </div>
          </div>

          {/* 5. RENEWAL REMINDERS */}
          <div className="pro-card card-red" onClick={() => handleNavigation("/renewal")}>
            <div className="card-top">
              <div className="icon-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
            </div>
            <div className="card-body">
              <h3>Renewal Reminders</h3>
              <p>Get 4-year smart automatic renewal alerts sent to you.</p>
            </div>
            <div className="card-bottom">
              <span>Set Alerts</span>
              <div className="action-arrow"><ArrowIcon /></div>
            </div>
          </div>

          {/* 6. REPORTS */}
          <div className="pro-card card-teal" onClick={() => handleNavigation("/reports")}>
            <div className="card-top">
              <div className="icon-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
              </div>
            </div>
            <div className="card-body">
              <h3>Review &amp; Report Issues</h3>
              <p>View and download your saved comparison reports.</p>
            </div>
            <div className="card-bottom">
              <span>View Reports</span>
              <div className="action-arrow"><ArrowIcon /></div>
            </div>
          </div>

        </div>

        {/* ============================================ FEATURES (3 Glass Boxes) ============================================ */}
        <div className="pro-features-wrapper" id="features-section">
          <div className="features-content">
            <h2>Why Choose Our Platform?</h2>
            <div className="features-grid-glass">

              {/* Red Box - Rejection Reasons */}
              <div className="glass-box glass-box-red">
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
                  <div style={{ fontSize: "28px" }}>🚫</div>
                  <div>
                    <div style={{ color: "#fca5a5", fontWeight: 800, fontSize: "17px" }}>Why Scholarships Get</div>
                    <div style={{ color: "#f87171", fontWeight: 900, fontSize: "19px" }}>Rejected on NSP Portal</div>
                  </div>
                </div>
                <div className="reason-row">
                  <span>🏦</span>
                  <span style={{ fontSize: "13.5px" }}>Bank account not DBT-enabled (NPCI not mapped)</span>
                </div>
                <div className="reason-row">
                  <span>🪪</span>
                  <span style={{ fontSize: "13.5px" }}>Aadhaar not seeded with bank account</span>
                </div>
                <div className="reason-row">
                  <span>📄</span>
                  <span style={{ fontSize: "13.5px" }}>Missing or mismatched documents uploaded</span>
                </div>
                <div className="reason-row">
                  <span>💰</span>
                  <span style={{ fontSize: "13.5px" }}>Income certificate exceeds scholarship limit</span>
                </div>
                <div
                  style={{
                    marginTop: "12px",
                    background: "rgba(0, 0, 0, 0.25)",
                    borderRadius: "9px",
                    padding: "10px 14px",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    textAlign: "center"
                  }}
                >
                  <span style={{ color: "#fca5a5", fontWeight: 700, fontSize: "13px" }}>
                    ⚠️ Our platform helps you fix ALL of these before submission!
                  </span>
                </div>
              </div>

              {/* Green Box - Prevention Engine */}
              <div className="glass-box glass-box-green">
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
                  <div style={{ fontSize: "28px" }}>🛡️</div>
                  <div>
                    <div style={{ color: "#6ee7b7", fontWeight: 800, fontSize: "17px" }}>How Our Platform</div>
                    <div style={{ color: "#34d399", fontWeight: 900, fontSize: "19px" }}>Prevents Rejection</div>
                  </div>
                </div>
                <div className="impact-row">
                  <span style={{ fontSize: "17px" }}>📑</span>
                  <div>
                    <div style={{ color: "#6ee7b7", fontWeight: 700, fontSize: "13px" }}>Document verification engine</div>
                    <div style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.85)" }}>Detects missing or mismatched documents instantly</div>
                  </div>
                </div>
                <div className="impact-row">
                  <span style={{ fontSize: "17px" }}>🎯</span>
                  <div>
                    <div style={{ color: "#6ee7b7", fontWeight: 700, fontSize: "13px" }}>Eligibility pre-check</div>
                    <div style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.85)" }}>Confirms you qualify before you even start applying</div>
                  </div>
                </div>
                <div className="impact-row">
                  <span style={{ fontSize: "17px" }}>📊</span>
                  <div>
                    <div style={{ color: "#6ee7b7", fontWeight: 700, fontSize: "13px" }}>Readiness score dashboard</div>
                    <div style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.85)" }}>8-point checklist to ensure 100% application readiness</div>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: "12px",
                    background: "rgba(0, 0, 0, 0.25)",
                    borderRadius: "9px",
                    padding: "10px 14px",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    textAlign: "center"
                  }}
                >
                  <span style={{ color: "#34d399", fontWeight: 700, fontSize: "13px" }}>
                    🚀 Helping prevent application defects and preventable submission errors!
                  </span>
                </div>
              </div>

              {/* Purple Box - DBT Flow */}
              <div className="glass-box glass-box-purple" style={{ textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "22px" }}>
                  <span style={{ fontSize: "26px" }}>💸</span>
                  <div>
                    <div style={{ color: "#c4b5fd", fontWeight: 800, fontSize: "16px" }}>How Scholarship Payments</div>
                    <div style={{ color: "#a78bfa", fontWeight: 900, fontSize: "18px" }}>Reach Students</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginBottom: "18px" }}>
                  <div
                    style={{
                      background: "rgba(0,0,0,0.22)",
                      borderRadius: "12px",
                      padding: "10px 10px 8px",
                      border: "1px solid rgba(255,255,255,0.2)",
                      minWidth: "72px"
                    }}
                  >
                    <div style={{ fontSize: "28px" }}>🏛️</div>
                    <p style={{ fontSize: "11px", margin: 0, fontWeight: 600 }}>Government<br />Scholarship</p>
                  </div>
                  <div style={{ color: "#a78bfa", fontSize: "22px", fontWeight: 900 }}>→</div>
                  <div
                    style={{
                      background: "rgba(0,0,0,0.22)",
                      borderRadius: "12px",
                      padding: "10px 10px 8px",
                      border: "1px solid rgba(255,255,255,0.2)",
                      minWidth: "72px"
                    }}
                  >
                    <div style={{ fontSize: "28px" }}>💳</div>
                    <p style={{ fontSize: "11px", margin: 0, fontWeight: 600 }}>DBT<br />System</p>
                  </div>
                  <div style={{ color: "#a78bfa", fontSize: "22px", fontWeight: 900 }}>→</div>
                  <div
                    style={{
                      background: "rgba(0,0,0,0.22)",
                      borderRadius: "12px",
                      padding: "10px 10px 8px",
                      border: "1px solid rgba(255,255,255,0.2)",
                      minWidth: "72px"
                    }}
                  >
                    <div style={{ fontSize: "28px" }}>🏦</div>
                    <p style={{ fontSize: "11px", margin: 0, fontWeight: 600 }}>Bank<br />Account</p>
                  </div>
                </div>
                <div style={{ fontSize: "36px", marginBottom: "10px" }}>🎓</div>
                <div
                  style={{
                    background: "rgba(16,185,129,0.25)",
                    borderRadius: "10px",
                    padding: "12px 14px",
                    border: "1px solid rgba(52,211,153,0.4)"
                  }}
                >
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>✅ Scholarship credited seamlessly</p>
                  <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "rgba(255,255,255,0.85)" }}>
                    Directly to student's DBT-enabled bank account
                  </p>
                </div>
                <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div
                    style={{
                      background: "rgba(0,0,0,0.2)",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      fontSize: "12.5px"
                    }}
                  >
                    💡 <strong style={{ color: "#c4b5fd" }}>Key:</strong> Only DBT-enabled accounts receive funds
                  </div>
                  <div
                    style={{
                      background: "rgba(0,0,0,0.2)",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      fontSize: "12.5px"
                    }}
                  >
                    🔐 <strong style={{ color: "#c4b5fd" }}>Safe:</strong> End-to-end DBT Seeding Guidance via NPCI &amp; Aadhaar parameters
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ============================================ F1 INFO CARDS ============================================ */}
        <div className="pro-info-grid">
          <div className="f1-card f1-blue">
            <h4>🎓 About Platform</h4>
            <p>Privacy-focused pre-submission readiness platform preparing your application before official portals.</p>
          </div>
          <div className="f1-card f1-green">
            <h4>🔒 Privacy First</h4>
            <p>Documents auto-deleted after extraction. Zero permanent storage.</p>
          </div>
          <div className="f1-card f1-purple">
            <h4>⚡ No Login Needed</h4>
            <p>Upload documents and verify immediately without creating an account.</p>
          </div>
        </div>

      </main>

      {/* ============================================ FLOATING PRE-SUBMISSION ADVISORY BANNER (Matching Reference Image 3) ============================================ */}
      <div className="newsletter-float-wrap">
        <div className="newsletter-float-card">
          <div className="newsletter-student-img-box">
            <img
              src="/scholarship-banner.jpg"
              alt="Scholarship Certificate and Graduation Cap"
              className="newsletter-student-img"
            />
          </div>
          <div className="newsletter-banner-body">
            <div className="banner-top-row">
              <span className="simple-banner-tag">📢 IMPORTANT SCHOLARSHIP MESSAGE</span>
              <span className="banner-advisory-pill">🛡️ Pre-Submission Student Advisory</span>
            </div>

            <h3 className="simple-banner-heading">
              Before applying, verify your documents, eligibility and DBT readiness to reduce preventable application errors and payment delays.
            </h3>

            {/* 3 Quick Verification Steps */}
            <div className="banner-steps-grid">
              <div className="banner-step-pill">
                <span className="step-num">1</span>
                <div>
                  <strong>Document Mismatch Check</strong>
                  <p>Name &amp; DOB spelling match between Aadhaar &amp; Marks Card</p>
                </div>
              </div>
              <div className="banner-step-pill">
                <span className="step-num">2</span>
                <div>
                  <strong>Bank DBT / NPCI Seeding</strong>
                  <p>Ensure bank account is mapped for direct government credit</p>
                </div>
              </div>
              <div className="banner-step-pill">
                <span className="step-num">3</span>
                <div>
                  <strong>15+ Scheme Eligibility</strong>
                  <p>Confirm category &amp; income limits before NSP submission</p>
                </div>
              </div>
            </div>

            <div className="simple-trust-row">
              <div className="simple-trust-badges">
                <span>✅ 100% Zero-Storage Privacy</span>
                <span>⚡ Instant Error Detection</span>
                <span>🎓 Central &amp; State Schemes</span>
              </div>
              <button
                onClick={() => handleNavigation("/documents")}
                className="banner-verify-btn"
                style={{ border: "none", cursor: "pointer" }}
              >
                <span>🚀 Start Pre-Check Now</span>
                <span>↑</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ 5-COLUMN SGP PORTAL FOOTER ============================================ */}
      <footer className="edura-footer">
        <div className="edura-footer-container">

          {/* Col 1: Brand */}
          <div className="edura-footer-col edura-col-brand">
            <div className="edura-brand-row">
              <div className="edura-brand-icon">
                <img src="/sgp-emblem.png" alt="SGP Logo" className="footer-logo-img" />
              </div>
              <div className="edura-brand-title">
                <h2>SGP PORTAL</h2>
                <span>SCHOLARSHIP GUIDANCE PLATFORM</span>
              </div>
            </div>
            <p className="edura-brand-desc">
              Smart pre-submission verification system helping students verify certificates, check 15+ central and state schemes, and ensure 100% DBT bank readiness before applying.
            </p>
            <div className="edura-follow-section">
              <h6>FOLLOW US ON:</h6>
              <div className="edura-social-pills">
                <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Official Facebook">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14C17.17 2.1 15.95 2 14.66 2 11.98 2 10 3.66 10 6.7v2.8H7v4h3V22h4v-8.5z" />
                  </svg>
                </a>
                <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="Official X (Twitter)">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="Official LinkedIn">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
                  </svg>
                </a>
                <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer" aria-label="Official YouTube">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.5V8.5l6.3 3.5-6.3 3.5z" />
                  </svg>
                </a>
                <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Official Instagram">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2c2.7 0 3.05.01 4.12.06 1.06.05 1.79.22 2.43.47.66.26 1.22.6 1.77 1.15.55.55.89 1.11 1.15 1.77.25.64.42 1.37.47 2.43.05 1.07.06 1.42.06 4.12s-.01 3.05-.06 4.12c-.05 1.06-.22 1.79-.47 2.43a4.9 4.9 0 0 1-1.15 1.77 4.9 4.9 0 0 1-1.77 1.15c-.64.25-1.37.42-2.43.47-1.07.05-1.42.06-4.12.06s-3.05-.01-4.12-.06c-1.06-.05-1.79-.22-2.43-.47a4.9 4.9 0 0 1-1.77-1.15 4.9 4.9 0 0 1-1.15-1.77c-.25-.64-.42-1.37-.47-2.43C2.01 15.05 2 14.7 2 12s.01-3.05.06-4.12c.05-1.06.22-1.79.47-2.43.26-.66.6-1.22 1.15-1.77A4.9 4.9 0 0 1 5.45.53C6.09.28 6.82.11 7.88.06 8.95.01 9.3 0 12 0zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zm5.2-8.4a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="edura-footer-col">
            <h4 className="edura-col-title">Portal Features</h4>
            <ul className="edura-links-list">
              <li><button onClick={() => handleNavigation("/documents")}>• Certificate Verification</button></li>
              <li><button onClick={() => handleNavigation("/eligibility")}>• Scheme Pre-Check</button></li>
              <li><button onClick={() => handleNavigation("/nsp")}>• Prepare for NSP</button></li>
              <li><button onClick={() => handleNavigation("/readiness")}>• Bank &amp; DBT Mapping</button></li>
              <li><button onClick={() => handleNavigation("/readiness")}>• Readiness Score Pre-Check</button></li>
              <li><button onClick={() => handleNavigation("/documents")}>• Document Error Scanner</button></li>
              <li><button onClick={() => handleNavigation("/scholarship")}>• Scholarship Live Updates</button></li>
            </ul>
          </div>

          {/* Col 3: Govt Scholarship Portals */}
          <div className="edura-footer-col">
            <h4 className="edura-col-title">Official Portals</h4>
            <ul className="edura-links-list">
              <li><a href="https://scholarships.gov.in" target="_blank" rel="noopener noreferrer">• National Scholarship Portal</a></li>
              <li><a href="https://scholarships.gov.in" target="_blank" rel="noopener noreferrer">• Central Sector Scheme (CSSS)</a></li>
              <li><a href="https://scholarships.gov.in" target="_blank" rel="noopener noreferrer">• Post Matric Scholarship (PMS)</a></li>
              <li><a href="https://www.aicte-india.org" target="_blank" rel="noopener noreferrer">• AICTE Pragati &amp; Saksham</a></li>
              <li><a href="https://dbtbharat.gov.in" target="_blank" rel="noopener noreferrer">• DBT Bharat Portal</a></li>
              <li><a href="https://myaadhaar.uidai.gov.in" target="_blank" rel="noopener noreferrer">• UIDAI Aadhaar Portal</a></li>
            </ul>
          </div>

          {/* Col 4: Student Resources */}
          <div className="edura-footer-col">
            <h4 className="edura-col-title">Student Resources</h4>
            <ul className="edura-links-list">
              <li><a href="https://dbtbharat.gov.in" target="_blank" rel="noopener noreferrer">• Aadhaar &amp; DBT Guide</a></li>
              <li><a href="https://scholarships.gov.in" target="_blank" rel="noopener noreferrer">• Rejection Prevention Tips</a></li>
              <li><button onClick={() => scrollToSection("features-section")}>• Verification FAQs</button></li>
              <li><button onClick={() => scrollToSection("features-section")}>• Document Guidelines</button></li>
              <li><button onClick={() => scrollToSection("warningBanner")}>• Privacy &amp; Data Safety</button></li>
              <li><a href="tel:01206619540">• NSP Help Desk (0120-6619540)</a></li>
            </ul>
          </div>

          {/* Col 5: Get in touch! */}
          <div className="edura-footer-col edura-col-touch">
            <h4 className="edura-col-title">Get in touch!</h4>
            <p className="edura-touch-desc">
              Dedicated student guidance for scholarship pre-submission checks, document matching, and DBT bank seeding verification.
            </p>
            <div className="edura-contact-list">
              <div className="edura-contact-row">
                <span className="ic-blue">✉️</span>
                <a href="mailto:[sgp.reports.system@gmail.com]" style={{ color: "#CBD5E1", textDecoration: "none" }}>sgp.reports.system@gmail.com</a>
              </div>
              <div className="edura-contact-row">
                <span className="ic-blue">📞</span>
                <a href="tel:+919900000000" style={{ color: "#CBD5E1", textDecoration: "none" }}>+91 99000 00000</a>
              </div>
              <div className="edura-contact-row">
                <span className="ic-blue">☎️</span>
                <a href="tel:01206619540" style={{ color: "#CBD5E1", textDecoration: "none" }}>SGP Helpline: +91-9900000000</a>
              </div>
            </div>
            <div className="edura-accent-chevrons">
              <span>›</span><span>›</span><span>›</span>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="edura-footer-bottom">
          <div className="edura-bottom-container">
            <div className="edura-copy">
              Copyright &copy; 2026 <strong>Scholarship Guidance Platform (SGP)</strong>. All Rights Reserved.
            </div>
            <div className="edura-legal-links">
              <a href="https://dbtbharat.gov.in" target="_blank" rel="noopener noreferrer">DBT Bharat</a>
              <button className="footer-legal-btn" onClick={() => scrollToSection("warningBanner")}>Privacy Policy</button>
              <button className="footer-legal-btn" onClick={() => scrollToSection("features-section")}>Terms of Use</button>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default Dashboard;

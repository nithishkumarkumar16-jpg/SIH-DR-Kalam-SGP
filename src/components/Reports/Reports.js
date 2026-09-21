import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import LanguageSelector from "../LanguageSelector/LanguageSelector";
import { shouldUseMockCaptcha, buildLocalMockCaptchaToken } from "../DocumentUpload/captchaConfig";
import "./Reports.css";

// ============================================
const BACKEND = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/$/, "");
const RECAPTCHA_ENTERPRISE_SITE_KEY = process.env.REACT_APP_RECAPTCHA_ENTERPRISE_SITE_KEY || "";
const SHOULD_USE_MOCK_CAPTCHA = shouldUseMockCaptcha(RECAPTCHA_ENTERPRISE_SITE_KEY, process.env.NODE_ENV);

function loadRecaptcha() {
  return new Promise((res) => {
    if (window.grecaptcha?.enterprise) { res(); return; }
    const existing = document.querySelector('script[data-sgp-recaptcha-enterprise]');
    if (existing) {
      if (window.grecaptcha?.enterprise) { res(); return; }
      existing.addEventListener("load", () => res(), { once: true });
      existing.addEventListener("error", () => res(), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.dataset.sgpRecaptchaEnterprise = "true";
    s.src = "https://www.google.com/recaptcha/enterprise.js?render=explicit";
    s.onload = () => res();
    s.onerror = () => res();
    document.head.appendChild(s);
  });
}

function Reports() {
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [captchaToken, setCaptchaToken] = useState(
    SHOULD_USE_MOCK_CAPTCHA ? buildLocalMockCaptchaToken() : ""
  );
  const captchaContainer = useRef(null);
  const captchaWidgetId = useRef(null);

  useEffect(() => {
    if (SHOULD_USE_MOCK_CAPTCHA || !RECAPTCHA_ENTERPRISE_SITE_KEY) return;
    loadRecaptcha().then(() => {
      if (!window.grecaptcha?.enterprise || !captchaContainer.current || !RECAPTCHA_ENTERPRISE_SITE_KEY) return;
      window.grecaptcha.enterprise.ready(() => {
        if (captchaWidgetId.current !== null || !captchaContainer.current || typeof window.grecaptcha.enterprise.render !== "function") return;
        captchaWidgetId.current = window.grecaptcha.enterprise.render(captchaContainer.current, {
          sitekey: RECAPTCHA_ENTERPRISE_SITE_KEY,
          callback: (token) => setCaptchaToken(token),
          "expired-callback": () => setCaptchaToken(""),
          "error-callback": () => setCaptchaToken(""),
        });
      });
    });
    return () => {
      if (captchaWidgetId.current !== null) {
        window.grecaptcha?.enterprise?.reset?.(captchaWidgetId.current);
        captchaWidgetId.current = null;
      }
    };
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    issueType: "",
    message: "",
    comment: ""
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0 && !formData.issueType && !formData.message && !formData.comment) {
      setStatus({ type: "error", text: "Please select an issue type, describe your issue, or give a star rating before submitting." });
      return;
    }

    const effectiveCaptcha = captchaToken || (SHOULD_USE_MOCK_CAPTCHA ? buildLocalMockCaptchaToken() : "");
    if (!effectiveCaptcha) {
      setStatus({ type: "error", text: "Please complete the CAPTCHA verification before submitting." });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch(`${BACKEND}/api/send-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name || "Anonymous",
          email: formData.email || "",
          issueType: formData.issueType || "",
          message: formData.message || "",
          comment: formData.comment || "",
          rating: rating || 0,
          captchaToken: effectiveCaptcha
        })
      });

      const data = await response.json().catch(() => null);

      if (response.ok) {
        setStatus({ type: "success", text: data?.message || "Report sent successfully. Thank you for your feedback." });
        setFormData({ name: "", email: "", issueType: "", message: "", comment: "" });
        setRating(0);
        if (captchaWidgetId.current !== null) {
          window.grecaptcha?.enterprise?.reset?.(captchaWidgetId.current);
          setCaptchaToken(SHOULD_USE_MOCK_CAPTCHA ? buildLocalMockCaptchaToken() : "");
        }
      } else {
        throw new Error(data?.error || "Report service is currently unavailable.");
      }

    } catch (err) {
      console.error("Report submission failed:", err);
      setStatus({ type: "error", text: err?.message || "Submission failed. Please try again later." });
    } finally {
      setLoading(false);
    }
  };

  const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  return (
    <div className="reports-page">
      <header className="reports-header">
        <div className="reports-header-brand">
          <h1>Reports &amp; Feedback</h1>
          <p>Report issues and share your scholarship portal experience</p>
        </div>
        <div className="reports-header-actions">
          <button className="reports-back-btn" onClick={() => navigate("/dashboard")}>
            Back To Dashboard
          </button>
          <LanguageSelector />
        </div>
      </header>

      <div className="reports-card">

        {/* Header */}
        <div className="card-header">
          <div className="header-icons">
            <span>🛠</span>
            <span>⭐</span>
          </div>
          <h1>Help &amp; Feedback</h1>
          <p>Report a problem or share your experience with the scholarship portal.</p>
        </div>

        <form onSubmit={handleSubmit}>

          <div className="divider"><span>Report an Issue</span></div>

          {/* Name + Email */}
          <div className="form-row">
            <div className="field-group">
              <label>Name <span className="req">*</span></label>
              <input type="text" name="name" placeholder="Your full name"
                value={formData.name} onChange={handleChange} required />
            </div>
            <div className="field-group">
              <label>Email <span className="req">*</span></label>
              <input type="email" name="email" placeholder="your@email.com"
                value={formData.email} onChange={handleChange} required />
            </div>
          </div>

          {/* Issue Type */}
          <div className="field-group">
            <label>Issue Type <span className="opt">(optional)</span></label>
            <select name="issueType" value={formData.issueType} onChange={handleChange}>
              <option value="">Select issue type</option>
              <option>Document Upload Issue</option>
              <option>Verification Error</option>
              <option>Portal Not Working</option>
              <option>Eligibility Question</option>
              <option>Other</option>
            </select>
          </div>

          {/* Description */}
          <div className="field-group">
            <label>Description <span className="opt">(optional)</span></label>
            <textarea name="message" placeholder="Describe the issue in detail..."
              value={formData.message} onChange={handleChange}></textarea>
          </div>

          <div className="divider"><span>Write a Review</span></div>

          {/* Rating + Comments */}
          <div className="form-row rating-row">
            <div className="field-group rating-group">
              <label>Your Rating <span className="opt">(optional)</span></label>
              <div className="star-row">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button type="button" key={star}
                    className={`star-btn ${star <= (hoveredRating || rating) ? "filled" : ""}`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}>★</button>
                ))}
              </div>
              {(hoveredRating || rating) > 0 && (
                <span className="rating-label">{ratingLabels[hoveredRating || rating]}</span>
              )}
              <div className="rating-badge-row">
                {[1, 2, 3, 4, 5].map(n => (
                  <div key={n} className={`rating-badge ${rating >= n ? "active" : ""}`}
                    onClick={() => setRating(n)}>{n}</div>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label>Comments <span className="opt">(optional)</span></label>
              <textarea name="comment" placeholder="Share your experience with the portal..."
                value={formData.comment} onChange={handleChange} className="comment-area"></textarea>
            </div>
          </div>

          {!SHOULD_USE_MOCK_CAPTCHA && RECAPTCHA_ENTERPRISE_SITE_KEY && (
            <div className="field-group" style={{ display: "flex", justifyContent: "center", margin: "16px 0" }}>
              <div ref={captchaContainer} />
            </div>
          )}

          {/* Submit */}
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? <span className="spinner" /> : "Submit"}
          </button>

          {status && (
            <p className={`status-msg ${status.type}`}>
              {status.type === "success" ? "✅" : "❌"} {status.text}
            </p>
          )}

        </form>
      </div>
    </div>
  );
}

export default Reports;

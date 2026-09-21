import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { apiRequest } from "../../utils/api";
import "./ActivateAccount.css";

export default function ActivateAccount() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenFromUrl);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (tokenFromUrl) {
      verifyToken(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  const verifyToken = async (tok) => {
    if (!tok || tok.trim().length < 16) {
      setVerifyError("Please provide a valid 64-character account activation token.");
      return;
    }
    setVerifying(true);
    setVerifyError(null);
    try {
      const data = await apiRequest(`/api/auth/verify-activation-token?token=${encodeURIComponent(tok.trim())}`);
      if (data?.valid) {
        setTokenInfo(data);
      } else {
        setVerifyError(data?.error || "Activation token is invalid or has expired.");
      }
    } catch (err) {
      setVerifyError(err.message || "Failed to verify activation token.");
    } finally {
      setVerifying(false);
    }
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest("/api/auth/activate-account", {
        method: "POST",
        body: JSON.stringify({
          token: token.trim(),
          password,
        }),
      });

      if (res?.success) {
        setSuccess(true);
      } else {
        setError(res?.error || "Failed to activate account.");
      }
    } catch (err) {
      setError(err.message || "Failed to activate account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="activate-page">
      <div className="activate-header">
        <img src="/sgp-emblem.png" alt="SGP Emblem" className="activate-emblem" />
        <div>
          <h2>Scholarship Guidance Platform (SGP)</h2>
          <p>Student Account Activation &amp; Secure Password Setup</p>
        </div>
      </div>

      <div className="activate-card">
        {success ? (
          <div className="activate-success-card">
            <div className="success-icon">✅</div>
            <h3>Account Successfully Activated!</h3>
            <p>
              Your personal password has been securely set and encrypted with bcrypt.
              You can now log into your student portal using your registered email and new password.
            </p>
            <div className="security-notice">
              🔒 <strong>Privacy Assurance:</strong> Your password is fully confidential.
              College and Ministry administrators cannot view, access, or retrieve your password.
            </div>
            <button className="btn-proceed-login" onClick={() => navigate("/login")}>
              Proceed to Student Login →
            </button>
          </div>
        ) : (
          <>
            <div className="card-header-badge">
              <span>Secure Invitation Activation</span>
            </div>

            <h3>Set Your Personal Password</h3>
            <p className="activate-sub">
              Students set their own passwords through secure account activation. College Admin never receives or sees student passwords.
            </p>

            {error && <div className="activate-alert-error">⚠️ {error}</div>}
            {verifyError && <div className="activate-alert-error">⚠️ {verifyError}</div>}

            {/* If token not provided in URL, allow student to paste token */}
            {!tokenInfo && (
              <div className="manual-token-box">
                <label>Activation Token (from invitation link):</label>
                <div className="token-input-row">
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Enter 64-character activation token"
                  />
                  <button
                    type="button"
                    className="btn-verify-token"
                    disabled={verifying || !token.trim()}
                    onClick={() => verifyToken(token)}
                  >
                    {verifying ? "Checking..." : "Verify Token"}
                  </button>
                </div>
              </div>
            )}

            {verifying && (
              <div className="verifying-indicator">
                ⏳ Verifying your single-use invitation token...
              </div>
            )}

            {tokenInfo && (
              <div className="student-verified-banner">
                <div className="verified-row">
                  <span className="v-label">Student Name:</span>
                  <span className="v-val"><strong>{tokenInfo.fullName}</strong></span>
                </div>
                <div className="verified-row">
                  <span className="v-label">Registered Email:</span>
                  <span className="v-val">{tokenInfo.email}</span>
                </div>
                {tokenInfo.registerNumber && (
                  <div className="verified-row">
                    <span className="v-label">Register Number:</span>
                    <span className="v-val">{tokenInfo.registerNumber}</span>
                  </div>
                )}
                {tokenInfo.collegeName && (
                  <div className="verified-row">
                    <span className="v-label">Institution:</span>
                    <span className="v-val">{tokenInfo.collegeName}</span>
                  </div>
                )}
              </div>
            )}

            {tokenInfo && (
              <form onSubmit={handleActivate} className="activate-form">
                <div className="form-group">
                  <label>Create New Password (min. 6 characters):</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    required
                    minLength={6}
                  />
                </div>

                <div className="form-group">
                  <label>Confirm New Password:</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    minLength={6}
                  />
                </div>

                <div className="password-privacy-note">
                  🛡️ <strong>Zero Admin Visibility:</strong> Your password is encrypted using high-work-factor bcrypt hashing. It is never logged in plaintext or shared with staff.
                </div>

                <button
                  type="submit"
                  className="btn-submit-activation"
                  disabled={submitting || !password || !confirmPassword}
                >
                  {submitting ? "Activating Account..." : "Activate Account & Set Password →"}
                </button>
              </form>
            )}

            <div className="activate-footer-links">
              <span>Already activated your account?</span>
              <Link to="/login">Sign in here</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";
import LanguageSelector from "../LanguageSelector/LanguageSelector";
import "./StudentProfile.css";

export default function StudentProfile() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await apiRequest("/api/student/profile");
      if (data?.student) {
        setStudent(data.student);
      }
    } catch (err) {
      setError("Failed to load student profile: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setStudent((p) => ({
      ...p,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const data = await apiRequest("/api/student/profile", {
        method: "PUT",
        body: JSON.stringify(student),
      });
      setMessage("Profile saved successfully!");
      if (data.student) setStudent(data.student);
      await refreshUser();
    } catch (err) {
      setError("Failed to save profile: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
        <p>Loading Student Profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <header className="profile-header">
        <div className="profile-header-container">
          <div className="brand" onClick={() => navigate("/dashboard")} style={{ cursor: "pointer" }}>
            <img src="/sgp-emblem.png" alt="SGP Emblem" />
            <div>
              <h2>Scholarship Guidance Platform</h2>
              <p>Student Profile &amp; Verification Vault</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="nav-back-btn" onClick={() => navigate("/dashboard")}>
              ← Back to Dashboard
            </button>
            <LanguageSelector />
          </div>
        </div>
      </header>

      <main className="profile-main-container">
        <div className="profile-top-banner">
          <div>
            <h1>{student?.fullName || "Student Profile"}</h1>
            <p>
              Student ID: <strong>{student?.studentId}</strong> &bull; College: <strong>{student?.collegeId}</strong>
            </p>
          </div>
          <div className="badge-group">
            <span className="pill-badge pill-blue">🎓 {student?.course || "UG"}</span>
            <span className="pill-badge pill-purple">🏛️ {student?.studyYear || "Year"}</span>
            <span className="pill-badge pill-green">🏷️ {student?.category || "Category"}</span>
          </div>
        </div>

        {message && <div className="alert alert-success">✅ {message}</div>}
        {error && <div className="alert alert-error">⚠️ {error}</div>}

        <form onSubmit={handleSave} className="profile-form">
          {/* SECTION 1: PERSONAL & CONTACT */}
          <div className="form-card">
            <h3>👤 Basic Identity &amp; Contact Details</h3>
            <div className="grid-2">
              <div className="form-group">
                <label>Full Legal Name (as per Certificate)</label>
                <input
                  type="text"
                  name="fullName"
                  value={student?.fullName || ""}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={student?.dateOfBirth || ""}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Gender</label>
                <select name="gender" value={student?.gender || "Male"} onChange={handleChange}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div className="form-group">
                <label>State Domicile</label>
                <input
                  type="text"
                  name="state"
                  value={student?.state || "Tamil Nadu"}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Home District</label>
                <input
                  type="text"
                  name="district"
                  value={student?.district || ""}
                  onChange={handleChange}
                  placeholder="e.g. Coimbatore, Salem"
                />
              </div>

              <div className="form-group">
                <label>Residential Address (Optional)</label>
                <input
                  type="text"
                  name="address"
                  value={student?.address || ""}
                  onChange={handleChange}
                  placeholder="Street / Village / Post"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: ACADEMIC DETAILS */}
          <div className="form-card">
            <h3>🎓 Academic Affiliation</h3>
            <div className="grid-2">
              <div className="form-group">
                <label>Degree / Course</label>
                <input
                  type="text"
                  name="course"
                  value={student?.course || ""}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Department / Branch</label>
                <input
                  type="text"
                  name="department"
                  value={student?.department || ""}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Current Study Year</label>
                <select name="studyYear" value={student?.studyYear || "1st Year"} onChange={handleChange}>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>

              <div className="form-group">
                <label>Semester</label>
                <input
                  type="text"
                  name="semester"
                  value={student?.semester || ""}
                  onChange={handleChange}
                  placeholder="e.g. 4th Semester"
                />
              </div>

              <div className="form-group">
                <label>College Register / Roll Number</label>
                <input
                  type="text"
                  name="registerNumber"
                  value={student?.registerNumber || ""}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Academic Year</label>
                <input
                  type="text"
                  name="academicYear"
                  value={student?.academicYear || "2026-2027"}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: SCHOLARSHIP-SPECIFIC DETAILS */}
          <div className="form-card">
            <h3>💰 Statutory Scheme Criteria</h3>
            <div className="grid-2">
              <div className="form-group">
                <label>Community / Category</label>
                <select name="category" value={student?.category || "General"} onChange={handleChange}>
                  <option value="ST">ST (Scheduled Tribe)</option>
                  <option value="SC">SC (Scheduled Caste)</option>
                  <option value="BC">BC (Backward Class)</option>
                  <option value="MBC">MBC / DNC</option>
                  <option value="OBC">OBC</option>
                  <option value="EBC">EBC</option>
                  <option value="Minority">Minority</option>
                  <option value="General">General / Open</option>
                </select>
              </div>

              <div className="form-group">
                <label>Annual Family Income (₹)</label>
                <input
                  type="number"
                  name="familyIncome"
                  value={student?.familyIncome || 0}
                  onChange={handleChange}
                  required
                />
                <small style={{ color: "#64748b", fontSize: "11px" }}>Must match Income Certificate.</small>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="firstGraduate"
                    checked={student?.firstGraduate || false}
                    onChange={handleChange}
                  />
                  <span>First Graduate in Family (Eligible for TN First Graduate Concession)</span>
                </label>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="disabilityStatus"
                    checked={student?.disabilityStatus || false}
                    onChange={handleChange}
                  />
                  <span>Differently-Abled / PwD (Benchmark ≥ 40%)</span>
                </label>
              </div>
            </div>
          </div>

          {/* SECTION 4: BANK DBT & PRIVACY VERIFICATION */}
          <div className="form-card">
            <h3>🏦 Bank DBT &amp; Seeding Status (Zero-Storage Safety)</h3>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 14px 0" }}>
              To ensure data privacy under SGP architecture, full Aadhaar and bank account numbers are never permanently stored.
            </p>
            <div className="grid-2">
              <div className="form-group">
                <label>Bank Account Type</label>
                <select name="bankAccountType" value={student?.bankAccountType || "Single"} onChange={handleChange}>
                  <option value="Single">Single (Individual Account — Recommended for DBT)</option>
                  <option value="Joint">Joint Account (May cause DBT rejection on some portals)</option>
                </select>
              </div>

              <div className="form-group checkbox-group" style={{ marginTop: "24px" }}>
                <label>
                  <input
                    type="checkbox"
                    name="bankSeededConfirmed"
                    checked={student?.bankSeededConfirmed || false}
                    onChange={handleChange}
                  />
                  <span>Confirmed: Aadhaar is seeded with NPCI for Direct Benefit Transfer</span>
                </label>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? "Saving Changes..." : "💾 Save Student Profile"}
            </button>
            <button type="button" className="app-flow-btn" onClick={() => navigate("/student/application")}>
              Proceed to Scholarship Application →
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";
import "./RegisterStudent.css";

export default function RegisterStudent() {
  const navigate = useNavigate();
  const { registerStudent } = useAuth();

  const [colleges, setColleges] = useState([]);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    mobile: "",
    collegeId: "",
    course: "B.E. / B.Tech",
    department: "Computer Science",
    studyYear: "1st Year",
    category: "General",
    familyIncome: "180000",
    state: "Tamil Nadu",
    district: "Coimbatore",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiRequest("/api/common/colleges")
      .then((data) => {
        if (data.colleges && data.colleges.length > 0) {
          setColleges(data.colleges);
          setFormData((p) => ({ ...p, collegeId: data.colleges[0].collegeId }));
        }
      })
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await registerStudent(formData);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Registration failed. Please check details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-header">
          <img src="/sgp-emblem.png" alt="SGP Emblem" className="register-logo" />
          <h2>Student Registration / Activation</h2>
          <p>Create your SGP account to manage your scholarship applications &amp; pre-submission verification.</p>
        </div>

        {error && <div className="register-error-box">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-grid">
            <div className="form-field full-width">
              <label>Full Name (as per Aadhaar / 10th Marksheet) *</label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g. PRIYA M"
              />
            </div>

            <div className="form-field">
              <label>Official Email Address *</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="priya@example.com"
              />
            </div>

            <div className="form-field">
              <label>Password (Min 6 characters) *</label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                placeholder="Choose a secure password"
              />
            </div>

            <div className="form-field">
              <label>Mobile Number</label>
              <input
                type="tel"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                placeholder="10-digit mobile"
              />
            </div>

            <div className="form-field">
              <label>Affiliated College / Institution *</label>
              <select name="collegeId" value={formData.collegeId} onChange={handleChange} required>
                {colleges.map((c) => (
                  <option key={c.collegeId} value={c.collegeId}>
                    {c.collegeName} ({c.district})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Degree / Course *</label>
              <select name="course" value={formData.course} onChange={handleChange}>
                <option value="B.E. / B.Tech">B.E. / B.Tech</option>
                <option value="M.E. / M.Tech">M.E. / M.Tech</option>
                <option value="B.Sc / M.Sc">B.Sc / M.Sc</option>
                <option value="B.A / M.A">B.A / M.A</option>
                <option value="Diploma">Diploma</option>
                <option value="Ph.D">Ph.D Research</option>
              </select>
            </div>

            <div className="form-field">
              <label>Department / Branch *</label>
              <input
                type="text"
                name="department"
                required
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g. Computer Science"
              />
            </div>

            <div className="form-field">
              <label>Year of Study *</label>
              <select name="studyYear" value={formData.studyYear} onChange={handleChange}>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>

            <div className="form-field">
              <label>Community / Category *</label>
              <select name="category" value={formData.category} onChange={handleChange}>
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

            <div className="form-field">
              <label>Annual Family Income (₹) *</label>
              <input
                type="number"
                name="familyIncome"
                required
                value={formData.familyIncome}
                onChange={handleChange}
                placeholder="e.g. 180000"
              />
            </div>

            <div className="form-field">
              <label>District</label>
              <input
                type="text"
                name="district"
                value={formData.district}
                onChange={handleChange}
                placeholder="e.g. Coimbatore"
              />
            </div>
          </div>

          <button type="submit" className="register-submit-btn" disabled={loading}>
            {loading ? "Creating Student Profile..." : "Complete Registration & Access Dashboard →"}
          </button>
        </form>

        <div className="register-footer">
          Already have an account? <Link to="/login">Sign In here</Link>
        </div>
      </div>
    </div>
  );
}

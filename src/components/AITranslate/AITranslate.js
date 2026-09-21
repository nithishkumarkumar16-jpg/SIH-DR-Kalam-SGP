import React, { useEffect, useState, useRef } from "react";
import "./AITranslate.css";

const LANGUAGES = [
  { code: "en", label: "English",   flag: "🇬🇧" },
  { code: "hi", label: "Hindi",     flag: "🇮🇳" },
  { code: "ta", label: "Tamil",     flag: "🇮🇳" },
  { code: "te", label: "Telugu",    flag: "🇮🇳" },
  { code: "kn", label: "Kannada",   flag: "🇮🇳" },
  { code: "ml", label: "Malayalam", flag: "🇮🇳" },
];

function setGoogTranslateCookie(langCode) {
  const value = langCode === "en" ? "" : "/en/" + langCode;
  document.cookie = "googtrans=" + value + "; path=/";
  document.cookie =
    "googtrans=" + value + "; path=/; domain=" + window.location.hostname;
}

function AITranslate() {
  const [open, setOpen]         = useState(false);
  const [selected, setSelected] = useState(LANGUAGES[0]);
  const dropdownRef             = useRef(null);
  const btnRef                  = useRef(null);

  // Load Google Translate script once
  useEffect(() => {
    if (document.getElementById("gt-script")) return;

    window.googleTranslateElementInit = function () {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: "hi,ta,te,kn,ml",
          autoDisplay: false,
        },
        "gt_hidden_container"
      );
    };

    const script = document.createElement("script");
    script.id    = "gt-script";
    script.src   =
      "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // Read current cookie on mount to show correct selected language
  useEffect(() => {
    const match = document.cookie.match(/googtrans=\/en\/([a-z]+)/);
    if (match) {
      const found = LANGUAGES.find((l) => l.code === match[1]);
      if (found) setSelected(found);
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleOutside(e) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      )
        setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleSelect = (lang) => {
    setSelected(lang);
    setOpen(false);
    setGoogTranslateCookie(lang.code);
    window.location.reload();
  };

  const getPos = () => {
    if (!btnRef.current) return { top: 60, right: 16 };
    const r = btnRef.current.getBoundingClientRect();
    return { top: r.bottom + 8, right: window.innerWidth - r.right };
  };

  return (
    <>
      <div
        id="gt_hidden_container"
        style={{
          position: "absolute",
          visibility: "hidden",
          height: 0,
          overflow: "hidden",
        }}
      />

      <div className="gt-wrapper">
        <button
          ref={btnRef}
          className={`gt-btn ${open ? "active" : ""}`}
          onClick={() => setOpen((p) => !p)}
        >
          <span className="gt-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </span>
          <span className="gt-label">Translate</span>
          <span className="gt-current">
            {selected.flag} {selected.label}
          </span>
          <span className="gt-chevron">{open ? "▲" : "▼"}</span>
        </button>

        {open && (
          <div
            ref={dropdownRef}
            className="gt-dropdown"
            style={{ top: getPos().top, right: getPos().right }}
          >
            <div className="gt-dropdown-header">🌐 Choose Language</div>
            <div className="gt-list">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  className={`gt-item ${
                    selected.code === lang.code ? "selected" : ""
                  }`}
                  onClick={() => handleSelect(lang)}
                >
                  <span className="gt-flag">{lang.flag}</span>
                  <span className="gt-name">{lang.label}</span>
                  {selected.code === lang.code && (
                    <span className="gt-check">✓</span>
                  )}
                </button>
              ))}
            </div>
            <div className="gt-footer">Powered by Google Translate</div>
          </div>
        )}
      </div>
    </>
  );
}

export default AITranslate;
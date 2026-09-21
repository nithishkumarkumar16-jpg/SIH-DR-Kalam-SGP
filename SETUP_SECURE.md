# SGP Secure Document Flow — Setup Guide

## 9-Step Flow Summary

```
User Upload → Enterprise CAPTCHA → Session Token → Local Image Resize
→ Client Masking → Backend Auth → Rate Limit + IP Check
→ Server Masking → Groq AI → Response Validation → Output
```

---

## 1. Get API Keys

### Google reCAPTCHA Enterprise (Web)
1. In Google Cloud, open **Security → Fraud Defense → reCAPTCHA Enterprise**.
2. Create or select an **Enterprise WEB** key.
3. Add `localhost`, `127.0.0.1`, and `sgp-scholarship.pages.dev` to its allowed domains. Keep domain verification enabled.
4. Copy the public **Enterprise site key** to the frontend environment:
   ```js
   REACT_APP_RECAPTCHA_ENTERPRISE_SITE_KEY=YOUR_ENTERPRISE_WEB_SITE_KEY
   ```
5. Copy the Google Cloud API key to `scholarship-backend/.env` only:
   ```
   RECAPTCHA_ENTERPRISE_PROJECT_ID=YOUR_PROJECT_ID
   RECAPTCHA_ENTERPRISE_API_KEY=YOUR_API_KEY
   RECAPTCHA_ENTERPRISE_SITE_KEY=YOUR_ENTERPRISE_WEB_SITE_KEY
   ```

### Groq API Key
Already in `.env`. Replace if rotated:
```
GROQ_API_KEY=your_groq_key_here
```

---

## 2. Backend Setup

```bash
cd scholarship-backend
npm install          # installs express-rate-limit
node server.js
```

You should see:
```
SGP Secure Backend → http://localhost:5000
Rate limit:  15 req / 10 min (analyse)
IP block:    after 40 hits
Sessions:    15-min TTL, max 10 analyses each
Groq:        Configured
reCAPTCHA:   Configured
```

---

## 3. Frontend Setup

```bash
npm install
npm run dev
```

---

## 4. How the Flow Works (Step by Step)

| Step | Where | What Happens |
|------|-------|-------------|
| 1 | Browser | User selects file — nothing sent anywhere |
| 2 | Browser | Enterprise web token is generated for the session action |
| 3 | Browser | "Confirm Human" button calls `POST /api/session/create` |
| 4 | Backend | CAPTCHA token verified with Google's API |
| 5 | Backend | Short-lived session token (32-byte random hex) issued |
| 6 | Browser | VERIFY clicked → `toB64()` resizes image locally |
| 7 | Browser | `maskText()` strips Aadhaar/PAN/phone from prompt |
| 8 | Browser | OCR and document extraction run locally; document bytes never leave the browser |
| 9 | Backend | Session validated, IP checked, rate limiter checked |
| 10 | Backend | Prompt masked again (server-side double-pass) |
| 11 | Backend | Groq called with safe image + safe prompt only |
| 12 | Backend | AI response validated (format + XSS check) |
| 13 | Browser | Clean result shown to user |

---

## 5. Security Protections Active

| Attack | Protection |
|--------|-----------|
| Bot spam | reCAPTCHA Enterprise token required before any AI call |
| API key theft | No API key in frontend — keys only in backend `.env` |
| Session abuse | 15-min TTL, max 10 uses per session |
| IP flooding | Blocked after 40 total hits (`ipHitStore`) |
| Rate spam | 15 requests / 10 min per IP (express-rate-limit) |
| Large payload | 10MB body limit, 7MB image cap |
| Aadhaar leak | Masked on client AND server before Groq call |
| PAN leak | Masked on client AND server before Groq call |
| Phone/email leak | Masked on client AND server before Groq call |
| Malicious AI output | Response validated — must be JSON with `isValid` boolean |
| XSS via AI response | Script tag check on every AI response |
| Invalid docType | Allowlist: only ms10, ms12, community, income accepted |

---

## 6. CAPTCHA security

There is no development bypass. Session creation always requires a token generated
by the Enterprise web API and verified by the Enterprise assessment API.

---

## 7. Files Changed

```
scholarship-backend/
  server.js          ← Full rewrite — 9-step secure flow
  .env               ← Added RECAPTCHA_SECRET
  package.json       ← Added express-rate-limit

src/components/DocumentUpload/
  DocumentUpload.js  ← Added maskText(), getSessionToken(), groqCall() rewrite,
                        CAPTCHA UI (Step 1), session state, gated VERIFY button
```

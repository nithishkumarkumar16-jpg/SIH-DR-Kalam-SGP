export function shouldUseMockCaptcha(siteKey = "", nodeEnv = process.env.NODE_ENV || "development") {
  const key = String(siteKey || "").trim();
  return !key && nodeEnv !== "production";
}

export function buildLocalMockCaptchaToken() {
  return "local-dev-mock-captcha-token";
}

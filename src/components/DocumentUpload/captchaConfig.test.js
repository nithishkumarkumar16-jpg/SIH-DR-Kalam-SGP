import { shouldUseMockCaptcha, buildLocalMockCaptchaToken } from "./captchaConfig";

describe("captchaConfig", () => {
  test("uses a mock CAPTCHA in local development when no enterprise key is configured", () => {
    expect(shouldUseMockCaptcha("", "development")).toBe(true);
    expect(shouldUseMockCaptcha("", "test")).toBe(true);
  });

  test("keeps the real CAPTCHA path enabled in production even with a key", () => {
    expect(shouldUseMockCaptcha("real-key", "production")).toBe(false);
  });

  test("creates a local mock token format", () => {
    expect(buildLocalMockCaptchaToken()).toMatch(/^local-dev-/);
  });
});

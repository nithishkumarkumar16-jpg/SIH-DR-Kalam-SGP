/**
 * Safe Formatting Utilities for SGP Analytics & Dashboards
 * Aligned with SIH26239 rules:
 * - Preserves valid zero values (₹0, 0, 0%)
 * - Shows "Not available" for missing or invalid data
 * - Shows "N/A" for percentages without valid denominators
 * - Never silently converts missing financial figures to 0
 * - Handles invalid or missing dates safely
 */

export function formatINR(val, fallback = "Not available") {
  if (val === 0 || val === "0") return "₹0";
  if (val === undefined || val === null || val === "" || typeof val === "boolean") return fallback;
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return `₹${num.toLocaleString("en-IN")}`;
}

export function formatCount(val, fallback = "Not available") {
  if (val === 0 || val === "0") return "0";
  if (val === undefined || val === null || val === "" || typeof val === "boolean") return fallback;
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return num.toLocaleString("en-IN");
}

export function formatPercent(val, fallback = "N/A") {
  if (val === "N/A" || val === null || val === undefined || val === "" || typeof val === "boolean") {
    return fallback;
  }
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return `${num}%`;
}

export function formatDateSafe(val, fallback = "Not available", options = {}) {
  if (!val) return fallback;
  const d = new Date(val);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleString("en-IN", options);
}

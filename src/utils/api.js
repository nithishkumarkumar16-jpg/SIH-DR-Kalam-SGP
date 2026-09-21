// Centralized API Client for SGP

const API_BASE = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/$/, "");

export function getToken() {
  try {
    return localStorage.getItem("sgp_token") || null;
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem("sgp_token", token);
    else localStorage.removeItem("sgp_token");
  } catch {}
}

export function getUser() {
  try {
    const raw = localStorage.getItem("sgp_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUser(user) {
  try {
    if (user) localStorage.setItem("sgp_user", JSON.stringify(user));
    else localStorage.removeItem("sgp_user");
  } catch {}
}

export function clearSession() {
  try {
    localStorage.removeItem("sgp_token");
    localStorage.removeItem("sgp_user");
  } catch {}
}

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    let errorMsg = data?.error || `Request failed with status ${response.status}`;
    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfterSeconds = retryAfterHeader
      ? parseInt(retryAfterHeader, 10)
      : data?.retryAfter || null;

    if (response.status === 429 && retryAfterSeconds) {
      errorMsg = `Too many requests. Please wait ${retryAfterSeconds} seconds before trying again.`;
    }

    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    err.retryAfter = retryAfterSeconds;
    throw err;
  }

  return data;
}

export async function downloadExcel(endpoint, defaultFilename = "SGP_Export.xlsx") {
  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;
  const headers = {};
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || `Export failed with status ${response.status}`);
  }

  const disposition = response.headers.get("Content-Disposition");
  let filename = defaultFilename;
  if (disposition && disposition.includes("filename=")) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) filename = match[1];
  }

  const recordsCount = response.headers.get("X-Export-Records") || null;

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(blobUrl);

  return { filename, recordsCount };
}

const api = {
  API_BASE,
  getToken,
  setToken,
  getUser,
  setUser,
  clearSession,
  apiRequest,
  downloadExcel,
  request: apiRequest,
};

export default api;

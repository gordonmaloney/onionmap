export class ApiError extends Error {
  constructor(message, status, body = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: options.body ? { "content-type": "application/json", ...options.headers } : options.headers,
    ...options,
  });
  if (response.ok) return response.status === 204 ? null : response.json();
  let body = null;
  try {
    body = await response.json();
  } catch {
    // An upstream failure may not return JSON.
  }
  throw new ApiError(body?.error || `Request failed (${response.status})`, response.status, body);
}

export const checkSession = () => request("/api/auth/session");
export const login = (password) =>
  request("/api/auth/login", { method: "POST", body: JSON.stringify({ password }) });
export const logout = () => request("/api/auth/logout", { method: "POST" });
export const fetchWorkspace = () => request("/api/workspace");
export const saveWorkspace = ({ expectedRevision, saveId, snapshot }) =>
  request("/api/workspace", {
    method: "PUT",
    body: JSON.stringify({ expectedRevision, saveId, snapshot }),
  });

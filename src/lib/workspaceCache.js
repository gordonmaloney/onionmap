export const WORKSPACE_CACHE_KEY = "onionmap.workspace.cache.v1";

export function readWorkspaceCache() {
  try {
    const value = JSON.parse(localStorage.getItem(WORKSPACE_CACHE_KEY) || "null");
    return value?.version === 1 ? value : null;
  } catch {
    return null;
  }
}

export function writeWorkspaceCache(value) {
  localStorage.setItem(
    WORKSPACE_CACHE_KEY,
    JSON.stringify({ version: 1, savedAt: new Date().toISOString(), ...value }),
  );
}

export function clearWorkspaceCache() {
  localStorage.removeItem(WORKSPACE_CACHE_KEY);
}

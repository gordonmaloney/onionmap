import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearWorkspaceCache, readWorkspaceCache, writeWorkspaceCache } from "./workspaceCache.js";

const values = new Map();
beforeEach(() => {
  values.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  });
});

describe("workspace recovery journal", () => {
  it("stores the acknowledged revision and unsaved working copy", () => {
    writeWorkspaceCache({ baseRevision: 4, acknowledgedSnapshot: { people: [] }, workingSnapshot: { people: [{ id: "p1" }] }, dirty: true });
    expect(readWorkspaceCache()).toMatchObject({ version: 1, baseRevision: 4, dirty: true, workingSnapshot: { people: [{ id: "p1" }] } });
  });

  it("ignores invalid cache data and can clear recovery state", () => {
    localStorage.setItem("onionmap.workspace.cache.v1", "not-json");
    expect(readWorkspaceCache()).toBeNull();
    clearWorkspaceCache();
    expect(localStorage.getItem("onionmap.workspace.cache.v1")).toBeNull();
  });
});

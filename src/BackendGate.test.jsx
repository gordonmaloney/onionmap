// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BackendGate from "./BackendGate.jsx";
import { EMPTY_SNAPSHOT } from "../server/config.js";
import { writeWorkspaceCache } from "./lib/workspaceCache.js";

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function installApi(workspace) {
  const calls = [];
  vi.stubGlobal("fetch", vi.fn(async (url, options = {}) => {
    calls.push({ url, options });
    if (url === "/api/auth/session") return new Response(null, { status: 204 });
    if (url === "/api/workspace" && !options.method) return jsonResponse(workspace);
    if (url === "/api/workspace" && options.method === "PUT")
      return jsonResponse({ revision: workspace.revision + 1, saveId: JSON.parse(options.body).saveId });
    return jsonResponse({ error: "not_found" }, 404);
  }));
  return calls;
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("confirm", vi.fn(() => true));
  vi.stubGlobal("alert", vi.fn());
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("backend workspace gate", () => {
  it("hydrates from the server without immediately writing it back", async () => {
    const calls = installApi({ revision: 0, snapshot: structuredClone(EMPTY_SNAPSHOT), updatedAt: new Date().toISOString() });
    render(<BackendGate />);
    await screen.findByRole("heading", { name: "Membership map" }, { timeout: 2_000 });
    await new Promise((resolve) => setTimeout(resolve, 750));
    expect(calls.filter((call) => call.options.method === "PUT")).toHaveLength(0);
  });

  it("resubmits a compatible unsaved recovery copy", async () => {
    const server = structuredClone(EMPTY_SNAPSHOT);
    const working = structuredClone(EMPTY_SNAPSHOT);
    working.settings.theme = "dark";
    writeWorkspaceCache({ baseRevision: 3, acknowledgedSnapshot: server, workingSnapshot: working, dirty: true });
    const calls = installApi({ revision: 3, snapshot: server, updatedAt: new Date().toISOString() });
    render(<BackendGate />);
    await waitFor(() => expect(calls.some((call) => call.options.method === "PUT")).toBe(true), { timeout: 2_000 });
    const save = JSON.parse(calls.find((call) => call.options.method === "PUT").options.body);
    expect(save.expectedRevision).toBe(3);
    expect(save.snapshot.settings.theme).toBe("dark");
  });

  it("stops and presents recovery choices for a stale local copy", async () => {
    const server = structuredClone(EMPTY_SNAPSHOT);
    const local = structuredClone(EMPTY_SNAPSHOT);
    local.settings.theme = "dark";
    writeWorkspaceCache({ baseRevision: 1, acknowledgedSnapshot: server, workingSnapshot: local, dirty: true });
    const calls = installApi({ revision: 2, snapshot: server, updatedAt: new Date().toISOString() });
    render(<BackendGate />);
    expect(await screen.findByText("Choose which copy to keep")).toBeVisible();
    expect(screen.getByRole("button", { name: "Download my copy" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Use server copy" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Replace server with mine" })).toBeVisible();
    expect(calls.filter((call) => call.options.method === "PUT")).toHaveLength(0);
  });
});

import { describe, expect, it } from "vitest";
import { EMPTY_SNAPSHOT } from "./config.js";
import { getOrCreateWorkspace, saveWorkspace } from "./workspace.js";

const query = (value) => ({
  lean: async () => structuredClone(value),
  select() { return this; },
});

function workspaceModel() {
  let document = null;
  return {
    get value() { return document; },
    findById() { return query(document); },
    findOneAndUpdate(filter, update, options) {
      if (!document && options?.upsert) {
        document = { _id: "primary", ...structuredClone(update.$setOnInsert), createdAt: new Date(), updatedAt: new Date() };
        return query(document);
      }
      if (!document || (filter.revision !== undefined && filter.revision !== document.revision)) return query(null);
      if (update.$set) Object.assign(document, structuredClone(update.$set));
      if (update.$inc) for (const [key, amount] of Object.entries(update.$inc)) document[key] += amount;
      document.updatedAt = new Date();
      return query(document);
    },
  };
}

describe("workspace persistence", () => {
  it("creates an empty canonical workspace", async () => {
    const model = workspaceModel();
    const result = await getOrCreateWorkspace(model);
    expect(result.revision).toBe(0);
    expect(result.snapshot).toEqual(EMPTY_SNAPSHOT);
  });

  it("supports atomic revisions, idempotent retries, and stale-write conflicts", async () => {
    const model = workspaceModel();
    await getOrCreateWorkspace(model);
    const snapshot = { ...structuredClone(EMPTY_SNAPSHOT), settings: { theme: "dark" } };
    const input = { expectedRevision: 0, saveId: "9d6fe869-ef63-4f94-8742-c0fca57d67b2", snapshot };
    await expect(saveWorkspace(model, input)).resolves.toMatchObject({ kind: "saved", revision: 1, idempotent: false });
    await expect(saveWorkspace(model, input)).resolves.toMatchObject({ kind: "saved", revision: 1, idempotent: true });
    await expect(saveWorkspace(model, { ...input, saveId: "37d3a590-1666-4ee1-8808-6bb4d2684235" })).resolves.toMatchObject({ kind: "conflict", currentRevision: 1 });
  });
});

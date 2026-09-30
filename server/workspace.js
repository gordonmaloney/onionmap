import { randomUUID } from "node:crypto";
import { EMPTY_SNAPSHOT, WORKSPACE_ID } from "./config.js";
import { parseSnapshot } from "./schema.js";

export async function getOrCreateWorkspace(Workspace) {
  const { snapshot, bytes } = parseSnapshot(structuredClone(EMPTY_SNAPSHOT));
  return Workspace.findOneAndUpdate(
    { _id: WORKSPACE_ID },
    {
      $setOnInsert: {
        ownerId: "single-user",
        schemaVersion: 2,
        revision: 0,
        snapshot,
        snapshotBytes: bytes,
        lastSaveId: null,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();
}

export async function saveWorkspace(Workspace, input) {
  const existing = await Workspace.findById(WORKSPACE_ID).lean();
  if (!existing) await getOrCreateWorkspace(Workspace);
  else if (existing.lastSaveId === input.saveId)
    return { kind: "saved", revision: existing.revision, idempotent: true, updatedAt: existing.updatedAt };

  const { snapshot, bytes } = parseSnapshot(input.snapshot);
  const saved = await Workspace.findOneAndUpdate(
    { _id: WORKSPACE_ID, revision: input.expectedRevision },
    {
      $set: { snapshot, snapshotBytes: bytes, lastSaveId: input.saveId, schemaVersion: 2 },
      $inc: { revision: 1 },
    },
    { new: true },
  ).lean();
  if (saved)
    return { kind: "saved", revision: saved.revision, idempotent: false, updatedAt: saved.updatedAt };

  const current = await Workspace.findById(WORKSPACE_ID).select("revision lastSaveId updatedAt").lean();
  if (current?.lastSaveId === input.saveId)
    return { kind: "saved", revision: current.revision, idempotent: true, updatedAt: current.updatedAt };
  return { kind: "conflict", currentRevision: current?.revision ?? 0 };
}

export const createSaveId = () => randomUUID();

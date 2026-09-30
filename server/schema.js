import { z } from "zod";
import { MAX_SNAPSHOT_BYTES } from "./config.js";

const id = z.string().trim().min(1).max(160);
const person = z.object({ id, name: z.string().max(300) }).passthrough();
const campaign = z.object({ id, name: z.string().max(300) }).passthrough();
const activity = z
  .object({ id, personId: id, campaignIds: z.array(id).default([]) })
  .passthrough();
const followup = z
  .object({ id, personId: id, campaignId: z.string().max(160).default("") })
  .passthrough();

export const snapshotSchema = z
  .object({
    schemaVersion: z.literal(2).default(2),
    people: z.array(person).max(20_000),
    campaigns: z.array(campaign).max(2_000),
    activities: z.array(activity).max(100_000),
    followups: z.array(followup).max(100_000),
    mapSettings: z.record(z.string(), z.unknown()).default({}),
    settings: z.record(z.string(), z.unknown()).default({}),
  })
  .superRefine((snapshot, context) => {
    const unique = (rows, label) => {
      const seen = new Set();
      rows.forEach((row, index) => {
        if (seen.has(row.id))
          context.addIssue({
            code: "custom",
            path: [label, index, "id"],
            message: `Duplicate ${label} id`,
          });
        seen.add(row.id);
      });
      return seen;
    };
    const people = unique(snapshot.people, "people");
    const campaigns = unique(snapshot.campaigns, "campaigns");
    unique(snapshot.activities, "activities");
    unique(snapshot.followups, "followups");
    snapshot.activities.forEach((row, index) => {
      if (!people.has(row.personId))
        context.addIssue({ code: "custom", path: ["activities", index, "personId"], message: "Unknown person" });
      row.campaignIds.forEach((campaignId, campaignIndex) => {
        if (!campaigns.has(campaignId))
          context.addIssue({ code: "custom", path: ["activities", index, "campaignIds", campaignIndex], message: "Unknown campaign" });
      });
    });
    snapshot.followups.forEach((row, index) => {
      if (!people.has(row.personId))
        context.addIssue({ code: "custom", path: ["followups", index, "personId"], message: "Unknown person" });
      if (row.campaignId && !campaigns.has(row.campaignId))
        context.addIssue({ code: "custom", path: ["followups", index, "campaignId"], message: "Unknown campaign" });
    });
  });

export const saveSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  saveId: z.string().uuid(),
  snapshot: snapshotSchema,
});

export function parseSnapshot(value) {
  const snapshot = snapshotSchema.parse(value);
  const bytes = Buffer.byteLength(JSON.stringify(snapshot));
  if (bytes > MAX_SNAPSHOT_BYTES) {
    const error = new Error("snapshot_too_large");
    error.status = 413;
    throw error;
  }
  return { snapshot, bytes };
}

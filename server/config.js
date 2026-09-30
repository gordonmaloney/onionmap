export const COOKIE_NAME = "onionmap_session";
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_SNAPSHOT_BYTES = 3_500_000;
export const WORKSPACE_ID = "primary";

export const EMPTY_SNAPSHOT = Object.freeze({
  schemaVersion: 2,
  people: [],
  campaigns: [],
  activities: [],
  followups: [],
  mapSettings: {
    sectors: {
      enabled: true,
      title: "Main area of interest",
      labels: [
        "Member defence",
        "Campaign work",
        "Branch activity",
        "Reconnect / follow-up",
      ],
      sizes: [90, 90, 90, 90],
      startAngle: 0,
    },
  },
  settings: { theme: "light", fontScale: 1 },
});

import mongoose from "mongoose";

const runtime = globalThis;

export async function connectDatabase() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  if (!runtime.__onionmapMongoPromise)
    runtime.__onionmapMongoPromise = mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DBNAME || "onionmap",
      serverSelectionTimeoutMS: 8_000,
      maxPoolSize: 10,
    });
  return runtime.__onionmapMongoPromise;
}

const workspaceSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    ownerId: { type: String, required: true, default: "single-user" },
    schemaVersion: { type: Number, required: true, default: 2 },
    revision: { type: Number, required: true, default: 0 },
    snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
    snapshotBytes: { type: Number, required: true },
    lastSaveId: { type: String, default: null },
  },
  { timestamps: true, minimize: false, versionKey: false },
);

const loginAttemptSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    failures: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { versionKey: false },
);

export const WorkspaceModel =
  mongoose.models.OnionMapWorkspace ||
  mongoose.model("OnionMapWorkspace", workspaceSchema);
export const LoginAttemptModel =
  mongoose.models.OnionMapLoginAttempt ||
  mongoose.model("OnionMapLoginAttempt", loginAttemptSchema);

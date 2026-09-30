import { useCallback, useEffect, useRef, useState } from "react";
import App from "./App.jsx";
import { ApiError, checkSession, fetchWorkspace, login, logout, saveWorkspace } from "./lib/workspaceApi.js";
import { readWorkspaceCache, writeWorkspaceCache } from "./lib/workspaceCache.js";

const statusLabels = {
  saved: "Saved",
  saving: "Saving…",
  offline: "Offline—saved on this device",
  conflict: "Conflict—review required",
};

function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onLogin(password);
    } catch (failure) {
      setError(
        failure?.status === 429
          ? "Too many attempts. Please wait fifteen minutes."
          : "That password was not accepted.",
      );
      setBusy(false);
    }
  };
  return (
    <main className="auth-screen">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-brand"><b><span>ONION</span>MAP</b><small>Private organising workspace</small></div>
        <label>
          Password
          <input autoFocus autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="primary" disabled={busy || !password} type="submit">{busy ? "Opening…" : "Open OnionMap"}</button>
      </form>
    </main>
  );
}

function LoadingScreen({ message = "Opening your workspace…" }) {
  return <main className="auth-screen"><div className="auth-card loading-card"><div className="auth-brand"><b><span>ONION</span>MAP</b></div><p>{message}</p></div></main>;
}

function downloadJson(snapshot, suffix = "backup") {
  const payload = { format: "onionmap", exportVersion: 1, exportedAt: new Date().toISOString(), snapshot };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `onionmap-${suffix}-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function WorkspaceShell({ initialWorkspace, onSignedOut }) {
  const cache = useRef(readWorkspaceCache()).current;
  const recoverable = cache?.dirty && cache.baseRevision === initialWorkspace.revision;
  const staleRecovery = cache?.dirty && cache.baseRevision !== initialWorkspace.revision;
  const [initialSnapshot, setInitialSnapshot] = useState(recoverable ? cache.workingSnapshot : initialWorkspace.snapshot);
  const [generation, setGeneration] = useState(0);
  const [status, setStatus] = useState(staleRecovery ? "conflict" : recoverable ? "offline" : "saved");
  const [conflict, setConflict] = useState(staleRecovery ? { localSnapshot: cache.workingSnapshot, currentRevision: initialWorkspace.revision } : null);
  const revision = useRef(initialWorkspace.revision);
  const acknowledged = useRef(initialWorkspace.snapshot);
  const current = useRef(initialSnapshot);
  const pending = useRef(recoverable ? initialSnapshot : null);
  const active = useRef(null);
  const retryOperation = useRef(null);
  const timer = useRef(null);
  const retryTimer = useRef(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  const cacheAcknowledged = useCallback((workingSnapshot = acknowledged.current, dirty = false) => {
    writeWorkspaceCache({
      baseRevision: revision.current,
      acknowledgedSnapshot: acknowledged.current,
      workingSnapshot,
      dirty,
    });
  }, []);

  const flush = useCallback(async () => {
    if (active.current || statusRef.current === "conflict" || (!pending.current && !retryOperation.current)) return;
    const operation = retryOperation.current || {
      snapshot: pending.current,
      expectedRevision: revision.current,
      saveId: crypto.randomUUID(),
    };
    retryOperation.current = null;
    if (pending.current === operation.snapshot) pending.current = null;
    active.current = operation;
    setStatus("saving");
    try {
      const result = await saveWorkspace(operation);
      revision.current = result.revision;
      acknowledged.current = operation.snapshot;
      active.current = null;
      cacheAcknowledged(current.current, Boolean(pending.current));
      if (pending.current) {
        setStatus("saving");
        queueMicrotask(flush);
      } else setStatus("saved");
    } catch (failure) {
      active.current = null;
      if (failure instanceof ApiError && failure.status === 409) {
        const localSnapshot = pending.current || operation.snapshot;
        pending.current = localSnapshot;
        setConflict({ localSnapshot, currentRevision: failure.body?.currentRevision });
        setStatus("conflict");
        cacheAcknowledged(localSnapshot, true);
      } else if (failure instanceof ApiError && [400, 413].includes(failure.status)) {
        const localSnapshot = pending.current || operation.snapshot;
        pending.current = localSnapshot;
        setConflict({
          localSnapshot,
          currentRevision: revision.current,
          cannotReplace: true,
          message: "The server rejected this workspace because some imported data is invalid or too large.",
        });
        setStatus("conflict");
        cacheAcknowledged(localSnapshot, true);
      } else if (failure instanceof ApiError && failure.status === 401) {
        onSignedOut();
      } else {
        retryOperation.current = operation;
        setStatus("offline");
        cacheAcknowledged(pending.current || operation.snapshot, true);
        clearTimeout(retryTimer.current);
        retryTimer.current = setTimeout(flush, 5_000);
      }
    }
  }, [cacheAcknowledged, onSignedOut]);

  useEffect(() => {
    const online = () => flush();
    addEventListener("online", online);
    if (recoverable) timer.current = setTimeout(flush, 250);
    return () => {
      removeEventListener("online", online);
      clearTimeout(timer.current);
      clearTimeout(retryTimer.current);
    };
  }, [flush, recoverable]);

  const onWorkspaceChange = useCallback((snapshot) => {
    current.current = snapshot;
    if (statusRef.current === "conflict") return;
    if (JSON.stringify(snapshot) === JSON.stringify(acknowledged.current) && !pending.current) {
      cacheAcknowledged(snapshot, false);
      return;
    }
    pending.current = snapshot;
    cacheAcknowledged(snapshot, true);
    setStatus(navigator.onLine ? "saving" : "offline");
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 650);
  }, [cacheAcknowledged, flush]);

  const loadServer = async () => {
    const server = await fetchWorkspace();
    revision.current = server.revision;
    acknowledged.current = server.snapshot;
    current.current = server.snapshot;
    pending.current = null;
    retryOperation.current = null;
    setInitialSnapshot(server.snapshot);
    setConflict(null);
    setStatus("saved");
    cacheAcknowledged(server.snapshot, false);
    setGeneration((value) => value + 1);
  };

  const replaceServer = async () => {
    if (!confirm("Replace the server copy with the changes saved on this device?")) return;
    const server = await fetchWorkspace();
    const localSnapshot = conflict.localSnapshot;
    const result = await saveWorkspace({ expectedRevision: server.revision, saveId: crypto.randomUUID(), snapshot: localSnapshot });
    revision.current = result.revision;
    acknowledged.current = localSnapshot;
    current.current = localSnapshot;
    pending.current = null;
    retryOperation.current = null;
    setInitialSnapshot(localSnapshot);
    setConflict(null);
    setStatus("saved");
    cacheAcknowledged(localSnapshot, false);
    setGeneration((value) => value + 1);
  };

  const importWorkspace = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      try {
        const parsed = JSON.parse(await input.files[0].text());
        const snapshot = parsed.snapshot || parsed;
        if (!["people", "campaigns", "activities", "followups"].every((key) => Array.isArray(snapshot[key])))
          throw new Error("invalid");
        if (!confirm("Import this file and replace the current OnionMap workspace?")) return;
        current.current = snapshot;
        pending.current = snapshot;
        setInitialSnapshot(snapshot);
        setConflict(null);
        setStatus("saving");
        cacheAcknowledged(snapshot, true);
        setGeneration((value) => value + 1);
        clearTimeout(timer.current);
        timer.current = setTimeout(flush, 100);
      } catch {
        alert("That file is not a valid OnionMap workspace backup.");
      }
    };
    input.click();
  };

  return (
    <>
      <App
        key={generation}
        initialSession={initialSnapshot}
        onWorkspaceChange={onWorkspaceChange}
        persistenceStatus={statusLabels[status]}
        persistenceTone={status}
        onExportWorkspace={() => downloadJson(current.current, "workspace")}
        onImportWorkspace={importWorkspace}
        onLogout={async () => { await logout(); onSignedOut(); }}
      />
      {conflict && (
        <div className="shade persistence-conflict" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
          <section className="activity-modal small">
            <header><div><small>SAVE CONFLICT</small><h2 id="conflict-title">Choose which copy to keep</h2></div></header>
            <div className="activity-form"><p>{conflict.message || "Another tab or device saved a newer revision. Your changes are still stored safely on this device."}</p></div>
            <footer>
              <button className="secondary" onClick={() => downloadJson(conflict.localSnapshot, "unsaved-recovery")}>Download my copy</button>
              <button className="secondary" onClick={loadServer}>Use server copy</button>
              {!conflict.cannotReplace && <button className="primary" onClick={replaceServer}>Replace server with mine</button>}
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

export default function BackendGate() {
  const [phase, setPhase] = useState("checking");
  const [workspace, setWorkspace] = useState(null);
  const openWorkspace = useCallback(async () => {
    setPhase("loading");
    const result = await fetchWorkspace();
    setWorkspace(result);
    setPhase("ready");
  }, []);
  useEffect(() => {
    checkSession().then(openWorkspace).catch((failure) => setPhase(failure?.status === 401 ? "login" : "error"));
  }, [openWorkspace]);
  if (phase === "checking" || phase === "loading") return <LoadingScreen />;
  if (phase === "login") return <LoginScreen onLogin={async (password) => { await login(password); await openWorkspace(); }} />;
  if (phase === "error") return <LoadingScreen message="OnionMap could not reach its server. Check your connection and reload." />;
  return <WorkspaceShell initialWorkspace={workspace} onSignedOut={() => { setWorkspace(null); setPhase("login"); }} />;
}

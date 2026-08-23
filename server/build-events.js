const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const STAGES = ["FRAME", "GEOMETRY", "MATERIALS", "LIGHTING", "INTEGRATE", "VERIFY"];
const COMPONENT_IDS = ["museum-annex-frame", "museum-annex-shell", "museum-annex-gallery"];

function createBuildLifecycle({ revision, now = () => new Date(), quietMs = 700, stageMs = 1500, agentCount = 1 }) {
  const listeners = new Set();
  const timers = new Set();
  let quietTimer = null;
  let state = null;
  let active = false;
  let compilerDone = false;

  const event = (type, stage, progress = null) => ({
    version: 1,
    type,
    buildId: state?.buildId ?? `build-${crypto.randomBytes(8).toString("hex")}`,
    projectLabel: "Living Museum",
    assetLabel: "Museum annex",
    stage,
    progress,
    revision,
    timestamp: now().toISOString(),
    agentCount,
    componentIds: COMPONENT_IDS,
  });
  const emit = (next) => { state = next; for (const listener of listeners) listener(next); };
  const schedule = (callback, delay) => { const timer = setTimeout(() => { timers.delete(timer); callback(); }, delay); timers.add(timer); };
  const start = () => {
    active = true;
    compilerDone = false;
    state = null;
    emit(event("build.start", "DISCOVER"));
    STAGES.forEach((stage, index) => schedule(() => {
      if (!active) return;
      emit(event(index === STAGES.length - 1 && compilerDone ? "build.progress" : "asset.stage", stage));
      if (stage === "VERIFY") schedule(() => { if (active && compilerDone) { emit(event("build.complete", "READY", 100)); active = false; } }, Math.min(stageMs, 1500));
    }, stageMs * (index + 1)));
  };
  const compilerActivity = () => {
    if (!active) start();
    if (quietTimer) clearTimeout(quietTimer);
    quietTimer = setTimeout(() => {
      quietTimer = null;
      compilerDone = true;
      if (state?.stage === "VERIFY") { emit(event("build.complete", "READY", 100)); active = false; }
      else emit(event("build.progress", state?.stage ?? "DISCOVER"));
    }, quietMs);
  };
  const fail = () => { if (!active) start(); emit(event("build.fail", state?.stage ?? "DISCOVER")); active = false; };
  const stale = () => { if (!active) start(); emit(event("build.stale", state?.stage ?? "DISCOVER")); active = false; };
  const close = () => { if (quietTimer) clearTimeout(quietTimer); for (const timer of timers) clearTimeout(timer); timers.clear(); listeners.clear(); };
  return { compilerActivity, fail, stale, current: () => state, subscribe(listener) { listeners.add(listener); if (state) listener(state); return () => listeners.delete(listener); }, close };
}

function createBuildEventHandler({ enabled, lifecycle }) {
  return function handleBuildEvents(req, res) {
    const url = new URL(req.url || "/", "http://localhost");
    if (url.pathname !== "/api/build-events") return false;
    if (!enabled) { res.writeHead(404, { "content-type": "application/json" }); res.end('{"error":"build events disabled"}'); return true; }
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-content-type-options": "nosniff" });
    const unsubscribe = lifecycle.subscribe((value) => res.write(`event: build\ndata: ${JSON.stringify(value)}\n\n`));
    req.on("close", unsubscribe);
    return true;
  };
}

function createBuildOutputObserver({ root, onActivity, intervalMs = 250, maxWatchers = 2048 }) {
  const watchers = new Map();
  let closed = false;
  let rescanTimer = null;

  const scan = () => {
    if (closed || !fs.existsSync(root)) return;
    const pending = [root];
    while (pending.length > 0 && watchers.size < maxWatchers) {
      const directory = pending.pop();
      if (!directory || watchers.has(directory)) continue;
      try {
        const watcher = fs.watch(directory, () => {
          if (closed) return;
          onActivity();
          if (rescanTimer) clearTimeout(rescanTimer);
          rescanTimer = setTimeout(scan, intervalMs);
        });
        watcher.on("error", () => watcher.close());
        watchers.set(directory, watcher);
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
          if (entry.isDirectory()) pending.push(path.join(directory, entry.name));
        }
      } catch {
        // Next may atomically replace output directories while they are scanned.
      }
    }
  };

  scan();
  return { close() { closed = true; if (rescanTimer) clearTimeout(rescanTimer); for (const watcher of watchers.values()) watcher.close(); watchers.clear(); } };
}

module.exports = { createBuildLifecycle, createBuildEventHandler, createBuildOutputObserver };

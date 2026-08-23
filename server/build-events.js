const SAFE_SEQUENCE = [
  ["build.start", "DISCOVER", null],
  ["asset.stage", "FRAME", 18],
  ["asset.stage", "GEOMETRY", 36],
  ["asset.stage", "MATERIALS", 58],
  ["asset.stage", "LIGHTING", 72],
  ["asset.stage", "INTEGRATE", 84],
  ["asset.stage", "VERIFY", 96],
  ["build.complete", "READY", 100],
  ["build.start", "DISCOVER", null],
  ["asset.stage", "FRAME", 18],
  ["build.fail", "FRAME", 18],
  ["build.start", "DISCOVER", null],
  ["build.stale", "DISCOVER", null],
];

function createSyntheticEvent(index) {
  const [type, stage, progress] = SAFE_SEQUENCE[index];
  const cycle = index < 8 ? "42" : index < 11 ? "43" : "44";
  return {
    version: 1,
    type,
    buildId: `museum-${cycle}`,
    projectLabel: "Living Museum",
    assetLabel: "Museum annex",
    stage,
    progress,
    revision: cycle === "42" ? "a1b2c3d" : cycle === "43" ? "b2c3d4e" : "c3d4e5f",
    timestamp: new Date().toISOString(),
    agentCount: type === "build.fail" || type === "build.stale" ? 0 : 2,
    componentIds: ["museum-annex-frame", "museum-annex-shell", "museum-annex-gallery"],
  };
}

function createBuildEventHandler({ dev, syntheticEnabled = false }) {
  return function handleBuildEvents(req, res) {
    const url = new URL(req.url || "/", "http://localhost");
    if (url.pathname !== "/api/build-events") return false;
    const synthetic = url.searchParams.get("mode") === "synthetic";
    if (!synthetic || (!dev && !syntheticEnabled)) {
      res.writeHead(404, { "content-type": "application/json" });
      res.end('{"error":"build events disabled"}');
      return true;
    }

    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-content-type-options": "nosniff",
    });
    let index = 0;
    const send = () => {
      if (index >= SAFE_SEQUENCE.length) return;
      res.write(`event: build\ndata: ${JSON.stringify(createSyntheticEvent(index))}\n\n`);
      index += 1;
    };
    send();
    const timer = setInterval(send, 3_000);
    req.on("close", () => clearInterval(timer));
    return true;
  };
}

module.exports = { createBuildEventHandler, createSyntheticEvent };

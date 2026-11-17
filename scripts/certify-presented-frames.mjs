import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const targetFrames = Number(process.env.TARGET_FRAMES ?? 100_000);
const timeoutMs = Number(process.env.MAX_DURATION_MS ?? 2_400_000);
const segmentMs = Number(process.env.SEGMENT_MS ?? 600_000);
const warmupMs = Number(process.env.WARMUP_MS ?? 10_000);
const label = process.env.LABEL ?? "steady-production-1";
const url = process.env.URL ?? "http://127.0.0.1:3321/office?camera=ORBIT";
const outDir = path.resolve(process.env.OUT_DIR ?? "output/presented-frame-certification");
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: true,
  args: ["--use-angle=vulkan", "--enable-features=Vulkan", "--disable-features=UseSkiaRenderer", "--no-first-run"],
});
const cdpBrowser = await browser.newBrowserCDPSession();
const systemInfo = await cdpBrowser.send("SystemInfo.getInfo");
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(String(error)));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
await page.waitForSelector("canvas", { state: "visible", timeout: 120_000 });
await page.waitForTimeout(warmupMs);

const cdp = await context.newCDPSession(page);
const segments = [];
let activeTimestampsUs = [];
let droppedTraceEvents = 0;
cdp.on("Tracing.dataCollected", ({ value }) => {
  for (const event of value) {
    if (event.name === "Display::FrameDisplayed" && Number.isFinite(event.ts)) activeTimestampsUs.push(event.ts);
    if (event.name === "DroppedFrame") droppedTraceEvents += 1;
  }
});
const startedAt = Date.now();
let totalPresented = 0;
while (totalPresented < targetFrames && Date.now() - startedAt < timeoutMs) {
  activeTimestampsUs = [];
  let tracingComplete;
  const complete = new Promise((resolve) => { tracingComplete = resolve; });
  cdp.once("Tracing.tracingComplete", () => tracingComplete());
  await cdp.send("Tracing.start", {
    transferMode: "ReportEvents",
    traceConfig: { recordMode: "recordContinuously", includedCategories: ["benchmark"] },
  });
  const remainingMs = timeoutMs - (Date.now() - startedAt);
  await page.waitForTimeout(Math.min(segmentMs, remainingMs));
  await cdp.send("Tracing.end");
  await complete;
  const segment = [...new Set(activeTimestampsUs)].sort((a, b) => a - b);
  if (segment.length > 1) {
    segments.push(segment);
    totalPresented += segment.length;
  }
  process.stdout.write(`\r${label}: ${totalPresented}/${targetFrames} (${segments.length} segments)`);
}
process.stdout.write("\n");

const timestamps = segments.flat();
const frameMs = segments.flatMap((segment) => segment.slice(1).map((value, index) => (value - segment[index]) / 1_000));
const sorted = [...frameMs].sort((a, b) => a - b);
const percentile = (p) => sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)] ?? null;
const measuredSeconds = segments.reduce((sum, segment) => sum + (segment.at(-1) - segment[0]) / 1_000_000, 0);
const measuredFrameIntervals = segments.reduce((sum, segment) => sum + segment.length - 1, 0);
const averageFps = measuredSeconds > 0 ? measuredFrameIntervals / measuredSeconds : null;
const lowCount = Math.max(1, Math.ceil(frameMs.length * 0.00001));
const slowest = sorted.slice(-lowCount);
const lowFps = slowest.length ? 1_000 / (slowest.reduce((sum, value) => sum + value, 0) / slowest.length) : null;
const countAbove = (threshold) => frameMs.filter((value) => value > threshold).length;
const result = {
  schemaVersion: 1,
  label,
  url,
  certifying: timestamps.length >= 100_000,
  requestedFrames: targetFrames,
  presentedFrames: timestamps.length,
  measuredSeconds,
  segments: segments.map((segment) => ({ presentedFrames: segment.length, startUs: segment[0], endUs: segment.at(-1) })),
  averageFps,
  low001PercentFps: lowFps,
  lowToAverageRatio: lowFps && averageFps ? lowFps / averageFps : null,
  lowVsAverageGapPercent: lowFps && averageFps ? (1 - lowFps / averageFps) * 100 : null,
  lowSampleCount: lowCount,
  frameTimeMs: { median: percentile(0.5), p95: percentile(0.95), p99: percentile(0.99), p999: percentile(0.999), p9999: percentile(0.9999), p99999: percentile(0.99999), worst: sorted.at(-1) ?? null },
  jank: { over25: countAbove(25), over50: countAbove(50), over100: countAbove(100), over250: countAbove(250), densityOver25: frameMs.length ? countAbove(25) / frameMs.length : null, traceDroppedEvents: droppedTraceEvents },
  errors,
  renderer: { commandLine: systemInfo.commandLine, devices: systemInfo.gpu.devices, auxAttributes: systemInfo.gpu.auxAttributes, featureStatus: systemInfo.gpu.featureStatus },
};
await fs.writeFile(path.join(outDir, `${label}-timestamps-us.json`), JSON.stringify(segments));
await fs.writeFile(path.join(outDir, `${label}-summary.json`), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
await browser.close();
if (!result.certifying) process.exitCode = 2;

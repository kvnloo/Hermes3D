import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const arg = (name, fallback = "") => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const label = arg("label", "run");
const durationMs = Number(arg("duration", "45000"));
const dpr = Number(arg("dpr", "1"));
const url = arg("url", "http://127.0.0.1:3317/office?camera=ORBIT&performanceHarness=1");
const hide = arg("hide", "").split(",").filter(Boolean);
const remountAtMs = Number(arg("remount-at", "0"));
const trace = arg("trace", "0") === "1";
const headless = arg("headless", "1") !== "0";
const quality = arg("quality", "");
const outDir = path.resolve(arg("out", "output/performance-certification"));
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless,
  args: ["--use-angle=vulkan", "--enable-features=Vulkan", "--disable-features=UseSkiaRenderer", "--no-first-run"],
});
const cdp = await browser.newBrowserCDPSession();
const gpu = await cdp.send("SystemInfo.getInfo");
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: dpr });
if (quality) {
  await context.addInitScript((value) => {
    localStorage.setItem("hermes-office-graphics-quality-v1", value);
  }, quality);
}
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(String(error)));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
if (trace) await context.tracing.start({ screenshots: false, snapshots: false, sources: false });
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForSelector("canvas", { state: "visible", timeout: 120000 });
await page.waitForTimeout(10000);
if (hide.length) {
  await page.addStyleTag({ content: `${hide.join(",")} { visibility: hidden !important; }` });
}
await page.evaluate(() => {
  const state = { frames: [], longTasks: [], resources: 0, layouts: 0, start: performance.now() };
  window.__PERF_CERT__ = state;
  let last = performance.now();
  const frame = (now) => {
    state.frames.push(now - last);
    last = now;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  new PerformanceObserver((list) => state.longTasks.push(...list.getEntries().map((entry) => entry.duration))).observe({ type: "longtask", buffered: true });
  new PerformanceObserver((list) => { state.resources += list.getEntries().length; }).observe({ type: "resource", buffered: true });
  if (PerformanceObserver.supportedEntryTypes.includes("layout-shift")) {
    new PerformanceObserver((list) => { state.layouts += list.getEntries().length; }).observe({ type: "layout-shift", buffered: true });
  }
});
let beforeRemount = null;
let afterRemount = null;
if (remountAtMs > 0) {
  await page.waitForTimeout(remountAtMs);
  beforeRemount = await page.evaluate(() => window.__HERMES3D_STREAM_CAMERA_PROOF__?.());
  await page.evaluate(() => window.__HERMES3D_PERFORMANCE_REMOUNT__?.());
  await page.waitForTimeout(3000);
  afterRemount = await page.evaluate(() => window.__HERMES3D_STREAM_CAMERA_PROOF__?.());
  await page.waitForTimeout(Math.max(0, durationMs - remountAtMs - 3000));
} else {
  await page.waitForTimeout(durationMs);
}
const result = await page.evaluate(() => {
  const state = window.__PERF_CERT__;
  const frames = state.frames.slice(2).sort((a, b) => a - b);
  const percentile = (p) => frames[Math.min(frames.length - 1, Math.floor(frames.length * p))] ?? null;
  const canvases = [...document.querySelectorAll("canvas")].map((canvas, index) => ({ index, width: canvas.width, height: canvas.height, area: canvas.width * canvas.height, rect: canvas.getBoundingClientRect().toJSON() }));
  const largest = [...document.querySelectorAll("canvas")].sort((a, b) => b.width * b.height - a.width * a.height)[0];
  let webgl = null;
  if (largest) {
    const gl = largest.getContext("webgl2") || largest.getContext("webgl");
    if (gl) {
      const debug = gl.getExtension("WEBGL_debug_renderer_info");
      webgl = {
        canvas: canvases.find((entry) => entry.width === largest.width && entry.height === largest.height),
        vendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        version: gl.getParameter(gl.VERSION),
      };
    }
  }
  return {
    frameCount: frames.length,
    median: percentile(0.5), p95: percentile(0.95), p99: percentile(0.99), max: frames.at(-1) ?? null,
    over50Pct: frames.length ? frames.filter((value) => value > 50).length / frames.length * 100 : null,
    longTasks: state.longTasks, resources: state.resources, layoutShiftEntries: state.layouts,
    canvases, webgl, camera: window.__HERMES3D_STREAM_CAMERA_PROOF__?.(),
    memory: performance.memory ? { usedJSHeapSize: performance.memory.usedJSHeapSize, totalJSHeapSize: performance.memory.totalJSHeapSize } : null,
  };
});
result.label = label;
result.durationMs = durationMs;
result.dpr = dpr;
result.url = url;
result.hide = hide;
result.beforeRemount = beforeRemount;
result.afterRemount = afterRemount;
result.errors = errors;
result.chrome = { executable: "/usr/bin/google-chrome-stable", commandLine: gpu.commandLine, gpuDevices: gpu.gpu.devices, auxAttributes: gpu.gpu.auxAttributes, featureStatus: gpu.gpu.featureStatus };
await page.screenshot({ path: path.join(outDir, `${label}.png`) });
if (trace) await context.tracing.stop({ path: path.join(outDir, `${label}-trace.zip`) });
await fs.writeFile(path.join(outDir, `${label}.json`), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ label, median: result.median, p95: result.p95, p99: result.p99, max: result.max, over50Pct: result.over50Pct, renderer: result.webgl?.renderer, errors: errors.length }));
await browser.close();

import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const out = path.resolve("pr23-evidence");
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl", "--enable-precise-memory-info"] });

for (const variant of ["baseline", "pr23"]) {
  const errors = [];
  const failed = [];
  const context = await browser.newContext({ viewport: { width: 960, height: 1080 }, deviceScaleFactor: 1, recordVideo: { dir: out, size: { width: 960, height: 1080 } } });
  const page = await context.newPage();
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("requestfailed", req => failed.push(`${req.method()} ${req.url()} ${req.failure()?.errorText ?? "failed"}`));
  await page.addInitScript(() => {
    globalThis.__perf = { frames: [], longTasks: [], start: performance.now() };
    let last = performance.now();
    const tick = now => { globalThis.__perf.frames.push(now - last); last = now; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    new PerformanceObserver(list => globalThis.__perf.longTasks.push(...list.getEntries().map(e => ({ start: e.startTime, duration: e.duration })))).observe({ type: "longtask", buffered: true });
  });
  const response = await page.goto(`http://127.0.0.1:${variant === "baseline" ? 3411 : 3421}/office`, { waitUntil: "domcontentloaded", timeout: 90000 });
  const close = page.getByRole("button", { name: "Close onboarding" });
  if (await close.isVisible()) await close.click();
  await page.waitForTimeout(12000);
  if (await close.isVisible()) await close.click();
  await page.mouse.move(480, 540);
  await page.mouse.wheel(0, -450);
  await page.waitForTimeout(35000);
  const metrics = await page.evaluate(() => {
    const canvas = [...document.querySelectorAll("canvas")].sort((a,b) => b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0];
    const gl = canvas?.getContext("webgl2") || canvas?.getContext("webgl");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    const frames = globalThis.__perf.frames.slice(60);
    const sorted = [...frames].sort((a,b) => a-b);
    const q = p => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? null;
    const nav = performance.getEntriesByType("navigation")[0];
    return { canvasCss: canvas ? [canvas.clientWidth, canvas.clientHeight] : null, drawingBuffer: gl ? [gl.drawingBufferWidth, gl.drawingBufferHeight] : null, renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null, dpr: devicePixelRatio, frames: frames.length, sampledFps: frames.length / (frames.reduce((a,b)=>a+b,0)/1000), frameTimeMs: { median:q(.5), p95:q(.95), p99:q(.99) }, usedJsHeapBytes: performance.memory?.usedJSHeapSize ?? null, longTasks: globalThis.__perf.longTasks, loadEventMs: nav?.loadEventEnd ?? null, canvasVisible: !!canvas && canvas.getBoundingClientRect().width > 0 && canvas.getBoundingClientRect().height > 0 };
  });
  await page.screenshot({ path: path.join(out, `${variant}.png`) });
  const video = page.video();
  await context.close();
  await fs.rename(await video.path(), path.join(out, `${variant}.webm`));
  await fs.writeFile(path.join(out, `${variant}-report.json`), JSON.stringify({ commit: variant === "baseline" ? "35763d95c9ba27a6496a27211b03ed2a0b311182" : "9a4373458342666f6f5837a536ef8725a86f6391", environment: "Chromium headless SwiftShader; not real-phone evidence", httpStatus: response?.status(), consoleErrors: errors, failedRequests: failed, ...metrics }, null, 2));
}
await browser.close();

import playwright from "/workspace/zer0/products/content-creation/hermes3d-live/engine/.worktrees/first-combined-nightly-preview-recapture/node_modules/playwright/index.js";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const out = "/tmp/hermes3d-nightly-preview/recapture-v2";
const { chromium } = playwright;
const profile = `${out}/browser-profile`;
const url = "http://127.0.0.1:43179/office?camera=ORBIT&revision=47b47e6c2fe8e7b31bc615b9c1fbc1aa4ca475fb";
await mkdir(out, { recursive: true });
const requests = [];
const responses = [];
const consoleMessages = [];

const browser = await chromium.launchPersistentContext(profile, {
  executablePath: "/opt/google/chrome/chrome",
  headless: true,
  viewport: { width: 1920, height: 1080 },
  screen: { width: 1920, height: 1080 },
  recordVideo: { dir: out, size: { width: 1920, height: 1080 } },
  args: ["--use-angle=vulkan", "--enable-gpu", "--ignore-gpu-blocklist", "--hide-scrollbars"],
});
const page = browser.pages()[0] ?? await browser.newPage();
page.on("request", request => {
  const parsed = new URL(request.url());
  requests.push({ url: `${parsed.protocol}//${parsed.host}${parsed.pathname}${parsed.search}`, method: request.method(), resourceType: request.resourceType() });
});
page.on("response", async response => {
  const parsed = new URL(response.url());
  const headers = await response.allHeaders();
  responses.push({ url: `${parsed.protocol}//${parsed.host}${parsed.pathname}${parsed.search}`, status: response.status(), resourceType: response.request().resourceType(), bytes: Number(headers["content-length"] ?? 0) });
});
page.on("console", msg => { if (msg.type() === "error" || msg.type() === "warning") consoleMessages.push({ type: msg.type(), text: msg.text() }); });
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
const close = page.getByRole("button", { name: "Close onboarding" });
let onboardingAction = "already-completed";
await close.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
if (await close.isVisible().catch(() => false)) {
  await close.click();
  await close.waitFor({ state: "hidden", timeout: 10000 });
  onboardingAction = "clicked Close onboarding button";
}
await page.waitForTimeout(12000);
await page.screenshot({ path: `${out}/pre-capture-proof.png` });
const preText = await page.locator("body").innerText();
const onboardingVisible = await close.isVisible().catch(() => false);
const storageValue = await page.evaluate(() => localStorage.getItem("hermes3d:onboarding:completed"));
if (onboardingVisible) throw new Error(`onboarding remains visible after ordinary UI action: storage=${storageValue}`);

const raf = await page.evaluate(async () => {
  const values = [];
  let previous = performance.now();
  const deadline = previous + 35000;
  while (performance.now() < deadline) {
    await new Promise(requestAnimationFrame);
    const now = performance.now();
    values.push(now - previous);
    previous = now;
  }
  values.sort((a, b) => a - b);
  const pct = p => values[Math.min(values.length - 1, Math.floor((values.length - 1) * p))];
  return { sampleCount: values.length, medianMs: pct(0.5), p95Ms: pct(0.95), p99Ms: pct(0.99), longFramesOver50ms: values.filter(v => v > 50).length, droppedFrameEstimateAt60Hz: values.reduce((n, v) => n + Math.max(0, Math.floor(v / (1000 / 60)) - 1), 0) };
});
await page.screenshot({ path: `${out}/post-capture-proof.png` });
const postText = await page.locator("body").innerText();
const gpu = await page.evaluate(() => {
  const canvas = document.querySelector("canvas");
  const gl = canvas?.getContext("webgl2") || canvas?.getContext("webgl");
  if (!gl) return { available: false };
  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  return { available: true, vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : "unavailable", renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unavailable", version: gl.getParameter(gl.VERSION) };
});
await writeFile(`${out}/visible-text.txt`, postText);
await writeFile(`${out}/capture-receipt.json`, JSON.stringify({ url, onboarding: { action: onboardingAction, mechanism: onboardingAction.startsWith("clicked") ? "ordinary UI Close onboarding button invokes completion and persists localStorage key hermes3d:onboarding:completed=true" : "production demo adapter suppresses first-run onboarding by product contract; ordinary UI close was not present or needed", storageValue, visibleAfterAction: onboardingVisible }, proof: { preTextBytes: Buffer.byteLength(preText), postTextBytes: Buffer.byteLength(postText) }, raf, gpu, requests, responses, consoleMessages }, null, 2));
const videoPath = await page.video().path();
await browser.close();
await writeFile(`${out}/raw-video-path.txt`, `${videoPath}\n`);
console.log(JSON.stringify({ out, videoPath, onboardingAction, storageValue, onboardingVisible, raf, gpu }, null, 2));

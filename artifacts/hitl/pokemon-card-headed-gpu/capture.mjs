import { chromium } from "playwright";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const output = resolve("artifacts/hitl/pokemon-card-headed-gpu");
const profile = await mkdtemp(join(tmpdir(), "pokemon-headed-gpu-repair-"));
const context = await chromium.launchPersistentContext(profile, {
  executablePath: "/usr/bin/chromium",
  headless: false,
  viewport: { width: 1920, height: 1080 },
  args: [
    "--window-position=0,0",
    "--window-size=1920,1080",
    "--start-fullscreen",
    "--use-angle=default",
    "--enable-gpu-rasterization",
    "--ignore-gpu-blocklist",
    "--disable-features=UseChromeOSDirectVideoDecoder",
  ],
});
const page = context.pages()[0] ?? await context.newPage();
const videoPath = join(output, "gallery-to-inspection-1920x1080.webm");
const headedFrames = join(output, "headed-capture-frames");
await mkdir(headedFrames, { recursive: true });
await page.goto("http://127.0.0.1:3211/exhibits/pokemon-cards?evidence=1", { waitUntil: "domcontentloaded" });
await page.locator('[data-testid="pokemon-card-webgl-stage"][data-textures-ready="true"]').waitFor();
await page.waitForTimeout(1200);
await page.screenshot({ path: join(output, "desktop-1920x1080.png") });
for (let frame = 0; frame < 64; frame += 1) {
  const progress = frame / 63;
  await page.mouse.move(580 + progress * 760, 350 + Math.sin(progress * Math.PI * 2) * 180);
  if (frame === 24) await page.getByRole("button", { name: "Inspect selected card" }).click();
  await page.screenshot({ path: join(headedFrames, `frame-${String(frame).padStart(3, "0")}.jpg`), type: "jpeg", quality: 76 });
  await page.waitForTimeout(80);
}
await page.locator('[data-camera-transition="settled"]').waitFor();
await page.waitForTimeout(900);
await page.screenshot({ path: join(output, "inspection-1920x1080.png") });
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://127.0.0.1:3211/exhibits/pokemon-cards?evidence=1", { waitUntil: "domcontentloaded" });
await page.locator('[data-testid="pokemon-card-webgl-stage"][data-textures-ready="true"]').waitFor();
await page.waitForTimeout(800);
await page.screenshot({ path: join(output, "mobile-390x844.png") });
const state = await page.locator('[data-testid="pokemon-cards-exhibit-active"]').evaluate((node) => ({
  cardFaces: node.querySelectorAll('[data-card-face="true"]').length,
  scrollWidth: document.documentElement.scrollWidth,
  viewport: [innerWidth, innerHeight],
  webglRenderer: (() => {
    const canvas = node.querySelector("canvas");
    const gl = canvas?.getContext("webgl2") ?? canvas?.getContext("webgl");
    const debug = gl?.getExtension("WEBGL_debug_renderer_info");
    return gl && debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : "unavailable";
  })(),
}));
await writeFile(join(output, "capture-state.json"), `${JSON.stringify({ profile, state }, null, 2)}\n`);
await page.close();
const encoder = spawn("ffmpeg", ["-y", "-framerate", "8", "-i", join(headedFrames, "frame-%03d.jpg"), "-c:v", "libvpx-vp9", "-crf", "24", "-b:v", "0", videoPath], { stdio: "ignore" });
await new Promise((resolveClose, reject) => {
  encoder.once("error", reject);
  encoder.once("close", (code) => code === 0 ? resolveClose() : reject(new Error(`ffmpeg exited ${code}`)));
});
await context.close();
console.log(JSON.stringify({ profile, state, video: videoPath }, null, 2));

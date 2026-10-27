import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const baseURL = "http://127.0.0.1:8462";
const outDir = "evidence/deployment";
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true });
const results = [];
for (const viewport of [{ name: "desktop", width: 1920, height: 1080 }, { name: "mobile", width: 390, height: 844 }]) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on("console", msg => { if (msg.type() === "error") errors.push({ type: "console", text: msg.text() }); });
  page.on("pageerror", error => errors.push({ type: "pageerror", text: error.message }));
  page.on("requestfailed", request => errors.push({ type: "requestfailed", text: `${request.method()} ${request.url()} ${request.failure()?.errorText}` }));
  page.on("response", response => { if (response.status() >= 400) errors.push({ type: "http", text: `${response.status()} ${response.url()}` }); });
  await page.addInitScript(() => {
    let fullscreen = null;
    Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => fullscreen });
    Object.defineProperty(Element.prototype, "requestFullscreen", { configurable: true, value: async function () {
      fullscreen = document.querySelector(".hero-cards");
      document.dispatchEvent(new Event("fullscreenchange"));
    } });
    Object.defineProperty(Document.prototype, "exitFullscreen", { configurable: true, value: async () => {
      fullscreen = null;
      document.dispatchEvent(new Event("fullscreenchange"));
    } });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && fullscreen) document.exitFullscreen();
    }, true);
  });
  await page.goto(`${baseURL}/exhibits/pokemon-cards?evidence=1&view=macro`, { waitUntil: "networkidle" });
  const stage = page.getByTestId("pokemon-card-webgl-stage");
  await stage.waitFor({ state: "visible" });
  if (await stage.getAttribute("data-textures-ready") !== "true") throw new Error(`${viewport.name}: textures not ready`);
  const choices = page.getByRole("button", { name: /view exact printing/i });
  if (await choices.count() !== 4) throw new Error(`${viewport.name}: expected four exact printings`);
  for (let i = 0; i < 10; i += 1) {
    await choices.nth(i % 4).click();
    await page.waitForFunction(() => document.querySelector('[data-testid="pokemon-card-webgl-stage"]')?.getAttribute('data-textures-ready') === 'true');
  }
  const inspect = page.getByRole("button", { name: "Inspect fullscreen" });
  await inspect.focus();
  await inspect.click();
  await page.getByRole("button", { name: "Exit", exact: true }).waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.querySelector('.hero-cards')?.getAttribute('data-fullscreen-state') === 'gallery');
  const focusReturned = await inspect.evaluate(el => document.activeElement === el);
  if (!focusReturned) throw new Error(`${viewport.name}: native Escape did not return focus`);
  await page.screenshot({ path: `${outDir}/${viewport.name}-runtime.png`, fullPage: true });
  results.push({ viewport, printingTransitions: 10, texturesReady: true, nativeEscape: true, focusReturned, errors });
  await context.close();
}
await browser.close();
const summary = { baseURL, transitionCount: results.reduce((sum, item) => sum + item.printingTransitions, 0), results, errorCount: results.reduce((sum, item) => sum + item.errors.length, 0) };
await writeFile(`${outDir}/runtime-transitions.json`, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
if (summary.transitionCount < 20 || summary.errorCount !== 0) process.exit(1);

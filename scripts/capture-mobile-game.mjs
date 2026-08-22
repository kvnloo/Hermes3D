import { chromium } from "playwright";
import fs from "node:fs/promises";

const output = "docs/mobile-agent-game/evidence";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: "/opt/google/chrome/chrome" });
const sizes = [[320,720],[360,800],[390,844],[412,915],[844,390],[1440,900]];
const results = [];
for (const [width,height] of sizes) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:43891/office/game", { waitUntil: "networkidle" });
  await page.locator("canvas").waitFor({ state: "visible" });
  await page.waitForTimeout(600);
  const file = `${output}/game-${width}x${height}.png`;
  await page.screenshot({ path: file });
  const metrics = await page.evaluate(() => ({
    title: document.title,
    canvasCount: document.querySelectorAll("canvas").length,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    shellHeight: document.querySelector("[data-testid=game-shell]")?.getBoundingClientRect().height,
    minTarget: Math.min(...Array.from(document.querySelectorAll("nav button, aside button")).map((node) => Math.min(node.getBoundingClientRect().width, node.getBoundingClientRect().height))),
  }));
  results.push({ width, height, file, errors, metrics });
  await page.close();
}
await fs.writeFile(`${output}/matrix.json`, JSON.stringify(results, null, 2));
await browser.close();
console.log(JSON.stringify(results, null, 2));

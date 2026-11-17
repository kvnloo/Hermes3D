import { chromium } from "playwright";

const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: true,
  args: ["--use-angle=vulkan", "--enable-features=Vulkan", "--disable-features=UseSkiaRenderer", "--no-first-run"],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
let count = 0;
page.on("console", async (message) => {
  if (message.type() !== "error" || !message.text().includes("Maximum update depth")) return;
  count += 1;
  const values = await Promise.all(message.args().map(async (handle) => {
    try { return await handle.jsonValue(); } catch { return "<unserializable>"; }
  }));
  console.log(JSON.stringify({ count, text: message.text(), location: message.location(), values }));
});
await page.goto(process.argv[2] ?? "http://127.0.0.1:3317/office?camera=ORBIT", { waitUntil: "commit", timeout: 30_000 });
await page.waitForSelector("canvas", { state: "visible", timeout: 60_000 });
await page.waitForTimeout(20_000);
console.log(JSON.stringify({ total: count }));
await browser.close();

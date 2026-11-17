import { chromium } from "playwright";
import fs from "node:fs";

const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome-stable", headless: true, args: ["--use-angle=vulkan", "--enable-features=Vulkan", "--disable-features=UseSkiaRenderer"] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(process.argv[2] ?? "http://127.0.0.1:3321/office?camera=ORBIT", { waitUntil: "domcontentloaded", timeout: 120_000 });
await page.waitForSelector("canvas", { state: "visible", timeout: 120_000 });
await page.waitForTimeout(5_000);
const cdp = await page.context().newCDPSession(page);
await cdp.send("Tracing.start", { categories: process.env.TRACE_CATEGORIES ?? "benchmark", transferMode: "ReturnAsStream" });
await page.waitForTimeout(Number(process.argv[3] ?? 10_000));
const complete = new Promise((resolve) => cdp.once("Tracing.tracingComplete", resolve));
await cdp.send("Tracing.end");
const { stream } = await complete;
const chunks = [];
for (;;) {
  const { data, eof } = await cdp.send("IO.read", { handle: stream });
  chunks.push(data);
  if (eof) break;
}
await cdp.send("IO.close", { handle: stream });
const output = process.argv[4] ?? "output/presentation-smoke-trace.json";
fs.mkdirSync(new URL(".", new URL(`file://${process.cwd()}/${output}`)), { recursive: true });
fs.writeFileSync(output, chunks.join(""));
const trace = JSON.parse(chunks.join(""));
const names = new Map();
for (const event of trace.traceEvents ?? []) names.set(event.name, (names.get(event.name) ?? 0) + 1);
console.log([...names].filter(([name]) => /present|display|swap|frame/i.test(name)).sort((a,b) => b[1]-a[1]).slice(0,100));
await browser.close();

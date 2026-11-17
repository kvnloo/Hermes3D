const { chromium } = require("playwright");
const fs = require("node:fs");

(async () => {
  const baseUrl = process.env.CAPTURE_BASE_URL ?? "http://127.0.0.1:3311";
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/usr/bin/chromium",
  });
  for (const [name, width, height] of [
    ["1080p", 1920, 1080],
    ["mobile", 390, 844],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(`${baseUrl}/office`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `evidence/public-directory/${name}-private.png` });
    const text = await page.locator("body").innerText();
    fs.writeFileSync(`evidence/public-directory/${name}-visible-text-private.txt`, text);
    console.log(
      name,
      await page.getByLabel("Public company directory").isVisible(),
      text.includes("zer0"),
      text.includes("PUBLIC DIRECTORY PREVIEW"),
      text.includes("MESH TOPOLOGY PREVIEW"),
    );
  }
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

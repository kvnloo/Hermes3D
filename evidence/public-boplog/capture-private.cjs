const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium' });
  const baseUrl = process.env.CAPTURE_BASE_URL || 'http://127.0.0.1:3320';
  for (const [name, width, height] of [['1080p',1920,1080],['mobile',390,844]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(`${baseUrl}/office`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(8000);
    await page.screenshot({ path: `evidence/public-boplog/${name}-private.png`, fullPage: false });
    const text = await page.locator('body').innerText();
    fs.writeFileSync(`evidence/public-boplog/${name}-visible-text-private.txt`, text);
    if (!text.toUpperCase().includes('FROM BOPLOG') || !text.includes('Published public information only')) throw new Error(`${name}: projection absent`);
    for (const forbidden of ['/workspace/', '127.0.0.1', 't_6eb40393', 'project_id', 'task_comments']) {
      if (text.includes(forbidden)) throw new Error(`${name}: leaked ${forbidden}`);
    }
  }
  await browser.close();
})();

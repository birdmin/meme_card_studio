const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file:///home/claude/jjal-card-studio/index.html');
  await page.setInputFiles('#file-input', '/home/claude/test-assets/normal.jpg');
  await page.waitForTimeout(150);
  const longKorean = '가나다라마바사아자차카타파하'.repeat(12);
  await page.fill('#text-content', longKorean);
  await page.dispatchEvent('#text-content', 'input');
  // 문구를 캔버스 맨 위쪽(세로 10%)로 이동
  await page.fill('#text-y', '10');
  await page.dispatchEvent('#text-y', 'input');
  await page.waitForTimeout(150);
  await page.locator('#preview-canvas').screenshot({ path: '/home/claude/test-results/13-edge-overflow-top.png' });

  await page.fill('#text-y', '92');
  await page.dispatchEvent('#text-y', 'input');
  await page.waitForTimeout(150);
  await page.locator('#preview-canvas').screenshot({ path: '/home/claude/test-results/13-edge-overflow-bottom.png' });
  await browser.close();
})();

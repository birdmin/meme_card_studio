const { chromium } = require('playwright');
const fs = require('fs');
const PAGE = 'file:///home/claude/jjal-card-studio/index.html';
const OUT = (n) => `/home/claude/jjal-card-studio/docs/finished-samples/${n}`;

async function exportCanvasPng(page, filename) {
  const dataUrl = await page.evaluate(() => document.getElementById('preview-canvas').toDataURL('image/png'));
  fs.writeFileSync(filename, Buffer.from(dataUrl.split(',')[1], 'base64'));
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(PAGE);
  await page.waitForTimeout(150);

  // 완성본 1: 1:1, 가우시안 블러
  await page.selectOption('#ratio-select', '1:1');
  await page.setInputFiles('#file-input', '/home/claude/test-assets/normal.jpg');
  await page.fill('#text-content', '오늘 점심 뭐 먹지 🍜');
  await page.dispatchEvent('#text-content', 'input');
  await page.selectOption('#blur-type', 'gaussian');
  await page.fill('#blur-intensity', '20');
  await page.dispatchEvent('#blur-intensity', 'input');
  await page.fill('#text-color', '#fff4d6');
  await page.dispatchEvent('#text-color', 'input');
  await page.waitForTimeout(150);
  await exportCanvasPng(page, OUT('완성본1-1x1-런치.png'));

  // 완성본 2: 4:5, 블러 없음, 세로 이미지
  await page.selectOption('#ratio-select', '4:5');
  await page.setInputFiles('#file-input', '/home/claude/test-assets/tall.png');
  await page.fill('#text-content', '가을 감성\n카드 한 장');
  await page.dispatchEvent('#text-content', 'input');
  await page.selectOption('#blur-type', 'none');
  await page.fill('#text-color', '#ffffff');
  await page.dispatchEvent('#text-color', 'input');
  await page.fill('#stroke-color', '#1c1710');
  await page.dispatchEvent('#stroke-color', 'input');
  await page.waitForTimeout(150);
  await exportCanvasPng(page, OUT('완성본2-4x5-가을카드.png'));

  // 완성본 3: 16:9, 모션 블러(양옆), 가로 이미지
  await page.selectOption('#ratio-select', '16:9');
  await page.setInputFiles('#file-input', '/home/claude/test-assets/wide.png');
  await page.fill('#text-content', 'Weekend Vibes 주말이다!!');
  await page.dispatchEvent('#text-content', 'input');
  await page.selectOption('#blur-type', 'motion');
  await page.selectOption('#blur-direction', 'side');
  await page.fill('#blur-intensity', '45');
  await page.dispatchEvent('#blur-intensity', 'input');
  await page.waitForTimeout(150);
  await exportCanvasPng(page, OUT('완성본3-16x9-주말.png'));

  console.log('완성 이미지 3개 생성 완료');
  await browser.close();
})();

const { chromium } = require('playwright');
const PAGE = 'file:///home/claude/jjal-card-studio/index.html';
const FIX = (n) => `/home/claude/jjal-card-studio/docs/fixtures/${n}`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.goto(PAGE);
  await page.waitForTimeout(150);

  // 기준 템플릿 2개를 미리 만들어둔다 (건수 대조용)
  await page.setInputFiles('#file-input', '/home/claude/test-assets/normal.jpg');
  await page.fill('#text-content', '기준1'); await page.dispatchEvent('#text-content','input');
  await page.fill('#template-name', '기준템플릿1'); await page.click('#save-template-btn');
  await page.fill('#text-content', '기준2'); await page.dispatchEvent('#text-content','input');
  await page.fill('#template-name', '기준템플릿2'); await page.click('#save-template-btn');
  await page.waitForTimeout(100);

  const countBefore = async () => JSON.parse(await page.evaluate(() =>
    localStorage.getItem('jjal-card-studio:templates'))).length;
  const namesNow = async () => JSON.parse(await page.evaluate(() =>
    localStorage.getItem('jjal-card-studio:templates'))).map(t => t.name);

  const before0 = await countBefore();
  console.log('=== 시작 기준 개수:', before0, namesNow ? await namesNow() : '');

  // ---------- T03-C24: 필수 항목 누락 JSON ----------
  await page.setInputFiles('#import-json-input', FIX('missing-required.json'));
  await page.waitForTimeout(150);
  const afterMissing = await countBefore();
  const statusMissing = await page.locator('#import-status').innerText();
  console.log(`\n[필수 항목 누락] 이전 ${before0} → 이후 ${afterMissing} (같아야 정상)`);
  console.log('상태 메시지:', statusMissing);

  // ---------- T03-C23: 문법 손상 JSON ----------
  await page.setInputFiles('#import-json-input', FIX('broken-syntax.json'));
  await page.waitForTimeout(150);
  const afterBroken = await countBefore();
  const statusBroken = await page.locator('#import-status').innerText();
  console.log(`\n[문법 손상] 이전 ${before0} → 이후 ${afterBroken} (같아야 정상)`);
  console.log('상태 메시지:', statusBroken);

  // ---------- T03-C22: 정상 JSON ----------
  await page.setInputFiles('#import-json-input', FIX('valid-templates.json'));
  await page.waitForTimeout(150);
  const afterValid = await countBefore();
  const statusValid = await page.locator('#import-status').innerText();
  const namesAfterValid = await namesNow();
  console.log(`\n[정상 JSON] 이전 ${before0} → 이후 ${afterValid} (1개 늘어나야 정상)`);
  console.log('상태 메시지:', statusValid);
  console.log('가져오기 후 이름 목록:', namesAfterValid.join(', '));

  console.log('\npageerror:', pageErrors.length ? pageErrors.join('\n') : '(없음)');
  await browser.close();
})();

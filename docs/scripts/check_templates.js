const { chromium } = require('playwright');
const PAGE = 'file:///home/claude/jjal-card-studio/index.html';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.goto(PAGE);
  await page.waitForTimeout(150);
  await page.setInputFiles('#file-input', '/home/claude/test-assets/normal.jpg');
  await page.waitForTimeout(150);

  const saveTemplate = async (name) => {
    await page.fill('#template-name', name);
    await page.click('#save-template-btn');
    await page.waitForTimeout(80);
  };

  // ---- T03-C17: 3개 이상 생성 (총 11개를 만들어서 FIFO까지 같이 검증) ----
  for (let i = 1; i <= 11; i++) {
    await page.fill('#text-content', `문구 ${i}`);
    await page.dispatchEvent('#text-content', 'input');
    await saveTemplate(`템플릿${i}`);
  }

  const countAfter11 = await page.locator('#template-count').innerText();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('jjal-card-studio:templates')));
  console.log('11개 저장 시도 후 개수:', countAfter11, '(localStorage 실제 길이:', stored.length, ')');
  console.log('남아있는 템플릿 이름들:', stored.map(t => t.name).join(', '));
  console.log('=> "템플릿1"이 지워지고 "템플릿2~11"만 남아야 정상');

  // ---- 모달 열어서 카드 렌더 확인 ----
  await page.click('#open-templates-btn');
  await page.waitForTimeout(100);
  const cardCount = await page.locator('.template-card').count();
  console.log('모달에 렌더된 카드 수:', cardCount);

  // ---- T03-C19: 이름 변경(수정) ----
  const firstNameInput = page.locator('.template-name-input').first();
  await firstNameInput.fill('이름바꿈-테스트');
  await firstNameInput.dispatchEvent('change');
  await page.waitForTimeout(100);
  const renamedStored = await page.evaluate(() => JSON.parse(localStorage.getItem('jjal-card-studio:templates')));
  console.log('이름 변경 후 마지막 항목 이름:', renamedStored[renamedStored.length - 1].name);

  // ---- T03-C19: 현재 화면으로 덮어쓰기(수정) ----
  page.once('dialog', (d) => d.accept());
  await page.locator('.overwrite-btn').first().click();
  await page.waitForTimeout(100);

  // ---- T03-C18: 불러오기 ----
  await page.fill('#text-content', '불러오기 테스트 전 임시문구');
  await page.dispatchEvent('#text-content', 'input');
  await page.locator('.load-btn').first().click();
  await page.waitForTimeout(150);
  const textAfterLoad = await page.inputValue('#text-content');
  console.log('불러오기 후 문구 입력칸 값:', JSON.stringify(textAfterLoad));

  // ---- T03-C20: 삭제 ----
  await page.click('#open-templates-btn');
  await page.waitForTimeout(100);
  const beforeDeleteCount = await page.locator('.template-card').count();
  page.once('dialog', (d) => d.accept());
  await page.locator('.delete-btn').first().click();
  await page.waitForTimeout(100);
  const afterDeleteCount = await page.locator('.template-card').count();
  console.log(`삭제 전 카드 수: ${beforeDeleteCount}, 삭제 후: ${afterDeleteCount}`);

  // ---- T03-C21: 새로고침 뒤 유지 ----
  await page.reload();
  await page.waitForTimeout(200);
  const countAfterReload = await page.locator('#template-count').innerText();
  console.log('새로고침 후 템플릿 개수 배지:', countAfterReload);

  console.log('\npageerror 목록:', pageErrors.length ? pageErrors.join('\n') : '(없음)');
  await browser.close();
})();

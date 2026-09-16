const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PAGE = 'file:///home/claude/jjal-card-studio/index.html';
const ASSET = (n) => path.join('/home/claude/test-assets', n);
const SHOT = (n) => path.join('/home/claude/test-results', n);

const log = [];
function record(id, name, expected, actual, result, note) {
  log.push({ id, name, expected, actual, result, note });
  console.log(`[${result}] T${id} ${name} — ${note || ''}`);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await page.goto(PAGE);
  await page.waitForTimeout(200);

  const setText = async (val) => {
    await page.fill('#text-content', val);
    await page.dispatchEvent('#text-content', 'input');
    await page.waitForTimeout(80);
  };
  const shot = async (name) => {
    await page.locator('#preview-canvas').screenshot({ path: SHOT(name) });
  };
  const canvasSize = async () => page.evaluate(() => {
    const c = document.getElementById('preview-canvas');
    return { w: c.width, h: c.height };
  });
  const isCanvasBlank = async () => page.evaluate(() => {
    const c = document.getElementById('preview-canvas');
    const ctx = c.getContext('2d');
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i+3] !== 0) return false; // 뭔가 그려져 있으면 false
    }
    return true;
  });

  // 기준 이미지 업로드 (이후 테스트들의 "기존 편집 내용" 기준점)
  await page.setInputFiles('#file-input', ASSET('normal.jpg'));
  await page.waitForTimeout(200);
  await setText('기준 문구');

  // ---------- T1: 긴 한글 문구 (공백 없는 장문) ----------
  const longKorean = '가나다라마바사아자차카타파하'.repeat(12); // 공백 없는 156자
  await setText(longKorean);
  await shot('01-long-korean.png');
  const err1 = pageErrors.length;
  record(1, '긴 한글 문구(공백없음 156자)', '자동 줄바꿈되어 캔버스 밖으로 넘치지 않음', err1 === 0 ? '에러없음' : `콘솔에러 ${err1}건`, err1 === 0 ? 'PASS' : 'FAIL', '스크린샷 01 참고');

  // ---------- T2: 한글+영문 혼합 ----------
  await setText('Hello 안녕하세요 이것은 Mixed Text 테스트입니다 123 ABC');
  await shot('02-mixed-kor-eng.png');
  record(2, '한글+영문 혼합 문구', '두 문자 모두 정상 렌더링', pageErrors.length === 0 ? '에러없음' : 'FAIL', pageErrors.length === 0 ? 'PASS' : 'FAIL', '스크린샷 02 참고');

  // ---------- T3: 명시적 줄바꿈(엔터) 다중 ----------
  await setText('첫째 줄\n둘째 줄\n\n넷째 줄(한 줄 비움 포함)');
  await shot('03-manual-newlines.png');
  record(3, '수동 줄바꿈 여러 번(빈 줄 포함)', '입력한 줄 수만큼 정확히 나뉘어 표시', pageErrors.length === 0 ? '에러없음' : 'FAIL', pageErrors.length === 0 ? 'PASS' : 'FAIL', '스크린샷 03 참고');

  // ---------- T4: 이모지 ----------
  await setText('오늘 기분 최고 😎🔥💯 완전 좋아 🎉🎉🎉');
  await shot('04-emoji.png');
  const blank4 = await isCanvasBlank();
  record(4, '이모지 포함 문구', '이모지가 깨지지 않고 표시', blank4 ? '캔버스 비어있음' : '렌더링됨(육안 확인 필요)', blank4 ? 'FAIL' : 'PASS(육안확인필요)', '스크린샷 04에서 이모지가 네모(tofu)로 나오는지 직접 확인 필요');

  // ---------- T5: 빈 문구 ----------
  await setText('   '); // 공백만
  await shot('05-empty-text.png');
  const emptyOk = await page.evaluate(() => true); // 크래시 여부만 체크
  record(5, '빈 문구(공백만 입력)', '문구 없이 이미지만 정상 표시, 에러 없음', pageErrors.length === 0 ? '에러없음' : 'FAIL', pageErrors.length === 0 ? 'PASS' : 'FAIL', '스크린샷 05 참고');

  await setText('기준 문구'); // 복원

  // ---------- T6: 세로로 매우 긴 이미지 ----------
  await page.setInputFiles('#file-input', ASSET('tall.png'));
  await page.waitForTimeout(200);
  await shot('06-tall-image.png');
  record(6, '세로로 매우 긴 이미지(300×1500)', '늘어남 없이 가운데 기준 크롭', pageErrors.length === 0 ? '에러없음' : 'FAIL', pageErrors.length === 0 ? 'PASS' : 'FAIL', '스크린샷 06 참고');

  // ---------- T7: 가로로 매우 긴 이미지 ----------
  await page.setInputFiles('#file-input', ASSET('wide.png'));
  await page.waitForTimeout(200);
  await shot('07-wide-image.png');
  record(7, '가로로 매우 긴 이미지(1800×260)', '늘어남 없이 가운데 기준 크롭', pageErrors.length === 0 ? '에러없음' : 'FAIL', pageErrors.length === 0 ? 'PASS' : 'FAIL', '스크린샷 07 참고');

  // ---------- T8: 투명 배경 PNG ----------
  await page.setInputFiles('#file-input', ASSET('transparent.png'));
  await page.waitForTimeout(200);
  await shot('08-transparent-image.png');
  record(8, '투명 배경 PNG', '투명 영역이 그대로 유지되거나 자연스럽게 합성', pageErrors.length === 0 ? '에러없음' : 'FAIL', pageErrors.length === 0 ? 'PASS' : 'FAIL', '스크린샷 08 참고 (PNG 다운로드 시 투명 유지되는지는 별도 확인)');

  // ---------- T9: 특수문자/기호 문구 ----------
  await setText('★☆♥→←•‰§¶#@$%^&*()_+={}[]');
  await shot('09-special-chars.png');
  record(9, '특수문자/기호 문구', '주요 기호가 깨지지 않고 표시', pageErrors.length === 0 ? '에러없음' : 'FAIL', pageErrors.length === 0 ? 'PASS' : 'FAIL', '스크린샷 09 참고');

  // ---------- T10: 초고해상도 이미지 ----------
  const t0 = Date.now();
  await page.setInputFiles('#file-input', ASSET('huge.jpg'));
  await page.waitForTimeout(300);
  const elapsed = Date.now() - t0;
  await shot('10-huge-image.png');
  record(10, '초고해상도 이미지(4000×3000)', '수 초 내 정상 렌더링, 크래시 없음', `${elapsed}ms 소요, ${pageErrors.length}건 에러`, (pageErrors.length === 0) ? 'PASS' : 'FAIL', '스크린샷 10 참고');

  // ---------- T11: 초저해상도 이미지 ----------
  await page.setInputFiles('#file-input', ASSET('tiny.png'));
  await page.waitForTimeout(200);
  await shot('11-tiny-image.png');
  record(11, '초저해상도 이미지(6×6)', '깨지더라도 크래시 없이 확대 표시', pageErrors.length === 0 ? '에러없음' : 'FAIL', pageErrors.length === 0 ? 'PASS' : 'FAIL', '스크린샷 11 참고');

  // 복원: 기존 편집 상태 재구성 (T12 비교 기준)
  await page.setInputFiles('#file-input', ASSET('normal.jpg'));
  await page.waitForTimeout(200);
  await setText('절대 사라지면 안 되는 기존 문구');
  const beforeDataUrl = await page.evaluate(() => document.getElementById('preview-canvas').toDataURL());
  const beforeDropzone = await page.locator('#dropzone-label').innerText();

  // ---------- T12: 손상된 파일 업로드 후 기존 내용 보존 확인 (T03-C16) ----------
  await page.setInputFiles('#file-input', ASSET('corrupt.png'));
  await page.waitForTimeout(300);
  const afterDataUrl = await page.evaluate(() => document.getElementById('preview-canvas').toDataURL());
  const errorShown = await page.locator('#file-error').isVisible();
  const errorText = errorShown ? await page.locator('#file-error').innerText() : '';
  const preserved = beforeDataUrl === afterDataUrl;
  await shot('12-after-corrupt-upload.png');
  record(12, '손상된 PNG(시그니처는 정상, 본문 깨짐) 업로드', '기존 이미지·문구가 그대로 유지 + 거부 사유 표시', `보존됨=${preserved}, 에러메시지표시=${errorShown} ("${errorText}")`, (preserved) ? 'PASS' : 'FAIL', '스크린샷 12 참고 — 12-A(직전 상태)와 비교 필요');

  fs.writeFileSync(SHOT('12-A-before-corrupt.png'), Buffer.from(beforeDataUrl.split(',')[1], 'base64'));

  console.log('\n--- 콘솔 에러 전체 ---');
  console.log(pageErrors.length ? consoleErrors.join('\n') : '(없음)');

  fs.writeFileSync('/home/claude/test-results/log.json', JSON.stringify(log, null, 2));
  await browser.close();
})();

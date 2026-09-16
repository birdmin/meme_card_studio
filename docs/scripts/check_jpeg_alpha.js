const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file:///home/claude/jjal-card-studio/index.html');
  await page.setInputFiles('#file-input', '/home/claude/test-assets/transparent.png');
  await page.waitForTimeout(200);
  // 캔버스 모서리(원 바깥의 투명 영역)의 실제 픽셀을 PNG 기준과 JPEG 기준 각각 확인
  const result = await page.evaluate(() => {
    const c = document.getElementById('preview-canvas');
    const ctx = c.getContext('2d');
    // 캔버스 자체 픽셀(합성 전) - 모서리는 알파 0 이어야 함
    const raw = ctx.getImageData(5, 5, 1, 1).data;
    // PNG로 내보냈을 때
    const pngUrl = c.toDataURL('image/png');
    // JPEG로 내보냈을 때
    const jpegUrl = c.toDataURL('image/jpeg', 0.92);
    return { raw: Array.from(raw), pngLen: pngUrl.length, jpegLen: jpegUrl.length, jpegUrl };
  });
  console.log('캔버스 모서리 픽셀(RGBA):', result.raw);

  // JPEG data URL을 다시 이미지로 그려서 같은 좌표 픽셀 확인
  const jpegPixel = await page.evaluate((jpegUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c2 = document.createElement('canvas');
        c2.width = img.width; c2.height = img.height;
        const ctx2 = c2.getContext('2d');
        ctx2.drawImage(img, 0, 0);
        resolve(Array.from(ctx2.getImageData(5, 5, 1, 1).data));
      };
      img.src = jpegUrl;
    });
  }, result.jpegUrl);
  console.log('JPEG로 내보낸 뒤 같은 좌표 픽셀(RGB):', jpegPixel);
  await browser.close();
})();

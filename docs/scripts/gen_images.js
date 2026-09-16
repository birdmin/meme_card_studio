// 실행 예: PLAYWRIGHT_BROWSERS_PATH=<playwright 브라우저 경로> node docs/scripts/gen_images.js
// 아래 경로는 이 저장소를 클론한 뒤 절대경로로 바꿔서 사용하세요.

const sharp = require('sharp');
const path = require('path');
const out = (n) => path.join('/home/claude/test-assets', n);

async function main() {
  // 1) 세로로 매우 긴 이미지 (1:5 극단 세로)
  await sharp({ create: { width: 300, height: 1500, channels: 3, background: { r: 60, g: 120, b: 200 } } })
    .png().toFile(out('tall.png'));

  // 2) 가로로 매우 긴 이미지 (파노라마급 극단 가로)
  await sharp({ create: { width: 1800, height: 260, channels: 3, background: { r: 210, g: 140, b: 40 } } })
    .png().toFile(out('wide.png'));

  // 3) 투명 배경 PNG (알파 채널)
  const svg = `<svg width="600" height="600" xmlns="http://www.w3.org/2000/svg">
    <circle cx="300" cy="300" r="220" fill="rgba(220,60,90,0.9)"/>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(out('transparent.png'));

  // 4) 초고해상도 이미지
  await sharp({ create: { width: 4000, height: 3000, channels: 3, background: { r: 90, g: 90, b: 90 } } })
    .jpeg({ quality: 85 }).toFile(out('huge.jpg'));

  // 5) 초저해상도(아주 작은) 이미지
  await sharp({ create: { width: 6, height: 6, channels: 3, background: { r: 20, g: 200, b: 120 } } })
    .png().toFile(out('tiny.png'));

  // 6) 일반 정상 이미지 (기준용, 정사각형에 가까움)
  await sharp({ create: { width: 1200, height: 900, channels: 3, background: { r: 140, g: 100, b: 200 } } })
    .jpeg({ quality: 90 }).toFile(out('normal.jpg'));

  console.log('generated');
}
main().catch(e => { console.error(e); process.exit(1); });

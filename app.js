/* =========================================================
   짤·카드 스튜디오 — 카드 1+2
   카드1: 편집과 미리보기 / 카드2: 화면비와 파일의 일치
   ========================================================= */

// ---------- DOM 참조 ----------
const $ = (id) => document.getElementById(id);

const fileInput      = $('file-input');
const dropzone       = $('dropzone');
const dropzoneLabel  = $('dropzone-label');
const fileError      = $('file-error');

const canvas  = $('preview-canvas');
const ctx     = canvas.getContext('2d');
const stageFrame  = $('stage-frame');
const stageStatus = $('stage-status');

const ratioSelect = $('ratio-select');

const textContentEl = $('text-content');
const textXEl   = $('text-x');
const textYEl   = $('text-y');
const textSizeEl= $('text-size');
const textColorEl = $('text-color');
const xValueEl  = $('x-value');
const yValueEl  = $('y-value');
const sizeValueEl = $('size-value');
const textEnabledEl = $('text-enabled');
const textFieldsWrap = $('text-fields');
const strokeEnabledEl = $('stroke-enabled');
const strokeColorEl = $('stroke-color');
const strokeColorField = $('stroke-color-field');

const blurTypeEl      = $('blur-type');
const blurIntensityEl = $('blur-intensity');
const blurIntensityValueEl = $('blur-intensity-value');
const blurIntensityField   = $('blur-intensity-field');
const blurDirectionEl    = $('blur-direction');
const blurDirectionField = $('blur-direction-field');
const blurOmniNote = $('blur-omni-note');
const blurHint = $('blur-hint');

const formatSelect = $('format-select');
const downloadBtn  = $('download-btn');

const templateNameEl   = $('template-name');
const saveTemplateBtn  = $('save-template-btn');
const templateStatusEl = $('template-status');
const openTemplatesBtn = $('open-templates-btn');
const templateCountEl  = $('template-count');
const templateModal      = $('template-modal');
const templateModalClose = $('template-modal-close');
const templateListEl     = $('template-list');
const templateEmptyEl    = $('template-empty');

const exportJsonBtn  = $('export-json-btn');
const importJsonInput = $('import-json-input');
const importStatusEl = $('import-status');

// ---------- 화면비 (SNS 표준 규격, 긴 변 1080px 기준) ----------
const RATIOS = {
  '1:1':  { w: 1080, h: 1080 },
  '4:5':  { w: 1080, h: 1350 },
  '9:16': { w: 1080, h: 1920 },
  '16:9': { w: 1920, h: 1080 },
  '5:4':  { w: 1350, h: 1080 },
};


// ---------- 상태 ----------
const state = {
  image: null,       // HTMLImageElement | null
  ratio: '1:1',
  text: {
    content: textContentEl.value,
    enabled: true,
    xPct: 50,
    yPct: 50,
    size: 48,
    color: '#ffffff',
    strokeEnabled: true,
    strokeColor: '#000000',
  },
  blur: {
    type: 'none',
    intensity: 30,
    direction: 'up',
  },
};

// ---------- 파일 검증 (매직 바이트) ----------
function detectImageType(bytes) {
  if (bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'png';
  }
  if (bytes.length >= 3 &&
      bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }
  return null;
}

async function handleFile(file) {
  if (!file) return;

  let bytes;
  try {
    const buf = await file.arrayBuffer();
    bytes = new Uint8Array(buf.slice(0, 12));
  } catch (err) {
    showFileError(`"${file.name}" 파일을 읽을 수 없습니다.`);
    return;
  }

  const type = detectImageType(bytes);
  if (!type) {
    showFileError(`"${file.name}"은(는) PNG·JPEG가 아니라서 불러올 수 없습니다. 기존 작업은 그대로 남아 있습니다.`);
    return; // 기존 state.image, 캔버스를 건드리지 않는다 (T03-C09)
  }

  clearFileError();

  const blobUrl = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    state.image = img;
    dropzoneLabel.innerHTML = `${escapeHtml(file.name)}<br><small>다른 이미지를 넣으면 교체돼요</small>`;
    stageStatus.textContent = `${type.toUpperCase()} 이미지 불러옴 · 원본 ${img.naturalWidth}×${img.naturalHeight}px`;
    if (state.ratio === 'original') {
      applyRatio('original'); // 새로 불러온 이미지의 실제 비율로 캔버스를 다시 맞춘다
    } else {
      draw();
    }
    URL.revokeObjectURL(blobUrl);
  };
  img.onerror = () => {
    showFileError(`"${file.name}" 파일의 내용이 손상되어 이미지를 열 수 없습니다.`);
    URL.revokeObjectURL(blobUrl);
  };
  img.src = blobUrl;
}

function showFileError(msg) {
  fileError.textContent = msg;
  fileError.hidden = false;
}
function clearFileError() {
  fileError.hidden = true;
  fileError.textContent = '';
}
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ---------- 파일 입력 이벤트 ----------
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});
['dragover'].forEach(evt => dropzone.addEventListener(evt, (e) => {
  e.preventDefault(); dropzone.classList.add('drag-over');
}));
['dragleave', 'drop'].forEach(evt => dropzone.addEventListener(evt, (e) => {
  e.preventDefault(); dropzone.classList.remove('drag-over');
}));
dropzone.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  handleFile(file);
});

// ---------- 화면비 컨트롤 ----------
// 헤더 높이·패널 길이 등 실제 레이아웃을 그때그때 측정해서 계산한다.
// (고정 비율로 어림잡으면 화면이 작거나 패널이 길어졌을 때 사진이 잘릴 수 있음)
function fitStageFrameToRatio(rw, rh) {
  const stageEl = document.querySelector('.stage');
  const rect = stageEl.getBoundingClientRect();
  const PADDING_H = 48; // .stage 좌우 패딩(24px×2)
  const PADDING_TOP = 24; // .stage 상단 패딩
  const RESERVE_BELOW = 64; // 미리보기 아래 상태 문구 + 여백 몫으로 남겨둘 공간
  const availW = Math.max(180, stageEl.clientWidth - PADDING_H);
  const availH = Math.max(180, window.innerHeight - (rect.top + PADDING_TOP) - RESERVE_BELOW);

  let w = availW;
  let h = w * (rh / rw);
  if (h > availH) {
    h = availH;
    w = h * (rw / rh);
  }
  stageFrame.style.width = `${w}px`;
  stageFrame.style.height = `${h}px`;
}

// '원본 비율 그대로'는 고정 크기표가 아니라 불러온 이미지의 실제 가로세로 비율을 그대로 쓴다.
function computeCanvasDims(key, img) {
  if (key === 'original') {
    if (img) {
      const maxDim = 1400; // 캔버스가 지나치게 커지지 않도록 상한
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      return {
        w: Math.max(1, Math.round(img.naturalWidth * scale)),
        h: Math.max(1, Math.round(img.naturalHeight * scale)),
      };
    }
    return { w: 1080, h: 1080 }; // 이미지 불러오기 전 기본값
  }
  return RATIOS[key] || RATIOS['1:1'];
}

function applyRatio(key) {
  state.ratio = key;
  const { w, h } = computeCanvasDims(key, state.image);
  canvas.width = w;
  canvas.height = h;
  fitStageFrameToRatio(w, h);
  draw();
}

ratioSelect.addEventListener('change', () => applyRatio(ratioSelect.value));
window.addEventListener('resize', () => {
  fitStageFrameToRatio(canvas.width, canvas.height);
});

// ---------- 문구 컨트롤 ----------
textEnabledEl.addEventListener('change', () => {
  state.text.enabled = textEnabledEl.checked;
  textFieldsWrap.classList.toggle('is-disabled', !state.text.enabled);
  draw();
});
textContentEl.addEventListener('input', () => {
  state.text.content = textContentEl.value;
  draw();
});
textXEl.addEventListener('input', () => {
  state.text.xPct = Number(textXEl.value);
  xValueEl.textContent = state.text.xPct;
  draw();
});
textYEl.addEventListener('input', () => {
  state.text.yPct = Number(textYEl.value);
  yValueEl.textContent = state.text.yPct;
  draw();
});
textSizeEl.addEventListener('input', () => {
  state.text.size = Number(textSizeEl.value);
  sizeValueEl.textContent = state.text.size;
  draw();
});
textColorEl.addEventListener('input', () => {
  state.text.color = textColorEl.value;
  draw();
});
strokeEnabledEl.addEventListener('change', () => {
  state.text.strokeEnabled = strokeEnabledEl.checked;
  strokeColorField.style.opacity = state.text.strokeEnabled ? 1 : 0.4;
  strokeColorEl.disabled = !state.text.strokeEnabled;
  draw();
});
strokeColorEl.addEventListener('input', () => {
  state.text.strokeColor = strokeColorEl.value;
  draw();
});

// ---------- 블러 컨트롤 ----------
function refreshBlurUI() {
  const type = blurTypeEl.value;
  const isNone = type === 'none';
  const isDirectional = type === 'motion' || type === 'hand';
  const isOmni = type === 'gaussian' || type === 'defocus';

  blurIntensityEl.disabled = isNone;
  blurIntensityField.style.opacity = isNone ? 0.4 : 1;

  if (isNone) {
    // 블러 자체를 적용하지 않으니 방향 영역을 통째로 숨긴다.
    blurDirectionField.hidden = true;
  } else {
    blurDirectionField.hidden = false;
    blurDirectionEl.hidden = !isDirectional;
    blurDirectionEl.disabled = !isDirectional;
    blurOmniNote.hidden = !isOmni;
  }

  blurHint.textContent = isNone
    ? '블러를 적용하지 않으면 원본 화질 그대로 저장돼요.'
    : isDirectional
      ? '모션·핸드 블러는 방향에 따라 흔들리는 결이 달라져요.'
      : '가우시안·디포커스는 방향이 없는 전방향 블러예요.';
}

blurTypeEl.addEventListener('change', () => {
  state.blur.type = blurTypeEl.value;
  refreshBlurUI();
  draw();
});
blurIntensityEl.addEventListener('input', () => {
  state.blur.intensity = Number(blurIntensityEl.value);
  blurIntensityValueEl.textContent = state.blur.intensity;
  draw();
});
blurDirectionEl.addEventListener('change', () => {
  state.blur.direction = blurDirectionEl.value;
  draw();
});
refreshBlurUI();

// ---------- 문구 드래그 (캔버스 위에서 직접 이동) ----------
let dragging = false;
function canvasPosFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const xPct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
  const yPct = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
  return { xPct, yPct };
}
function startDrag(e) {
  dragging = true;
  canvas.classList.add('dragging');
  moveDrag(e);
}
function moveDrag(e) {
  if (!dragging) return;
  const { xPct, yPct } = canvasPosFromEvent(e);
  state.text.xPct = Math.round(xPct);
  state.text.yPct = Math.round(yPct);
  textXEl.value = state.text.xPct;
  textYEl.value = state.text.yPct;
  xValueEl.textContent = state.text.xPct;
  yValueEl.textContent = state.text.yPct;
  draw();
}
function endDrag() {
  dragging = false;
  canvas.classList.remove('dragging');
}
canvas.addEventListener('mousedown', startDrag);
window.addEventListener('mousemove', moveDrag);
window.addEventListener('mouseup', endDrag);
canvas.addEventListener('touchstart', startDrag, { passive: true });
window.addEventListener('touchmove', moveDrag, { passive: true });
window.addEventListener('touchend', endDrag);

// ---------- 이미지 커버(cover) 크롭 계산 ----------
// 캔버스 비율과 원본 이미지 비율이 다르면, 가운데를 기준으로
// 짧은 쪽에 맞춰 긴 쪽을 잘라내어(cover) 늘어남/찌그러짐 없이 꽉 채운다.
function computeCoverRect(img, w, h) {
  const irw = img.naturalWidth;
  const irh = img.naturalHeight;
  const canvasRatio = w / h;
  const imgRatio = irw / irh;
  let sx, sy, sw, sh;
  if (imgRatio > canvasRatio) {
    sh = irh;
    sw = sh * canvasRatio;
    sx = (irw - sw) / 2;
    sy = 0;
  } else {
    sw = irw;
    sh = sw / canvasRatio;
    sx = 0;
    sy = (irh - sh) / 2;
  }
  return { sx, sy, sw, sh };
}

// ---------- 블러 렌더링 ----------
function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function directionVector(direction) {
  switch (direction) {
    case 'up':   return { dx: 0, dy: -1 };
    case 'down': return { dx: 0, dy: 1 };
    case 'side': return { dx: 1, dy: 0 };
    default:     return { dx: 0, dy: -1 };
  }
}

function drawBackgroundImage(img, w, h) {
  const { type, intensity, direction } = state.blur;
  const cover = computeCoverRect(img, w, h);
  const drawCover = (dx = 0, dy = 0) => {
    ctx.drawImage(img, cover.sx, cover.sy, cover.sw, cover.sh, dx, dy, w, h);
  };

  if (type === 'none' || intensity === 0) {
    drawCover(0, 0);
    return;
  }

  if (type === 'gaussian') {
    const px = (intensity / 100) * 24;
    ctx.filter = `blur(${px}px)`;
    drawCover(0, 0);
    ctx.filter = 'none';
    return;
  }

  if (type === 'defocus') {
    const px = (intensity / 100) * 30;
    ctx.filter = `blur(${px}px) brightness(1.06) contrast(0.94) saturate(1.05)`;
    drawCover(0, 0);
    ctx.filter = 'none';
    return;
  }

  if (type === 'motion') {
    const maxOffset = (intensity / 100) * (Math.max(w, h) * 0.12);
    const steps = 24;
    const { dx, dy } = directionVector(direction);
    ctx.save();
    ctx.globalAlpha = 1 / steps;
    ctx.filter = 'blur(1px)';
    if (direction === 'side') {
      for (let i = 0; i < steps; i++) {
        const t = (i / (steps - 1)) * 2 - 1;
        drawCover(t * maxOffset, 0);
      }
    } else {
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        drawCover(dx * t * maxOffset, dy * t * maxOffset);
      }
    }
    ctx.restore();
    ctx.filter = 'none';
    return;
  }

  if (type === 'hand') {
    const rand = seededRandom(20240917);
    const maxOffset = (intensity / 100) * (Math.max(w, h) * 0.06);
    const steps = 18;
    const baseAngle = direction === 'up' ? -90 : direction === 'down' ? 90 : 0;
    ctx.save();
    ctx.globalAlpha = 1 / steps;
    ctx.filter = 'blur(1.5px)';
    for (let i = 0; i < steps; i++) {
      const jitterAngle = baseAngle + (rand() - 0.5) * 50;
      const mag = maxOffset * (0.4 + rand() * 0.6);
      const rad = (jitterAngle * Math.PI) / 180;
      const ox = Math.cos(rad) * mag * (direction === 'side' ? (rand() > 0.5 ? 1 : -1) : 1);
      const oy = Math.sin(rad) * mag;
      drawCover(ox, oy);
    }
    ctx.restore();
    ctx.filter = 'none';
    return;
  }
}

// ---------- 문구 줄바꿈 ----------
// 사용자가 직접 넣은 줄바꿈(\n)은 그대로 유지하고,
// 한 줄이 maxWidth를 넘으면 단어 단위로, 단어 자체가 넘으면 글자 단위로 자동 줄바꿈한다.
function wrapLines(context, text, maxWidth) {
  const lines = [];
  const paragraphs = text.split(/\r?\n/);

  for (const para of paragraphs) {
    if (para.length === 0) { lines.push(''); continue; }
    let line = '';
    const words = para.split(' ');

    for (const word of words) {
      const attempt = line ? `${line} ${word}` : word;
      if (context.measureText(attempt).width <= maxWidth) {
        line = attempt;
        continue;
      }
      if (line) { lines.push(line); line = ''; }
      if (context.measureText(word).width <= maxWidth) {
        line = word;
      } else {
        let chunk = '';
        for (const ch of word) {
          if (chunk && context.measureText(chunk + ch).width > maxWidth) {
            lines.push(chunk);
            chunk = ch;
          } else {
            chunk += ch;
          }
        }
        line = chunk;
      }
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : [''];
}

// ---------- 전체 다시 그리기 ----------
function draw() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  if (state.image) {
    // 투명 영역이 있는 PNG를 JPEG로 내보내면 브라우저가 알파를 검정으로
    // 뭉개버리기 때문에, 항상 흰 배경을 먼저 깔아 미리보기·PNG·JPEG가
    // 모두 같은 모습이 되도록 한다.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    drawBackgroundImage(state.image, w, h);
  } else {
    ctx.fillStyle = '#efe9da';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#a49c86';
    ctx.font = `500 ${Math.round(w * 0.035)}px "Pretendard", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('이미지를 불러오세요', w / 2, h / 2);
  }

  const content = state.text.content;
  if (state.text.enabled && content.trim()) {
    const size = state.text.size;
    ctx.font = `700 ${size}px "Pretendard", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, size * 0.12);

    const maxTextWidth = w * 0.84; // 좌우 8%씩 여백 → 가장자리 확인용
    const lines = wrapLines(ctx, content, maxTextWidth);
    const lineHeight = size * 1.25;
    const totalHeight = lineHeight * lines.length;
    const margin = Math.max(8, size * 0.15);

    let centerX = (state.text.xPct / 100) * w;
    let centerY = (state.text.yPct / 100) * h;

    // 가로: 문구가 화면비/드래그 위치와 상관없이 캔버스 밖으로 잘리지 않도록 고정
    const widestLine = Math.max(...lines.map((l) => ctx.measureText(l).width), 0);
    const halfLine = widestLine / 2;
    if (widestLine + margin * 2 <= w) {
      centerX = Math.min(Math.max(centerX, halfLine + margin), w - halfLine - margin);
    } else {
      centerX = w / 2; // 그래도 넘치면 가운데 정렬로 최대한 보이게
    }

    // 세로: 줄 수가 많아 문구 블록이 위/아래 끝에서 잘리는 것을 방지
    let startY = centerY - totalHeight / 2 + lineHeight / 2;
    if (totalHeight + margin * 2 <= h) {
      const topBound = margin + lineHeight / 2;
      const bottomBound = h - margin - lineHeight / 2 - lineHeight * (lines.length - 1);
      startY = Math.min(Math.max(startY, topBound), bottomBound);
    } else {
      startY = margin + lineHeight / 2; // 줄이 너무 많으면 맨 위부터라도 보이게
    }

    lines.forEach((line, i) => {
      const y = startY + i * lineHeight;
      if (state.text.strokeEnabled) {
        ctx.strokeStyle = state.text.strokeColor;
        ctx.strokeText(line, centerX, y);
      }
      ctx.fillStyle = state.text.color;
      ctx.fillText(line, centerX, y);
    });
  }
}

// ---------- 내려받기 ----------
// 화면(canvas)에 실제로 그려진 픽셀을 그대로 파일로 뽑아내므로
// 미리보기와 다운로드 파일이 항상 같다 (T03-C11~13).
downloadBtn.addEventListener('click', () => {
  const format = formatSelect.value;
  const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const quality = format === 'jpeg' ? 0.92 : undefined;
  const ext = format === 'jpeg' ? 'jpg' : 'png';

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jjal-card-${state.ratio.replace(':', 'x')}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, mime, quality);
});

// =========================================================
// 카드 4 — 템플릿 관리 (localStorage에 최대 10개, 오래된 것부터 자동 삭제)
// =========================================================
const TEMPLATES_KEY = 'jjal-card-studio:templates';
const MAX_TEMPLATES = 10;
let templateStatusTimer = null;

function genId() {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadTemplates() {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error('템플릿을 불러오지 못했습니다.', err);
    return [];
  }
}

function persistTemplates(list) {
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(list));
    return true;
  } catch (err) {
    console.error('템플릿을 저장하지 못했습니다.', err);
    return false;
  }
}

function showTemplateStatus(msg, type) {
  templateStatusEl.textContent = msg;
  templateStatusEl.className = `template-status ${type}`;
  templateStatusEl.hidden = false;
  clearTimeout(templateStatusTimer);
  templateStatusTimer = setTimeout(() => { templateStatusEl.hidden = true; }, 4500);
}

function formatDate(ts) {
  return new Date(ts).toLocaleString('ko-KR', {
    year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

// 원본 이미지를 저장 용량 절약을 위해 긴 변 기준 900px로 줄여서 저장한다.
// (다시 불러왔을 때 계속 편집할 수 있도록 원본 화질이 아닌 원본 "이미지"를 보존)
function toDownscaledDataUrl(img, maxSize) {
  const ratio = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * ratio));
  const h = Math.max(1, Math.round(img.naturalHeight * ratio));
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  off.getContext('2d').drawImage(img, 0, 0, w, h);
  return off.toDataURL('image/png');
}

// 썸네일은 현재 편집 화면(블러·문구 합성 결과)을 작게 캡처한다.
function captureThumbnail() {
  const maxSize = 380;
  const ratio = Math.min(1, maxSize / Math.max(canvas.width, canvas.height));
  const w = Math.max(1, Math.round(canvas.width * ratio));
  const h = Math.max(1, Math.round(canvas.height * ratio));
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  off.getContext('2d').drawImage(canvas, 0, 0, w, h);
  return off.toDataURL('image/jpeg', 0.75);
}

function buildTemplateFromCurrentState(name) {
  return {
    id: genId(),
    name: name || '제목 없음',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    thumbnail: captureThumbnail(),
    data: {
      imageDataUrl: state.image ? toDownscaledDataUrl(state.image, 900) : null,
      ratio: state.ratio,
      text: { ...state.text },
      blur: { ...state.blur },
    },
  };
}

function saveCurrentAsTemplate() {
  const list = loadTemplates(); // 배열 순서 = 저장한 순서(오래된 것이 앞)
  const tpl = buildTemplateFromCurrentState(templateNameEl.value.trim());

  let evictedName = null;
  if (list.length >= MAX_TEMPLATES) {
    const removed = list.shift(); // 가장 오래된 템플릿 제거 (T03: 안정된 id 기준, 배열 위치에 의존하지 않음)
    evictedName = removed ? removed.name : null;
  }
  list.push(tpl);

  const ok = persistTemplates(list);
  if (!ok) {
    showTemplateStatus('저장 공간이 부족해서 템플릿을 저장하지 못했습니다. 오래된 템플릿을 지우고 다시 시도해보세요.', 'warn');
    return;
  }

  templateNameEl.value = '';
  renderTemplateList();
  showTemplateStatus(
    evictedName
      ? `저장했어요. 10개를 넘어서 가장 오래된 "${evictedName}" 템플릿은 자동으로 지워졌습니다.`
      : '현재 상태를 템플릿으로 저장했어요.',
    'ok'
  );
}

function renameTemplate(id, name) {
  const list = loadTemplates();
  const idx = list.findIndex((t) => t.id === id); // id로 찾는다 (배열 위치 사용 금지)
  if (idx === -1) return;
  list[idx].name = name;
  list[idx].updatedAt = Date.now();
  persistTemplates(list);
  renderTemplateList();
}

function overwriteTemplate(id) {
  if (!confirm('현재 화면 내용으로 이 템플릿을 덮어쓸까요? 되돌릴 수 없습니다.')) return;
  const list = loadTemplates();
  const idx = list.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const fresh = buildTemplateFromCurrentState(list[idx].name);
  fresh.id = id; // 안정된 id를 그대로 유지해야 카드가 같은 템플릿으로 인식됨
  fresh.createdAt = list[idx].createdAt;
  fresh.updatedAt = Date.now();
  list[idx] = fresh;
  persistTemplates(list);
  renderTemplateList();
  showTemplateStatus('템플릿을 현재 화면 내용으로 수정했습니다.', 'ok');
}

function deleteTemplateById(id) {
  if (!confirm('이 템플릿을 삭제할까요? 되돌릴 수 없습니다.')) return;
  const list = loadTemplates().filter((t) => t.id !== id);
  persistTemplates(list);
  renderTemplateList();
}

function loadTemplateById(id) {
  const list = loadTemplates();
  const tpl = list.find((t) => t.id === id);
  if (!tpl) return;
  applyTemplateData(tpl.data);
  closeTemplateModal();
  showTemplateStatus(`"${tpl.name}" 템플릿을 불러왔습니다.`, 'ok');
}

// 저장된 데이터로 편집기 상태 + 화면 컨트롤을 전부 다시 그린다.
function applyTemplateData(data) {
  state.ratio = data.ratio || '1:1';
  state.text = { ...state.text, ...data.text };
  state.blur = { ...state.blur, ...data.blur };

  const sizeCanvasTo = (img) => {
    const { w, h } = computeCanvasDims(state.ratio, img);
    canvas.width = w;
    canvas.height = h;
    fitStageFrameToRatio(w, h);
  };

  syncControlsFromState();

  if (data.imageDataUrl) {
    const img = new Image();
    img.onload = () => { state.image = img; sizeCanvasTo(img); draw(); };
    img.src = data.imageDataUrl;
  } else {
    state.image = null;
    sizeCanvasTo(null);
    draw();
  }
}

// 문구/블러/화면비 컨트롤들의 표시값을 state 기준으로 다시 맞춘다 (템플릿 불러오기 전용).
function syncControlsFromState() {
  ratioSelect.value = state.ratio;

  textContentEl.value = state.text.content;
  textEnabledEl.checked = state.text.enabled;
  textFieldsWrap.classList.toggle('is-disabled', !state.text.enabled);
  textXEl.value = state.text.xPct;
  xValueEl.textContent = state.text.xPct;
  textYEl.value = state.text.yPct;
  yValueEl.textContent = state.text.yPct;
  textSizeEl.value = state.text.size;
  sizeValueEl.textContent = state.text.size;
  textColorEl.value = state.text.color;
  strokeEnabledEl.checked = state.text.strokeEnabled;
  strokeColorField.style.opacity = state.text.strokeEnabled ? 1 : 0.4;
  strokeColorEl.disabled = !state.text.strokeEnabled;
  strokeColorEl.value = state.text.strokeColor;

  blurTypeEl.value = state.blur.type;
  blurIntensityEl.value = state.blur.intensity;
  blurIntensityValueEl.textContent = state.blur.intensity;
  blurDirectionEl.value = state.blur.direction;
  refreshBlurUI();
}

function renderTemplateList() {
  const list = loadTemplates();
  templateCountEl.textContent = list.length;
  templateListEl.innerHTML = '';
  templateEmptyEl.hidden = list.length > 0;

  [...list].reverse().forEach((tpl) => { // 최신 저장분이 먼저 보이게
    const card = document.createElement('div');
    card.className = 'template-card';

    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'template-thumb';
    if (tpl.thumbnail) {
      const img = document.createElement('img');
      img.src = tpl.thumbnail;
      img.alt = tpl.name;
      thumbWrap.appendChild(img);
    }
    card.appendChild(thumbWrap);

    const body = document.createElement('div');
    body.className = 'template-card-body';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'template-name-input';
    nameInput.maxLength = 40;
    nameInput.value = tpl.name;
    nameInput.addEventListener('change', () => {
      renameTemplate(tpl.id, nameInput.value.trim() || '제목 없음');
    });
    body.appendChild(nameInput);

    const meta = document.createElement('p');
    meta.className = 'template-meta';
    meta.textContent = tpl.updatedAt !== tpl.createdAt
      ? `저장 ${formatDate(tpl.createdAt)} · 수정 ${formatDate(tpl.updatedAt)}`
      : `저장 ${formatDate(tpl.createdAt)}`;
    body.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'template-actions';

    const loadBtn = document.createElement('button');
    loadBtn.type = 'button';
    loadBtn.className = 'load-btn';
    loadBtn.textContent = '불러오기';
    loadBtn.addEventListener('click', () => loadTemplateById(tpl.id));

    const overwriteBtn = document.createElement('button');
    overwriteBtn.type = 'button';
    overwriteBtn.className = 'overwrite-btn';
    overwriteBtn.textContent = '현재 화면으로 수정';
    overwriteBtn.addEventListener('click', () => overwriteTemplate(tpl.id));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '삭제';
    deleteBtn.addEventListener('click', () => deleteTemplateById(tpl.id));

    actions.append(loadBtn, overwriteBtn, deleteBtn);
    body.appendChild(actions);
    card.appendChild(body);
    templateListEl.appendChild(card);
  });
}

function openTemplateModal() {
  renderTemplateList();
  templateModal.hidden = false;
}
function closeTemplateModal() {
  templateModal.hidden = true;
}

saveTemplateBtn.addEventListener('click', saveCurrentAsTemplate);
openTemplatesBtn.addEventListener('click', openTemplateModal);
templateModalClose.addEventListener('click', closeTemplateModal);
templateModal.addEventListener('click', (e) => {
  if (e.target === templateModal) closeTemplateModal();
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !templateModal.hidden) closeTemplateModal();
});

// =========================================================
// 카드 5 — 템플릿 JSON 내보내기 / 가져오기 (정상·문법손상·필수누락 검증)
// =========================================================
function showImportStatus(msg, type) {
  importStatusEl.textContent = msg;
  importStatusEl.className = `template-status ${type}`;
  importStatusEl.hidden = false;
}

exportJsonBtn.addEventListener('click', () => {
  const payload = {
    exportedAt: Date.now(),
    exportedFrom: '짤·카드 스튜디오',
    templates: loadTemplates(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `jjal-card-templates-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
});

// 가져온 JSON을 검증한다. 문법이 깨졌거나(SyntaxError) 필수 항목이
// 하나라도 빠지면 전체를 거부하고, 이 함수는 절대 localStorage를 건드리지 않는다.
// (저장은 검증을 통과한 뒤 별도로 수행 — "전체 검증 후 저장" 원칙)
function validateTemplatePayload(rawText) {
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    return { ok: false, reason: 'JSON 문법이 올바르지 않습니다 (문법 오류).' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, reason: '최상위 항목이 객체가 아닙니다.' };
  }
  if (!Array.isArray(parsed.templates)) {
    return { ok: false, reason: '필수 항목인 templates 배열이 없습니다.' };
  }
  if (parsed.templates.length === 0) {
    return { ok: false, reason: 'templates 배열이 비어 있습니다.' };
  }

  const cleaned = [];
  for (let i = 0; i < parsed.templates.length; i++) {
    const item = parsed.templates[i];
    if (!item || typeof item !== 'object') {
      return { ok: false, reason: `templates[${i}]가 객체가 아닙니다.` };
    }
    if (typeof item.name !== 'string' || !item.name.trim()) {
      return { ok: false, reason: `templates[${i}].name(이름)이 없습니다.` };
    }
    if (!item.data || typeof item.data !== 'object') {
      return { ok: false, reason: `templates[${i}].data가 없습니다.` };
    }
    if (!RATIOS[item.data.ratio]) {
      return { ok: false, reason: `templates[${i}].data.ratio 값이 올바르지 않습니다.` };
    }
    const t = item.data.text;
    if (!t || typeof t.content !== 'string' || typeof t.xPct !== 'number' ||
        typeof t.yPct !== 'number' || typeof t.size !== 'number' || typeof t.color !== 'string') {
      return { ok: false, reason: `templates[${i}].data.text 필수 항목(content/xPct/yPct/size/color)이 빠졌습니다.` };
    }
    const b = item.data.blur;
    if (!b || typeof b.type !== 'string') {
      return { ok: false, reason: `templates[${i}].data.blur.type이 빠졌습니다.` };
    }
    if (item.data.imageDataUrl != null &&
        (typeof item.data.imageDataUrl !== 'string' || !item.data.imageDataUrl.startsWith('data:image'))) {
      return { ok: false, reason: `templates[${i}].data.imageDataUrl 형식이 올바르지 않습니다.` };
    }

    cleaned.push({
      id: genId(), // 충돌 방지를 위해 항상 새 id 부여
      name: item.name.trim().slice(0, 40),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      thumbnail: (typeof item.thumbnail === 'string' && item.thumbnail.startsWith('data:image')) ? item.thumbnail : null,
      data: {
        imageDataUrl: item.data.imageDataUrl || null,
        ratio: item.data.ratio,
        text: {
          content: t.content,
          enabled: typeof t.enabled === 'boolean' ? t.enabled : true,
          xPct: t.xPct,
          yPct: t.yPct,
          size: t.size,
          color: t.color,
          strokeEnabled: typeof t.strokeEnabled === 'boolean' ? t.strokeEnabled : true,
          strokeColor: typeof t.strokeColor === 'string' ? t.strokeColor : '#000000',
        },
        blur: {
          type: b.type,
          intensity: typeof b.intensity === 'number' ? b.intensity : 0,
          direction: typeof b.direction === 'string' ? b.direction : 'up',
        },
      },
    });
  }

  return { ok: true, templates: cleaned };
}

importJsonInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const before = loadTemplates();
  const beforeCount = before.length;

  let text;
  try {
    text = await file.text();
  } catch (err) {
    showImportStatus(`가져오기 실패: 파일을 읽을 수 없습니다. (기존 템플릿 ${beforeCount}개 유지됨)`, 'warn');
    importJsonInput.value = '';
    return;
  }

  const result = validateTemplatePayload(text);
  if (!result.ok) {
    // 검증 실패 → localStorage에 절대 쓰지 않는다 (T03-C23, T03-C24)
    showImportStatus(`가져오기 거부: ${result.reason} (기존 템플릿 ${beforeCount}개는 그대로 유지됩니다)`, 'warn');
    importJsonInput.value = '';
    renderTemplateList(); // 목록이 안 바뀌었음을 눈으로도 확인 가능하게 다시 그림
    return;
  }

  let combined = [...before, ...result.templates];
  let evicted = 0;
  while (combined.length > MAX_TEMPLATES) { combined.shift(); evicted++; }

  const ok = persistTemplates(combined);
  if (!ok) {
    showImportStatus(`가져오기 실패: 저장 공간이 부족합니다. (기존 템플릿 ${beforeCount}개 유지됨)`, 'warn');
    importJsonInput.value = '';
    return;
  }

  renderTemplateList();
  showImportStatus(
    `가져오기 성공: ${result.templates.length}개 추가 (가져오기 전 ${beforeCount}개 → 후 ${combined.length}개${evicted ? `, 10개 제한으로 오래된 ${evicted}개 자동 삭제` : ''})`,
    'ok'
  );
  importJsonInput.value = '';
});

// ---------- 초기화 ----------
ratioSelect.value = 'original';
applyRatio('original');
renderTemplateList();

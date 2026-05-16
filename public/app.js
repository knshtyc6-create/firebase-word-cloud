const sampleText = `教學 設計 課程 學生 閱讀 表達 思考 素養 評量 回饋 合作 探究
教學 教學 課程 課程 學生 學生 學生 閱讀 閱讀 思考 思考
資料 整理 重點 摘要 問題 討論 活動 任務 反思 成長 概念 架構
AI 工具 Obsidian GitHub Firebase 網頁 分享 展示 視覺 關鍵字`;

const palettes = {
  classroom: ["#0f766e", "#115e59", "#d97706", "#334155", "#7c2d12", "#047857"],
  coral: ["#be123c", "#e11d48", "#f97316", "#7f1d1d", "#9f1239", "#c2410c"],
  ink: ["#1f2937", "#2563eb", "#0f172a", "#0369a1", "#4338ca", "#475569"]
};

const stopWords = new Set([
  "的", "了", "和", "是", "在", "有", "與", "及", "或", "也", "就", "都", "而",
  "the", "and", "for", "that", "this", "with", "from", "you", "your", "are", "was"
]);

const sourceText = document.querySelector("#sourceText");
const wordLimit = document.querySelector("#wordLimit");
const density = document.querySelector("#density");
const canvas = document.querySelector("#cloudCanvas");
const ctx = canvas.getContext("2d");
const totalWords = document.querySelector("#totalWords");
const topWord = document.querySelector("#topWord");
let activePalette = "classroom";
let seed = 1;

sourceText.value = sampleText;

function tokenize(text) {
  const mixed = text
    .replace(/[，。！？、；：「」『』（）【】]/g, " ")
    .match(/[A-Za-z0-9+#.-]{2,}|[\u4e00-\u9fff]{1,4}/g) || [];

  const counts = new Map();
  mixed.forEach((raw) => {
    const word = raw.trim();
    const key = /[A-Za-z]/.test(word) ? word.toLowerCase() : word;
    if (!key || stopWords.has(key)) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return Array.from(counts, ([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));
}

function seededRandom() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(900, Math.floor(rect.width * ratio));
  canvas.height = Math.max(560, Math.floor(rect.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function intersects(a, boxes) {
  return boxes.some((b) => (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  ));
}

function drawCloud() {
  resizeCanvas();
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--stage");
  ctx.fillRect(0, 0, rect.width, rect.height);

  const words = tokenize(sourceText.value).slice(0, Number(wordLimit.value));
  const max = words[0]?.count || 1;
  const min = words.at(-1)?.count || 1;
  const boxes = [];
  const colors = palettes[activePalette];
  const scale = Number(density.value) / 100;

  words.forEach((word, index) => {
    const weight = (word.count - min) / Math.max(1, max - min);
    const fontSize = Math.round((18 + weight * 58) * scale);
    ctx.font = `800 ${fontSize}px "Segoe UI", "Noto Sans TC", sans-serif`;
    ctx.textBaseline = "middle";
    const metrics = ctx.measureText(word.text);
    const box = {
      w: metrics.width + 18,
      h: fontSize + 14,
      x: rect.width / 2,
      y: rect.height / 2
    };

    let placed = false;
    const angleOffset = seededRandom() * Math.PI * 2;
    for (let step = 0; step < 900 && !placed; step += 1) {
      const angle = step * 0.42 + angleOffset;
      const radius = 4 + step * 2.8;
      box.x = rect.width / 2 + Math.cos(angle) * radius - box.w / 2;
      box.y = rect.height / 2 + Math.sin(angle) * radius - box.h / 2;
      const inside = box.x > 12 && box.y > 12 && box.x + box.w < rect.width - 12 && box.y + box.h < rect.height - 12;
      if (inside && !intersects(box, boxes)) placed = true;
    }

    if (!placed) return;
    boxes.push({ ...box });
    ctx.fillStyle = colors[index % colors.length];
    ctx.fillText(word.text, box.x + 9, box.y + box.h / 2);
  });

  totalWords.textContent = `${words.length} 個詞`;
  topWord.textContent = words[0] ? `最高頻：${words[0].text} (${words[0].count})` : "尚未分析";
}

document.querySelector("#renderBtn").addEventListener("click", () => {
  seed = Date.now();
  drawCloud();
});

document.querySelector("#shuffleBtn").addEventListener("click", () => {
  seed = Date.now() + Math.floor(Math.random() * 9999);
  drawCloud();
});

document.querySelector("#downloadBtn").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "word-cloud.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});

document.querySelectorAll(".swatch").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".swatch").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    activePalette = button.dataset.palette;
    drawCloud();
  });
});

window.addEventListener("resize", drawCloud);
drawCloud();

import JSZip from "jszip";

export type MaskShape = "Rounded square" | "Squircle" | "Circle" | "Fullbleed";

export interface ShapeOption {
  label: string;
  value: MaskShape;
  description: string;
}

export const SHAPES: ShapeOption[] = [
  {
    label: "Rounded square",
    value: "Rounded square",
    description: "標準圓角方形（可自訂圓角弧度）",
  },
  {
    label: "Squircle",
    value: "Squircle",
    description: "超橢圓曲線（iOS 平滑連續曲線）",
  },
  {
    label: "Circle",
    value: "Circle",
    description: "正圓形（Android Pixel 經典圖標）",
  },
  {
    label: "Fullbleed",
    value: "Fullbleed",
    description: "滿版直角正方形（無遮罩裁切）",
  },
];

/**
 * 繪製 Fullbleed（滿版正方形）
 */
export function drawFullbleed(ctx: CanvasRenderingContext2D, size: number) {
  ctx.beginPath();
  ctx.rect(0, 0, size, size);
  ctx.closePath();
}

/**
 * 繪製 Circle（正圓形）
 */
export function drawCircle(ctx: CanvasRenderingContext2D, size: number) {
  const r = size / 2;
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.closePath();
}

/**
 * 繪製 Rounded Square（標準圓角矩形）
 * 使用 100% 相容的標準 ctx.arc 繪製四角圓弧，確保在所有瀏覽器與離線 Canvas 皆精準裁切
 */
export function drawRoundedSquare(
  ctx: CanvasRenderingContext2D,
  size: number,
  radius = size * 0.22
) {
  const r = Math.max(0, Math.min(radius, size / 2));
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.arc(size - r, r, r, -Math.PI / 2, 0, false);
  ctx.lineTo(size, size - r);
  ctx.arc(size - r, size - r, r, 0, Math.PI / 2, false);
  ctx.lineTo(r, size);
  ctx.arc(r, size - r, r, Math.PI / 2, Math.PI, false);
  ctx.lineTo(0, r);
  ctx.arc(r, r, r, Math.PI, (3 * Math.PI) / 2, false);
  ctx.closePath();
}

/**
 * 繪製 Squircle（超橢圓 / Lamé curve，|x/a|^n + |y/b|^n = 1，n=4.2）
 */
export function drawSquircle(
  ctx: CanvasRenderingContext2D,
  size: number,
  n = 4.2
) {
  const r = size / 2;
  const cx = r;
  const cy = r;
  const steps = 360;

  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const theta = (i * 2 * Math.PI) / steps;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    const x = cx + Math.sign(cosT) * r * Math.pow(Math.abs(cosT), 2 / n);
    const y = cy + Math.sign(sinT) * r * Math.pow(Math.abs(sinT), 2 / n);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
}

/**
 * 繪製對應形狀的路徑
 */
export function applyShapePath(
  ctx: CanvasRenderingContext2D,
  shape: MaskShape,
  size: number,
  roundRadiusRatio = 0.22
) {
  switch (shape) {
    case "Circle":
      drawCircle(ctx, size);
      break;
    case "Rounded square":
      drawRoundedSquare(ctx, size, size * roundRadiusRatio);
      break;
    case "Squircle":
      drawSquircle(ctx, size);
      break;
    case "Fullbleed":
    default:
      drawFullbleed(ctx, size);
      break;
  }
}

/**
 * 繪製透明棋盤格底圖
 */
export function drawCheckerboard(
  ctx: CanvasRenderingContext2D,
  size: number,
  gridSize = 16
) {
  ctx.save();
  const rows = Math.ceil(size / gridSize);
  const cols = Math.ceil(size / gridSize);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? "#f8fafc" : "#e2e8f0";
      ctx.fillRect(c * gridSize, r * gridSize, gridSize, gridSize);
    }
  }
  ctx.restore();
}

/**
 * 繪製 PWA Maskable Icon 安全區域（Safe Area）輔助線
 */
export function drawSafeAreaOverlay(
  ctx: CanvasRenderingContext2D,
  size: number
) {
  ctx.save();
  const cx = size / 2;
  const cy = size / 2;
  const safeRadius = (size * 0.8) / 2;

  ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
  ctx.lineWidth = Math.max(2, size * 0.005);
  ctx.setLineDash([8, 6]);

  ctx.beginPath();
  ctx.arc(cx, cy, safeRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(239, 68, 68, 0.45)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  ctx.beginPath();
  ctx.moveTo(cx, cy - safeRadius - 10);
  ctx.lineTo(cx, cy + safeRadius + 10);
  ctx.moveTo(cx - safeRadius - 10, cy);
  ctx.lineTo(cx + safeRadius + 10, cy);
  ctx.stroke();

  ctx.restore();
}

/**
 * 產生預設範例圖標（SVG data URL）
 */
export function getSampleIconDataUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4f46e5" />
        <stop offset="50%" stop-color="#7c3aed" />
        <stop offset="100%" stop-color="#db2777" />
      </linearGradient>
      <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
      </linearGradient>
    </defs>
    <rect width="512" height="512" fill="url(#bg)" />
    <circle cx="256" cy="256" r="180" fill="url(#glow)" />
    <g transform="translate(136, 136) scale(10)" stroke="#ffffff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10" stroke="#ffffff" stroke-width="1.5" opacity="0.3"/>
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </g>
    <text x="256" y="380" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto" font-size="44" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="4">PWA ICON</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface RenderIconOptions {
  shape: MaskShape;
  scale: number;
  iconBgColor: string;
  isTransparentIconBg: boolean;
  roundRadiusRatio?: number;
}

/**
 * 將指定圖片與遮罩設定繪製到指定尺寸的 Canvas，並返回 Blob
 */
export async function renderIconToBlob(
  image: HTMLImageElement,
  size: number,
  options: RenderIconOptions
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2d context");

  // 1. 設定遮罩剪裁路徑
  ctx.save();
  applyShapePath(ctx, options.shape, size, options.roundRadiusRatio ?? 0.22);
  ctx.clip();

  // 2. 繪製圖標背景色 (若非透明)
  if (!options.isTransparentIconBg) {
    ctx.fillStyle = options.iconBgColor;
    ctx.fillRect(0, 0, size, size);
  }

  // 3. 等比縮放置中繪製圖片
  const factor = options.scale / 100;
  const imgAspect = image.width / image.height;
  let drawW = size * factor;
  let drawH = size * factor;

  if (imgAspect > 1) {
    drawH = drawW / imgAspect;
  } else {
    drawW = drawH * imgAspect;
  }

  const drawX = (size - drawW) / 2;
  const drawY = (size - drawH) / 2;

  ctx.drawImage(image, drawX, drawY, drawW, drawH);
  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/png");
  });
}

/**
 * 將多個不同尺寸的 PNG Uint8Array 打包成標準 .ico 檔案 Blob
 */
export function createIcoFromPngs(
  pngBuffers: { width: number; height: number; data: Uint8Array }[]
): Blob {
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  const totalSize =
    headerSize + pngBuffers.reduce((sum, item) => sum + item.data.byteLength, 0);

  const buffer = new Uint8Array(totalSize);
  const view = new DataView(buffer.buffer);

  // ICONDIR Header
  view.setUint16(0, 0, true); // Reserved
  view.setUint16(2, 1, true); // Type 1: ICO
  view.setUint16(4, count, true); // Image count

  let currentOffset = headerSize;

  for (let i = 0; i < count; i++) {
    const item = pngBuffers[i];
    const entryOffset = 6 + i * 16;

    view.setUint8(entryOffset + 0, item.width >= 256 ? 0 : item.width); // Width
    view.setUint8(entryOffset + 1, item.height >= 256 ? 0 : item.height); // Height
    view.setUint8(entryOffset + 2, 0); // Color count
    view.setUint8(entryOffset + 3, 0); // Reserved
    view.setUint16(entryOffset + 4, 1, true); // Color planes
    view.setUint16(entryOffset + 6, 32, true); // Bits per pixel
    view.setUint32(entryOffset + 8, item.data.byteLength, true); // Size
    view.setUint32(entryOffset + 12, currentOffset, true); // Offset

    buffer.set(item.data, currentOffset);
    currentOffset += item.data.byteLength;
  }

  return new Blob([buffer], { type: "image/x-icon" });
}

/**
 * 建立 favicon.ico (包含 16x16, 32x32, 48x48)，完全繼承所選遮罩形狀與裁切
 */
export async function generateFaviconIco(
  image: HTMLImageElement,
  options: RenderIconOptions
): Promise<Blob> {
  const sizes = [16, 32, 48];
  const pngBuffers: { width: number; height: number; data: Uint8Array }[] = [];

  for (const s of sizes) {
    const blob = await renderIconToBlob(image, s, options);
    const arrayBuffer = await blob.arrayBuffer();
    pngBuffers.push({
      width: s,
      height: s,
      data: new Uint8Array(arrayBuffer),
    });
  }

  return createIcoFromPngs(pngBuffers);
}

export interface GeneratedIconFile {
  name: string;
  sizeDesc: string;
  blob: Blob;
  previewUrl: string;
  purpose: string;
}

/**
 * 生成所有 PWA、Web 與 iOS 所需的標準尺寸圖標
 * 核心保證：所有生成的圖標皆 100% 嚴格套用使用者選擇的遮罩形狀（如 Rounded square）！
 */
export async function generateAllPwaIcons(
  image: HTMLImageElement,
  options: RenderIconOptions
): Promise<GeneratedIconFile[]> {
  const shape = options.shape;

  const tasks: {
    name: string;
    size: number;
    purpose: string;
  }[] = [
    { name: "favicon-16x16.png", size: 16, purpose: "瀏覽器標籤頁小尺寸" },
    { name: "favicon-32x32.png", size: 32, purpose: "瀏覽器標籤頁標準尺寸" },
    { name: "favicon-48x48.png", size: 48, purpose: "Windows 工作列 / 桌面" },
    { name: "apple-touch-icon.png", size: 180, purpose: "iOS 桌面圖標 (180×180)" },
    { name: "icon-192x192.png", size: 192, purpose: "PWA 標準手機圖標 (192×192)" },
    { name: "icon-512x512.png", size: 512, purpose: "PWA 啟動與商店大圖 (512×512)" },
    { name: "icon-maskable-192x192.png", size: 192, purpose: "PWA Maskable 自適應 (192×192)" },
    { name: "icon-maskable-512x512.png", size: 512, purpose: "PWA Maskable 自適應 (512×512)" },
  ];

  const results: GeneratedIconFile[] = [];

  for (const t of tasks) {
    const blob = await renderIconToBlob(image, t.size, options);
    results.push({
      name: t.name,
      sizeDesc: `${t.size} × ${t.size}`,
      blob,
      previewUrl: URL.createObjectURL(blob),
      purpose: t.purpose,
    });
  }

  // 生成多尺寸整合的 favicon.ico (同樣套用所選遮罩裁切)
  const icoBlob = await generateFaviconIco(image, options);
  results.unshift({
    name: "favicon.ico",
    sizeDesc: "16 / 32 / 48 px",
    blob: icoBlob,
    previewUrl: results[1].previewUrl,
    purpose: "網站標籤頁圖標 (ICO 多解析度)",
  });

  return results;
}

/**
 * 打包所有圖標為 ZIP 檔案，並自動附帶 manifest.json 片段與 HTML tags
 */
export async function createPwaIconsZip(files: GeneratedIconFile[]): Promise<Blob> {
  const zip = new JSZip();

  for (const f of files) {
    zip.file(f.name, f.blob);
  }

  const manifestJson = {
    name: "My PWA App",
    short_name: "App",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    theme_color: "#ffffff",
    background_color: "#ffffff",
    display: "standalone",
  };
  zip.file("manifest-icons.json", JSON.stringify(manifestJson, null, 2));

  const htmlSnippet = `<!-- PWA & Favicon HTML 代碼（放置於 <head> 內） -->
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
`;
  zip.file("html-head-tags.html", htmlSnippet);

  return zip.generateAsync({ type: "blob" });
}

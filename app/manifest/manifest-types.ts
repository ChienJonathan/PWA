export interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: "any" | "maskable" | "any maskable";
}

export interface ManifestScreenshot {
  src: string;
  sizes: string;
  type: string;
  form_factor?: "wide" | "narrow";
  label?: string;
}

export interface ManifestShortcut {
  name: string;
  short_name?: string;
  description?: string;
  url: string;
  icons?: ManifestIcon[];
}

export type ManifestDisplay = "standalone" | "fullscreen" | "minimal-ui" | "browser";
export type ManifestOrientation = "any" | "natural" | "portrait" | "landscape" | "portrait-primary" | "landscape-primary";

export interface ManifestData {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  scope: string;
  id: string;
  display: ManifestDisplay;
  orientation: ManifestOrientation;
  theme_color: string;
  background_color: string;
  lang: string;
  dir: "auto" | "ltr" | "rtl";
  icons: ManifestIcon[];
  shortcuts: ManifestShortcut[];
  screenshots?: ManifestScreenshot[];
}

export const DEFAULT_MANIFEST: ManifestData = {
  name: "我的 PWA 漸進式網頁應用",
  short_name: "PWA App",
  description: "提供流暢如同原生體驗的現代 PWA 應用程式",
  start_url: "/",
  scope: "/",
  id: "/",
  display: "standalone",
  orientation: "any",
  theme_color: "#3b82f6",
  background_color: "#ffffff",
  lang: "zh-TW",
  dir: "auto",
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
  shortcuts: [
    {
      name: "首頁",
      short_name: "首頁",
      description: "快速返回首頁",
      url: "/",
      icons: [
        {
          src: "/icon-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
      ],
    },
  ],
  screenshots: [
    {
      src: "/screenshot-wide.png",
      sizes: "1280x720",
      type: "image/png",
      form_factor: "wide",
      label: "桌面版應用畫面",
    },
    {
      src: "/screenshot-narrow.png",
      sizes: "750x1334",
      type: "image/png",
      form_factor: "narrow",
      label: "行動裝置應用畫面",
    },
  ],
};

export const SAMPLE_PRESETS: { label: string; data: Partial<ManifestData> }[] = [
  {
    label: "電商購物應用 (Store)",
    data: {
      name: "極選購商城 | TrendShop",
      short_name: "TrendShop",
      description: "精選全球潮流好物，提供最佳行動購物體驗",
      theme_color: "#059669",
      background_color: "#f8fafc",
      display: "standalone",
      orientation: "portrait",
    },
  },
  {
    label: "生產力工具 (Productivity)",
    data: {
      name: "TaskFlow 任務看板",
      short_name: "TaskFlow",
      description: "高效率團隊協作與個人待辦清單管理器",
      theme_color: "#6366f1",
      background_color: "#0f172a",
      display: "standalone",
      orientation: "any",
    },
  },
  {
    label: "新聞與媒體 (Media)",
    data: {
      name: "每日即時快訊 | Daily Pulse",
      short_name: "DailyPulse",
      description: "掌握全球焦點科技、財經與即時新聞",
      theme_color: "#dc2626",
      background_color: "#ffffff",
      display: "minimal-ui",
      orientation: "any",
    },
  },
];

export function detectImageType(src?: string): string {
  if (!src) return "image/png";
  const cleanSrc = src.split("?")[0].split("#")[0].trim().toLowerCase();

  if (cleanSrc.startsWith("data:image/")) {
    const match = cleanSrc.match(/^data:(image\/[a-zA-Z0-9.+_-]+)/);
    if (match) return match[1];
  }

  if (cleanSrc.endsWith(".jpeg") || cleanSrc.endsWith(".jpg")) {
    return "image/jpeg";
  }
  if (cleanSrc.endsWith(".webp")) {
    return "image/webp";
  }
  if (cleanSrc.endsWith(".svg")) {
    return "image/svg+xml";
  }
  if (cleanSrc.endsWith(".gif")) {
    return "image/gif";
  }
  if (cleanSrc.endsWith(".avif")) {
    return "image/avif";
  }
  if (cleanSrc.endsWith(".ico")) {
    return "image/x-icon";
  }
  return "image/png";
}

export function formatManifestJson(manifest: ManifestData): string {
  // 過濾掉空值或未設定項，產出最標準的 manifest JSON
  const output: Record<string, unknown> = {
    name: manifest.name,
    short_name: manifest.short_name,
    description: manifest.description || undefined,
    start_url: manifest.start_url || "/",
    scope: manifest.scope || "/",
    id: manifest.id || "/",
    display: manifest.display,
    orientation: manifest.orientation,
    theme_color: manifest.theme_color,
    background_color: manifest.background_color,
    lang: manifest.lang || undefined,
    dir: manifest.dir || undefined,
    icons: manifest.icons.map((icon) => ({
      ...icon,
      type: detectImageType(icon.src),
    })),
  };

  if (manifest.shortcuts && manifest.shortcuts.length > 0) {
    const validShortcuts = manifest.shortcuts
      .filter((s) => s.name && s.url)
      .map((s) => {
        const item: Record<string, unknown> = {
          name: s.name,
          url: s.url,
        };
        if (s.short_name) item.short_name = s.short_name;
        if (s.description) item.description = s.description;
        if (s.icons && s.icons.length > 0) {
          const validIcons = s.icons
            .filter((ic) => ic.src && ic.src.trim() !== "")
            .map((ic) => ({
              ...ic,
              type: detectImageType(ic.src),
            }));
          if (validIcons.length > 0) item.icons = validIcons;
        }
        return item;
      });
    if (validShortcuts.length > 0) {
      output.shortcuts = validShortcuts;
    }
  }

  if (manifest.screenshots && manifest.screenshots.length > 0) {
    const validScreenshots = manifest.screenshots
      .filter((sc) => sc.src && sc.src.trim() !== "")
      .map((sc) => ({
        ...sc,
        type: detectImageType(sc.src),
      }));
    if (validScreenshots.length > 0) {
      output.screenshots = validScreenshots;
    }
  }

  return JSON.stringify(output, null, 2);
}

export function formatHtmlHeadSnippet(manifest: ManifestData): string {
  return `<!-- PWA Web App Manifest 引用代碼 (放置於 HTML <head> 內) -->
<link rel="manifest" href="/pwa/manifest.json">
<meta name="theme-color" content="${manifest.theme_color}">

<!-- iOS Safari PWA 專屬設定 -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="${manifest.short_name || manifest.name}">
<link rel="apple-touch-icon" href="/pwa/apple-touch-icon.png">`;
}

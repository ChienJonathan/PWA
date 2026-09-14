"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    ManifestData,
    DEFAULT_MANIFEST,
    ManifestScreenshot,
    formatManifestJson,
    formatHtmlHeadSnippet,
    detectImageType,
} from "./manifest-types";
import {
    RotateCcw,
    Download,
    Copy,
    Check,
    Smartphone,
    Monitor,
    Layers,
    FileJson,
    FileCode,
    Palette,
    Compass,
    Settings2,
    Plus,
    Trash2,
    ExternalLink,
    Maximize2,
    Minus,
    X,
    Image as ImageIcon,
    Upload,
} from "lucide-react";

const PRESET_COLORS = [
    { label: "經典藍", value: "#3b82f6" },
    { label: "極客黑", value: "#0f172a" },
    { label: "翡翠綠", value: "#059669" },
    { label: "靛藍紫", value: "#6366f1" },
    { label: "活力紅", value: "#dc2626" },
    { label: "琥珀橙", value: "#f59e0b" },
    { label: "簡約白", value: "#ffffff" },
];

// 預設內建 PWA 圖標（SVG Data URL，無任何網路或路徑相依，100% 保證永不破圖）
const DEFAULT_PWA_ICON = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNjNjAwNWMiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS1nbG9iZS1jb2RlIj48cGF0aCBkPSJNMTUuNSAxMCAxMyA3LjUgMTUuNSA1Ii8+PHBhdGggZD0iTTE1Ljg2MSAxNEExNC41IDE0LjUgMCAwMTEyIDIyYTE0LjQ4IDE0LjQ4IDAgMDEwLTIwIDEwIDEwIDAgMTA5Ljg4OCAxMS41Ii8+PHBhdGggZD0iTTE5LjUgNSAyMiA3LjUgMTkuNSAxMCIvPjxwYXRoIGQ9Ik0yIDEyaDguNSIvPjwvc3ZnPg==`;

export default function ManifestPage() {
    const [manifest, setManifest] = useState<ManifestData>(DEFAULT_MANIFEST);
    const [simulatorTab, setSimulatorTab] = useState<"home" | "splash" | "window">("home");
    const [codeTab, setCodeTab] = useState<"manifest" | "html">("manifest");
    const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
    const [iconBasePath, setIconBasePath] = useState<string>("/");
    const [previewIconUrl, setPreviewIconUrl] = useState<string>(DEFAULT_PWA_ICON);
    const [syncedFromIcon, setSyncedFromIcon] = useState(false);
    const [showShortcutsMenu, setShowShortcutsMenu] = useState(false);
    const [devicePlatform, setDevicePlatform] = useState<"ios" | "android">("ios");
    const [uploadedScreenshotPreviews, setUploadedScreenshotPreviews] = useState<Record<number, string>>({});
    const [uploadedShortcutPreviews, setUploadedShortcutPreviews] = useState<Record<number, string>>({});

    const themeColorInputRef = useRef<HTMLInputElement>(null);
    const bgColorInputRef = useRef<HTMLInputElement>(null);

    // 當頁面載入時，自動檢查並讀取「圖標工具」生成的最新圖標與色彩
    useEffect(() => {
        try {
            const saved = localStorage.getItem("pwa_generated_icon_data");
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.previewUrl) {
                    if (parsed.previewUrl.startsWith("blob:")) {
                        // Blob URL 可能因跨分頁/重整而失效，先進行可用性測試
                        const testImg = new window.Image();
                        testImg.onload = () => setPreviewIconUrl(parsed.previewUrl);
                        testImg.onerror = () => setPreviewIconUrl(DEFAULT_PWA_ICON);
                        testImg.src = parsed.previewUrl;
                    } else {
                        setPreviewIconUrl(parsed.previewUrl);
                    }
                }
                if (parsed.iconBgColor) {
                    setManifest((prev) => ({
                        ...prev,
                        background_color: parsed.iconBgColor,
                        theme_color: parsed.themeColor || parsed.iconBgColor,
                    }));
                }
                setSyncedFromIcon(true);
            }
        } catch (e) {
            console.warn("無法讀取圖標同步資料", e);
        }
    }, []);

    // 更新 manifest 頂層欄位
    const updateField = <K extends keyof ManifestData>(key: K, value: ManifestData[K]) => {
        setManifest((prev) => ({ ...prev, [key]: value }));
    };

    // 批次更新圖標存放根目錄 (Base Path)
    const handleUpdateIconBasePath = (newBase: string) => {
        setIconBasePath(newBase);
        let prefix = newBase.trim();
        if (prefix && !prefix.endsWith("/") && !prefix.includes(".")) {
            prefix += "/";
        }
        const updatedIcons = manifest.icons.map((icon) => {
            const parts = icon.src.split("/");
            const fileName = parts[parts.length - 1] || "icon.png";
            const newSrc = `${prefix}${fileName}`;
            return {
                ...icon,
                src: newSrc,
                type: detectImageType(newSrc),
            };
        });
        updateField("icons", updatedIcons);

        // 同步更新捷徑中的圖標路徑
        if (manifest.shortcuts && manifest.shortcuts.length > 0) {
            const updatedShortcuts = manifest.shortcuts.map((sc) => {
                if (!sc.icons || sc.icons.length === 0) return sc;
                return {
                    ...sc,
                    icons: sc.icons.map((ic) => {
                        const parts = ic.src.split("/");
                        const fileName = parts[parts.length - 1] || "icon-192x192.png";
                        const newSrc = `${prefix}${fileName}`;
                        return {
                            ...ic,
                            src: newSrc,
                            type: detectImageType(newSrc),
                        };
                    }),
                };
            });
            updateField("shortcuts", updatedShortcuts);
        }
    };

    // 重設回初始預設值
    const handleReset = () => {
        setManifest(DEFAULT_MANIFEST);
        setIconBasePath("/");
        setPreviewIconUrl("/pwa/example.svg");
        setSyncedFromIcon(false);
    };

    // 複製代碼
    const handleCopyCode = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedSnippet(id);
        setTimeout(() => setCopiedSnippet(null), 2000);
    };

    // 下載 manifest.json 實體檔案
    const handleDownloadManifest = () => {
        const jsonStr = formatManifestJson(manifest);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "manifest.json";
        a.click();
        URL.revokeObjectURL(url);
    };

    // 新增捷徑項目 (包含預設圖標規格與自動辨識格式)
    const handleAddShortcut = () => {
        const num = manifest.shortcuts.length + 1;
        const iconSrc = "/icon-192x192.png";
        const newShortcut = {
            name: `捷徑 ${num}`,
            short_name: `捷徑 ${num}`,
            description: "快捷操作描述",
            url: `/?action=shortcut_${num}`,
            icons: [
                {
                    src: iconSrc,
                    sizes: "192x192",
                    type: detectImageType(iconSrc),
                },
            ],
        };
        updateField("shortcuts", [...manifest.shortcuts, newShortcut]);
    };

    // 移除捷徑項目
    const handleRemoveShortcut = (index: number) => {
        updateField(
            "shortcuts",
            manifest.shortcuts.filter((_, i) => i !== index)
        );
    };

    // 更新特定捷徑欄位
    const handleUpdateShortcut = (index: number, key: string, val: string) => {
        const updated = [...manifest.shortcuts];
        updated[index] = { ...updated[index], [key]: val };
        updateField("shortcuts", updated);
    };

    // 更新捷徑的圖標路徑 (自動辨識圖片格式，保留既有尺寸)
    const handleUpdateShortcutIcon = (index: number, iconSrc: string) => {
        const updated = [...manifest.shortcuts];
        const trimmed = iconSrc.trim();
        const currentSizes = updated[index]?.icons?.[0]?.sizes || "192x192";
        updated[index] = {
            ...updated[index],
            icons: trimmed
                ? [
                    {
                        src: trimmed,
                        sizes: currentSizes,
                        type: detectImageType(trimmed),
                    },
                ]
                : [],
        };
        updateField("shortcuts", updated);
    };

    // 更新捷徑圖標尺寸規格 (sizes)
    const handleUpdateShortcutIconSizes = (index: number, sizes: string) => {
        const updated = [...manifest.shortcuts];
        const currentIcon = updated[index]?.icons?.[0] || {
            src: "/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
        };
        updated[index] = {
            ...updated[index],
            icons: [
                {
                    ...currentIcon,
                    sizes: sizes,
                },
            ],
        };
        updateField("shortcuts", updated);
    };

    // 點擊上傳捷徑專屬圖標：自動辨識檔案名稱與原始尺寸
    const handleUploadShortcutIcon = (index: number, file: File) => {
        if (!file || !file.type.startsWith("image/")) return;

        const objectUrl = URL.createObjectURL(file);
        const img = new window.Image();
        img.onload = () => {
            const fileName = `/${file.name}`;
            const fileType = file.type || detectImageType(file.name);
            const updated = [...manifest.shortcuts];
            if (updated[index]) {
                updated[index] = {
                    ...updated[index],
                    icons: [
                        {
                            src: fileName,
                            sizes: `${img.naturalWidth}x${img.naturalHeight}`,
                            type: fileType,
                        },
                    ],
                };
                setUploadedShortcutPreviews((prev) => ({
                    ...prev,
                    [index]: objectUrl,
                }));
                updateField("shortcuts", updated);
            }
        };
        img.src = objectUrl;
    };

    // 新增螢幕截圖項目 (自動辨識圖片格式)
    const handleAddScreenshot = () => {
        const isWide = ((manifest.screenshots?.length || 0) % 2) === 0;
        const src = isWide ? "/screenshot-wide.png" : "/screenshot-narrow.png";
        const newScreenshot: ManifestScreenshot = {
            src,
            sizes: isWide ? "1280x720" : "750x1334",
            type: detectImageType(src),
            form_factor: isWide ? "wide" : "narrow",
            label: isWide ? "桌面版應用畫面" : "行動裝置應用畫面",
        };
        updateField("screenshots", [...(manifest.screenshots || []), newScreenshot]);
    };

    // 移除螢幕截圖項目
    const handleRemoveScreenshot = (index: number) => {
        updateField(
            "screenshots",
            (manifest.screenshots || []).filter((_, i) => i !== index)
        );
    };

    // 更新螢幕截圖欄位 (更新路徑時自動辨識圖片格式)
    const handleUpdateScreenshot = <K extends keyof ManifestScreenshot>(
        index: number,
        key: K,
        val: ManifestScreenshot[K]
    ) => {
        const updated = [...(manifest.screenshots || [])];
        if (key === "src" && typeof val === "string") {
            updated[index] = {
                ...updated[index],
                src: val,
                type: detectImageType(val),
            };
        } else {
            updated[index] = { ...updated[index], [key]: val };
        }
        updateField("screenshots", updated);
    };

    // 點擊上傳截圖：自動讀取真實檔案名稱、寬高尺寸 (sizes)、版型 (wide/narrow) 與 MIME 格式
    const handleUploadScreenshotFile = (index: number, file: File) => {
        if (!file || !file.type.startsWith("image/")) return;

        const objectUrl = URL.createObjectURL(file);
        const img = new window.Image();
        img.onload = () => {
            const width = img.naturalWidth;
            const height = img.naturalHeight;
            const isWide = width >= height;
            const fileName = `/${file.name}`;
            const fileType = file.type || detectImageType(file.name);

            const updated = [...(manifest.screenshots || [])];
            if (updated[index]) {
                updated[index] = {
                    ...updated[index],
                    src: fileName,
                    sizes: `${width}x${height}`,
                    type: fileType,
                    form_factor: isWide ? "wide" : "narrow",
                    label: updated[index].label || (isWide ? "桌面版應用畫面" : "行動裝置應用畫面"),
                };
                setUploadedScreenshotPreviews((prev) => ({
                    ...prev,
                    [index]: objectUrl,
                }));
                updateField("screenshots", updated);
            }
        };
        img.src = objectUrl;
    };

    const resolvePreviewPath = (src?: string) => {
        if (!src) return previewIconUrl;
        if (src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("http")) return src;
        if (src.startsWith("/") && !src.startsWith("/pwa/")) {
            return `/pwa${src}`;
        }
        return src;
    };

    const manifestJsonString = formatManifestJson(manifest);
    const htmlHeadSnippetString = formatHtmlHeadSnippet(manifest);

    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            <Header />

            {/* 工作檯容器：延續無卡片、簡潔線條分區設計，底層保留手機避空安全距離 */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-32 sm:pb-24 lg:py-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

                    {/* 左側：即時 PWA 模擬器 (Live PWA Simulator) */}
                    <div className="lg:col-span-5 flex flex-col items-center lg:sticky lg:top-20 space-y-4">
                        {/* 模擬器場景切換分頁 */}
                        <div className="w-full flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Smartphone className="h-4 w-4 text-primary" />
                                即時 PWA 模擬視圖
                            </span>
                            <Tabs
                                value={simulatorTab}
                                onValueChange={(val) => {
                                    setSimulatorTab(val as "home" | "splash" | "window");
                                    setShowShortcutsMenu(false);
                                }}
                                className="w-auto"
                            >
                                <TabsList variant="line" className="h-8">
                                    <TabsTrigger value="home" className="text-xs cursor-pointer gap-1 px-2.5">
                                        <Smartphone className="h-3.5 w-3.5" />
                                        主畫面
                                    </TabsTrigger>
                                    <TabsTrigger value="splash" className="text-xs cursor-pointer gap-1 px-2.5">
                                        <Layers className="h-3.5 w-3.5" />
                                        開機畫面
                                    </TabsTrigger>
                                    <TabsTrigger value="window" className="text-xs cursor-pointer gap-1 px-2.5">
                                        <Monitor className="h-3.5 w-3.5" />
                                        獨立視窗
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* 手機主畫面時的捷徑輔助切換列 */}
                        {simulatorTab === "home" && (
                            <div className="w-full flex items-center justify-between px-1 text-xs gap-2">
                                <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/50 text-[11px]">
                                    <button
                                        type="button"
                                        onClick={() => setDevicePlatform("ios")}
                                        className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${devicePlatform === "ios"
                                            ? "bg-background font-semibold text-foreground shadow-xs"
                                            : "text-muted-foreground hover:text-foreground"
                                            }`}
                                    >
                                        iOS 圓角
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDevicePlatform("android")}
                                        className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${devicePlatform === "android"
                                            ? "bg-background font-semibold text-foreground shadow-xs"
                                            : "text-muted-foreground hover:text-foreground"
                                            }`}
                                    >
                                        Android 圓形
                                    </button>
                                </div>
                                <Button
                                    variant={showShortcutsMenu ? "secondary" : "outline"}
                                    size="sm"
                                    onClick={() => setShowShortcutsMenu(!showShortcutsMenu)}
                                    className="cursor-pointer text-[11px] h-6 px-2 gap-1 rounded-full shrink-0"
                                >
                                    <Plus className="h-3 w-3 text-primary" />
                                    {showShortcutsMenu ? "收合捷徑" : `捷徑 (${manifest.shortcuts.length})`}
                                </Button>
                            </div>
                        )}

                        {/* 模擬器舞台外框 (Device Frame Stage) */}
                        <div className="w-full flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl bg-muted/20 border border-border/50">

                            {/* 場景 1 & 2: 手機模擬器 (Home 與 Splash 共用單一外框，切換/動畫 100% 絲滑零跳動) */}
                            {(simulatorTab === "home" || simulatorTab === "splash") && (
                                <div className="w-full max-w-[280px] aspect-[9/17] rounded-[36px] border-4 border-foreground/15 shadow-xl flex flex-col justify-between relative overflow-hidden select-none bg-background">
                                    {/* Layer 1: 手機桌面背景與圖標 (Home Screen) */}
                                    <div
                                        className={`absolute inset-0 p-3.5 flex flex-col justify-between bg-gradient-to-b from-sky-400/20 via-indigo-500/15 to-purple-600/25 transition-all duration-300 ease-out ${simulatorTab === "home"
                                            ? "opacity-100 scale-100 pointer-events-auto"
                                            : "opacity-0 scale-105 pointer-events-none"
                                            }`}
                                    >
                                        {/* 頂部瀏海 / 動態島 */}
                                        <div className="flex justify-between items-center px-1 pt-1 text-[10px] font-medium text-foreground/70">
                                            <span>09:41</span>
                                            {devicePlatform === "android" ? (
                                                <div className="w-2.5 h-2.5 bg-foreground/30 rounded-full mx-auto" />
                                            ) : (
                                                <div className="w-16 h-3.5 bg-foreground/20 rounded-full mx-auto" />
                                            )}
                                            <div className="flex gap-1 items-center">
                                                <div className="w-2.5 h-2 bg-foreground/60 rounded-xs" />
                                            </div>
                                        </div>

                                        {/* App 網格區塊 */}
                                        <div className="grid grid-cols-4 gap-3.5 px-1 py-6 relative">
                                            {/* 假應用 1 */}
                                            <div className="flex flex-col items-center gap-1 opacity-50">
                                                <div className={`w-12 h-12 ${devicePlatform === "android" ? "rounded-full" : "rounded-xl"} bg-muted/60 border border-border/40 shadow-xs`} />
                                                <span className="text-[10px] text-foreground/80">照片</span>
                                            </div>

                                            {/* 假應用 2 */}
                                            <div className="flex flex-col items-center gap-1 opacity-50">
                                                <div className={`w-12 h-12 ${devicePlatform === "android" ? "rounded-full" : "rounded-xl"} bg-muted/60 border border-border/40 shadow-xs`} />
                                                <span className="text-[10px] text-foreground/80">設定</span>
                                            </div>

                                            {/* 重點：目標 PWA 應用程式（點擊執行動畫至開機畫面，長按/右鍵呼出捷徑） */}
                                            <button
                                                type="button"
                                                onClick={() => setSimulatorTab("splash")}
                                                onContextMenu={(e) => {
                                                    e.preventDefault();
                                                    setShowShortcutsMenu((prev) => !prev);
                                                }}
                                                className="flex flex-col items-center gap-1 transform transition-all hover:scale-110 active:scale-90 cursor-pointer group focus:outline-none relative"
                                                title="點擊預覽開機畫面，右鍵可呼出長按捷徑選單"
                                            >
                                                <div className={`relative w-12 h-12 ${devicePlatform === "android" ? "rounded-full" : "rounded-xl"} border border-border/80 shadow-md overflow-hidden bg-background flex items-center justify-center ring-2 ring-primary/50 group-hover:ring-primary group-hover:shadow-lg transition-all`}>
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={previewIconUrl}
                                                        alt=""
                                                        className={`${devicePlatform === "android" ? "w-9 h-9" : "w-10 h-10"} object-contain transition-all`}
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            if (target.src !== DEFAULT_PWA_ICON) {
                                                                target.src = DEFAULT_PWA_ICON;
                                                            }
                                                        }}
                                                    />
                                                    <span className={`absolute bottom-0 right-0 bg-primary text-primary-foreground text-[8px] font-bold px-1 ${devicePlatform === "android" ? "rounded-full scale-75" : "rounded-tl-md"} leading-tight`}>
                                                        PWA
                                                    </span>
                                                </div>
                                                <span className="text-[10px] font-semibold text-foreground text-center truncate max-w-[64px] drop-shadow-xs group-hover:text-primary transition-colors">
                                                    {manifest.short_name || manifest.name || "App"}
                                                </span>
                                            </button>

                                            {/* 假應用 3 */}
                                            <div className="flex flex-col items-center gap-1 opacity-50">
                                                <div className={`w-12 h-12 ${devicePlatform === "android" ? "rounded-full" : "rounded-xl"} bg-muted/60 border border-border/40 shadow-xs`} />
                                                <span className="text-[10px] text-foreground/80">地圖</span>
                                            </div>
                                        </div>

                                        {/* 捷徑彈出式選單 (Shortcuts Context Menu 模擬) */}
                                        {showShortcutsMenu && (
                                            <div className="absolute top-10 left-3.5 right-3.5 z-30 bg-background/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-2xl p-2.5 animate-in fade-in zoom-in-95 duration-150">
                                                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border/40">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <div className="w-4 h-4 rounded-xs overflow-hidden border border-border/50 shrink-0">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={previewIconUrl}
                                                                alt=""
                                                                className="w-full h-full object-contain"
                                                                onError={(e) => {
                                                                    const target = e.target as HTMLImageElement;
                                                                    if (target.src !== DEFAULT_PWA_ICON) {
                                                                        target.src = DEFAULT_PWA_ICON;
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-[10px] font-bold text-foreground truncate">
                                                            {manifest.short_name || manifest.name || "應用程式"} 捷徑
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowShortcutsMenu(false)}
                                                        className="text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>

                                                {manifest.shortcuts.length === 0 ? (
                                                    <div className="text-[10px] text-muted-foreground text-center py-2">
                                                        尚未設定任何捷徑
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1">
                                                        {manifest.shortcuts.map((sc, i) => (
                                                            <div
                                                                key={i}
                                                                onClick={() => {
                                                                    setShowShortcutsMenu(false);
                                                                    setSimulatorTab("splash");
                                                                }}
                                                                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer group"
                                                            >
                                                                <div className="w-6 h-6 rounded-md bg-muted/70 flex items-center justify-center overflow-hidden shrink-0 border border-border/50">
                                                                    {uploadedShortcutPreviews[i] || sc.icons?.[0]?.src ? (
                                                                        // eslint-disable-next-line @next/next/no-img-element
                                                                        <img
                                                                            src={uploadedShortcutPreviews[i] || resolvePreviewPath(sc.icons?.[0]?.src)}
                                                                            alt=""
                                                                            className="w-full h-full object-contain"
                                                                            onError={(e) => {
                                                                                const target = e.target as HTMLImageElement;
                                                                                if (target.src !== DEFAULT_PWA_ICON) {
                                                                                    target.src = DEFAULT_PWA_ICON;
                                                                                }
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <Compass className="w-3.5 h-3.5 text-muted-foreground" />
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="text-[11px] font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                                                        {sc.name || `捷徑 #${i + 1}`}
                                                                    </div>
                                                                    <div className="text-[9px] text-muted-foreground font-mono truncate">
                                                                        {sc.url || "/"}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* 底部 Dock 欄 */}
                                        <div className="mx-1 mb-1 p-2 rounded-2xl bg-background/50 backdrop-blur-md border border-white/20 flex justify-around items-center">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/70" />
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/70" />
                                            <div className="w-10 h-10 rounded-xl bg-amber-500/70" />
                                            <div className="w-10 h-10 rounded-xl bg-rose-500/70" />
                                        </div>
                                    </div>

                                    {/* Layer 2: 開機載入畫面 (Splash Screen) */}
                                    <div
                                        className={`absolute inset-0 p-4 flex flex-col justify-between items-center transition-all duration-300 ease-out z-20 ${simulatorTab === "splash"
                                            ? "opacity-100 scale-100 pointer-events-auto"
                                            : "opacity-0 scale-90 pointer-events-none"
                                            }`}
                                        style={{ backgroundColor: manifest.background_color }}
                                    >
                                        {/* 頂部狀態列 */}
                                        <div className="w-full flex justify-between items-center text-[10px] font-mono px-1 pt-1 opacity-70">
                                            <span>09:41</span>
                                            <span className="text-[9px] uppercase font-bold tracking-widest opacity-60">啟動中</span>
                                        </div>

                                        {/* 置中圖示與名稱 */}
                                        <div className="flex flex-col items-center gap-4 my-auto transition-transform duration-300">
                                            <div className="w-20 h-20 rounded-2xl border border-border/40 shadow-lg flex items-center justify-center p-2 bg-background/90">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={previewIconUrl}
                                                    alt=""
                                                    className="w-16 h-16 object-contain"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        if (target.src !== DEFAULT_PWA_ICON) {
                                                            target.src = DEFAULT_PWA_ICON;
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <div className="text-center px-4">
                                                <h3 className="font-bold text-sm text-foreground tracking-tight line-clamp-1">
                                                    {manifest.name || "應用程式名稱"}
                                                </h3>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                    background_color: {manifest.background_color}
                                                </p>
                                            </div>
                                        </div>

                                        {/* 底部 Home Bar（點擊可返回主畫面） */}
                                        <div
                                            onClick={() => setSimulatorTab("home")}
                                            className="w-full flex flex-col items-center gap-1 cursor-pointer group pb-1 transition-opacity hover:opacity-100"
                                            title="點擊返回手機主畫面"
                                        >
                                            <div className="w-20 h-1 bg-foreground/25 group-hover:bg-foreground/60 rounded-full transition-colors" />
                                            <span className="text-[9px] text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity">
                                                點擊返回桌面
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 場景 3: 獨立視窗應用程式 (Standalone App Window) */}
                            {simulatorTab === "window" && (
                                <div className="w-full max-w-[320px] rounded-xl border border-border/70 shadow-xl overflow-hidden bg-background flex flex-col select-none">
                                    {/* 頂部主題列 (Theme Color Titlebar) */}
                                    <div
                                        className="w-full px-3 py-2 flex items-center justify-between border-b border-black/10 transition-colors"
                                        style={{ backgroundColor: manifest.theme_color }}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={previewIconUrl}
                                                alt=""
                                                className="w-4 h-4 rounded-xs shrink-0 bg-background p-0.5"
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    if (target.src !== DEFAULT_PWA_ICON) {
                                                        target.src = DEFAULT_PWA_ICON;
                                                    }
                                                }}
                                            />
                                            <span className="text-xs font-semibold truncate text-white drop-shadow-xs">
                                                {manifest.name || "應用程式視窗"}
                                            </span>
                                        </div>
                                        {/* 視窗控制項 */}
                                        <div className="flex items-center gap-1.5 shrink-0 text-white/90">
                                            <Minus className="h-3 w-3 cursor-pointer opacity-80 hover:opacity-100" />
                                            <Maximize2 className="h-2.5 w-2.5 cursor-pointer opacity-80 hover:opacity-100" />
                                            <X className="h-3 w-3 cursor-pointer opacity-80 hover:opacity-100" />
                                        </div>
                                    </div>

                                    {/* 視窗內容展示 */}
                                    <div className="p-4 space-y-3 min-h-[220px] flex flex-col justify-between bg-background">
                                        <div className="space-y-1.5">
                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                                                <span>display: {manifest.display}</span>
                                            </div>
                                            <h4 className="text-sm font-bold text-foreground">
                                                {manifest.short_name || manifest.name}
                                            </h4>
                                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                                                {manifest.description || "尚未填寫應用程式描述。"}
                                            </p>
                                        </div>

                                        <div className="p-2 rounded-lg bg-muted/30 border border-border/40 text-[10px] font-mono text-muted-foreground flex justify-between items-center">
                                            <span>start_url: {manifest.start_url}</span>
                                            <ExternalLink className="h-3 w-3 opacity-60" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 模擬器輔助說明 */}
                        <p className="text-[11px] text-muted-foreground text-center">
                            💡 點擊主畫面中的 PWA 圖標可播放開機動畫；在開機畫面點擊底部橫條可返回桌面。
                        </p>
                    </div>

                    {/* 右側：屬性檢查器面板 (Inspector Panel) */}
                    <div className="lg:col-span-7 space-y-6">

                        {/* 自動帶入提示橫幅 */}
                        {syncedFromIcon && (
                            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary animate-in fade-in duration-200">
                                <span className="flex items-center gap-2 font-medium">
                                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                                    已自動帶入您在「圖標工具」生成的最新圖標與背景色！
                                </span>
                                <button
                                    onClick={() => setSyncedFromIcon(false)}
                                    className="text-primary/70 hover:text-primary cursor-pointer text-xs font-semibold px-1"
                                    title="關閉提示"
                                >
                                    ✕
                                </button>
                            </div>
                        )}

                        {/* 區塊 1: 基本識別 (Identity) */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Settings2 className="h-4 w-4 text-primary" />
                                    基本應用資訊 (Identity)
                                </span>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleReset}
                                    className="cursor-pointer text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
                                    title="重設所有欄位為預設值"
                                >
                                    <RotateCcw className="h-3 w-3" />
                                    重設
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                                        應用完整名稱 (name)
                                        <span className="text-[10px] text-muted-foreground font-normal">安裝彈窗與開機畫面</span>
                                    </label>
                                    <Input
                                        value={manifest.name}
                                        onChange={(e) => updateField("name", e.target.value)}
                                        placeholder="例如：極選購商城"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                                        主畫面簡稱 (short_name)
                                        <span className="text-[10px] text-muted-foreground font-normal">手機桌面圖標下方標籤</span>
                                    </label>
                                    <Input
                                        value={manifest.short_name}
                                        onChange={(e) => updateField("short_name", e.target.value)}
                                        placeholder="例如：TrendShop"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                                    應用程式描述 (description)
                                    <span className="text-[10px] text-muted-foreground font-normal">SEO 與安裝詳情提示</span>
                                </label>
                                <Input
                                    value={manifest.description}
                                    onChange={(e) => updateField("description", e.target.value)}
                                    placeholder="簡述此應用的核心功能與特色..."
                                />
                            </div>
                        </div>

                        <div className="h-px bg-border/50" />

                        {/* 區塊 2: 路由與範圍 (Routing & Scope) */}
                        <div className="space-y-4">
                            <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Compass className="h-4 w-4 text-primary" />
                                路由與範圍控制 (Routing & Scope)
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground">啟動路徑 (start_url)</label>
                                    <Input
                                        value={manifest.start_url}
                                        onChange={(e) => updateField("start_url", e.target.value)}
                                        placeholder="/"
                                        className="font-mono text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground">作用域 (scope)</label>
                                    <Input
                                        value={manifest.scope}
                                        onChange={(e) => updateField("scope", e.target.value)}
                                        placeholder="/"
                                        className="font-mono text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground">唯一標識符 (id)</label>
                                    <Input
                                        value={manifest.id}
                                        onChange={(e) => updateField("id", e.target.value)}
                                        placeholder="/"
                                        className="font-mono text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground">介面語系 (lang)</label>
                                    <Input
                                        value={manifest.lang}
                                        onChange={(e) => updateField("lang", e.target.value)}
                                        placeholder="zh-TW"
                                        className="font-mono text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground">書寫方向 (dir)</label>
                                    <Select
                                        value={manifest.dir}
                                        onValueChange={(val) => updateField("dir", val as "auto" | "ltr" | "rtl")}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="auto">auto (自動判定)</SelectItem>
                                            <SelectItem value="ltr">ltr (由左至右，中文/英文)</SelectItem>
                                            <SelectItem value="rtl">rtl (由右至左，阿拉伯文等)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-border/50" />

                        {/* 區塊 3: 顯示模式與方向 (Display & Orientation) */}
                        <div className="space-y-4">
                            <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Monitor className="h-4 w-4 text-primary" />
                                顯示外觀與方向 (Display & Orientation)
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                                        顯示模式 (display)
                                        <span className="text-[10px] text-muted-foreground">推薦 standalone</span>
                                    </label>
                                    <Select
                                        value={manifest.display}
                                        onValueChange={(val) => updateField("display", val as ManifestData["display"])}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="standalone">standalone (獨立原生視窗，隱藏網址列)</SelectItem>
                                            <SelectItem value="fullscreen">fullscreen (全螢幕沉浸遊戲/影音)</SelectItem>
                                            <SelectItem value="minimal-ui">minimal-ui (極簡視窗，附基本導覽鈕)</SelectItem>
                                            <SelectItem value="browser">browser (傳統瀏覽器分頁外觀)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground">
                                        螢幕預設方向 (orientation)
                                    </label>
                                    <Select
                                        value={manifest.orientation}
                                        onValueChange={(val) => updateField("orientation", val as ManifestData["orientation"])}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="any">any (隨裝置自動旋轉)</SelectItem>
                                            <SelectItem value="portrait">portrait (固定直向)</SelectItem>
                                            <SelectItem value="landscape">landscape (固定橫向)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-border/50" />

                        {/* 區塊 4: 色彩主題 (Theme & Background Color) */}
                        <div className="space-y-4">
                            <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Palette className="h-4 w-4 text-primary" />
                                主題色彩 (Theme & Background Color)
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Theme Color */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-foreground">主題色彩 (theme_color)</span>
                                        <span className="font-mono text-muted-foreground">{manifest.theme_color.toUpperCase()}</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">控制手機頂部狀態列與桌面視窗標題列底色。</p>

                                    <div className="flex items-center gap-2">
                                        <div className="relative shrink-0">
                                            <input
                                                ref={themeColorInputRef}
                                                type="color"
                                                value={manifest.theme_color}
                                                onChange={(e) => updateField("theme_color", e.target.value)}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                            <div
                                                className="w-9 h-9 rounded-lg border border-border hover:border-primary shadow-xs cursor-pointer"
                                                style={{ backgroundColor: manifest.theme_color }}
                                                title="點擊自訂色彩"
                                            />
                                        </div>
                                        <Input
                                            value={manifest.theme_color}
                                            onChange={(e) => updateField("theme_color", e.target.value)}
                                            className="font-mono text-xs flex-1"
                                            placeholder="#3b82f6"
                                        />
                                    </div>

                                    {/* 推薦色票 */}
                                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                        {PRESET_COLORS.map((preset) => (
                                            <button
                                                key={preset.value}
                                                onClick={() => updateField("theme_color", preset.value)}
                                                title={preset.label}
                                                className={`w-4.5 h-4.5 rounded-full border transition-transform cursor-pointer ${manifest.theme_color.toLowerCase() === preset.value.toLowerCase()
                                                    ? "ring-2 ring-primary ring-offset-1 scale-110 border-primary"
                                                    : "border-border hover:scale-110"
                                                    }`}
                                                style={{ backgroundColor: preset.value }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Background Color */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-foreground">開機背景色 (background_color)</span>
                                        <span className="font-mono text-muted-foreground">{manifest.background_color.toUpperCase()}</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">控制 PWA 啟動瞬間載入畫面 (Splash Screen) 的底色。</p>

                                    <div className="flex items-center gap-2">
                                        <div className="relative shrink-0">
                                            <input
                                                ref={bgColorInputRef}
                                                type="color"
                                                value={manifest.background_color}
                                                onChange={(e) => updateField("background_color", e.target.value)}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                            <div
                                                className="w-9 h-9 rounded-lg border border-border hover:border-primary shadow-xs cursor-pointer"
                                                style={{ backgroundColor: manifest.background_color }}
                                                title="點擊自訂色彩"
                                            />
                                        </div>
                                        <Input
                                            value={manifest.background_color}
                                            onChange={(e) => updateField("background_color", e.target.value)}
                                            className="font-mono text-xs flex-1"
                                            placeholder="#ffffff"
                                        />
                                    </div>

                                    {/* 推薦色票 */}
                                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                        {PRESET_COLORS.map((preset) => (
                                            <button
                                                key={preset.value}
                                                onClick={() => updateField("background_color", preset.value)}
                                                title={preset.label}
                                                className={`w-4.5 h-4.5 rounded-full border transition-transform cursor-pointer ${manifest.background_color.toLowerCase() === preset.value.toLowerCase()
                                                    ? "ring-2 ring-primary ring-offset-1 scale-110 border-primary"
                                                    : "border-border hover:scale-110"
                                                    }`}
                                                style={{ backgroundColor: preset.value }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-border/50" />

                        {/* 區塊 5: 圖標配置 (Icons Specification) */}
                        <div className="space-y-3.5">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Layers className="h-4 w-4 text-primary" />
                                    標準圖標清單 (Icons, 共 {manifest.icons.length} 項)
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    與 <Link href="/icon" className="text-primary hover:underline font-medium">圖標工具</Link> 產出規範 100% 相容
                                </span>
                            </div>

                            {/* 圖標根目錄 (Base Path) 輸入欄位 */}
                            <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                        圖標存放根目錄 (Base Path)
                                        <span className="text-[10px] text-muted-foreground font-normal">批次套用至以下所有圖標路徑</span>
                                    </label>
                                    <div className="flex items-center gap-1.5 text-[11px]">
                                        <button
                                            type="button"
                                            onClick={() => handleUpdateIconBasePath(manifest.scope || "/")}
                                            className="text-primary hover:underline cursor-pointer"
                                            title="套用目前作用域路徑"
                                        >
                                            同作用域 ({manifest.scope || "/"})
                                        </button>
                                        <span className="text-muted-foreground/40">|</span>
                                        <button
                                            type="button"
                                            onClick={() => handleUpdateIconBasePath("/")}
                                            className="text-primary hover:underline cursor-pointer"
                                            title="重設為根目錄 /"
                                        >
                                            預設 (/)
                                        </button>
                                    </div>
                                </div>
                                <Input
                                    value={iconBasePath}
                                    onChange={(e) => handleUpdateIconBasePath(e.target.value)}
                                    placeholder="例如：/ 或 /time/ 或 /pwa/"
                                    className="h-8 font-mono text-xs"
                                />
                            </div>

                            <div className="border border-border/60 rounded-xl divide-y divide-border/50 overflow-hidden bg-background">
                                {manifest.icons.map((icon, idx) => (
                                    <div key={idx} className="flex items-center justify-between px-3.5 py-2.5 hover:bg-muted/20 gap-3">
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground shrink-0">
                                                {icon.sizes}
                                            </span>
                                            <span className="font-mono text-xs text-foreground truncate">
                                                {icon.src}
                                            </span>
                                        </div>
                                        <span className="text-[11px] font-mono text-primary/90 shrink-0 bg-primary/10 px-2 py-0.5 rounded">
                                            purpose: {icon.purpose || "any"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="h-px bg-border/50" />

                        {/* 區塊 6: 應用程式快捷清單 (App Shortcuts - 選填) */}
                        <div className="space-y-3.5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <Plus className="h-4 w-4 text-primary" />
                                        應用捷徑選單 (Shortcuts，長按圖標呼出)
                                    </span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddShortcut}
                                    className="cursor-pointer text-xs h-7 gap-1"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    新增捷徑
                                </Button>
                            </div>

                            {manifest.shortcuts.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic py-2">
                                    尚未新增任何捷徑項目。點擊右上角「新增捷徑」即可建立長按快速操作。
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {manifest.shortcuts.map((shortcut, index) => (
                                        <div
                                            key={index}
                                            className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2.5 relative"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-primary" />
                                                    捷徑 #{index + 1}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveShortcut(index)}
                                                    className="cursor-pointer h-6 px-1.5 text-muted-foreground hover:text-destructive"
                                                    title="刪除此捷徑"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>

                                            {/* 捷徑名稱與連結網址 */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <span className="text-[11px] text-muted-foreground font-medium">
                                                        捷徑名稱 (name)
                                                    </span>
                                                    <Input
                                                        value={shortcut.name}
                                                        onChange={(e) => handleUpdateShortcut(index, "name", e.target.value)}
                                                        placeholder="例如：熱門商品、掃描條碼"
                                                        className="h-8 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[11px] text-muted-foreground font-medium">
                                                        觸發網址 (url)
                                                    </span>
                                                    <Input
                                                        value={shortcut.url}
                                                        onChange={(e) => handleUpdateShortcut(index, "url", e.target.value)}
                                                        placeholder="例如：/?action=scan"
                                                        className="h-8 text-xs font-mono"
                                                    />
                                                </div>
                                            </div>

                                            {/* 捷徑圖標 (Shortcut Icon) */}
                                            <div className="space-y-1.5 pt-1.5 border-t border-border/40">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[11px] text-muted-foreground font-medium">
                                                            捷徑專屬圖標 (Icon 路徑與尺寸規格)
                                                        </span>
                                                        {shortcut.icons?.[0]?.src && (
                                                            <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase">
                                                                {detectImageType(shortcut.icons[0].src)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => document.getElementById(`shortcut-icon-file-${index}`)?.click()}
                                                            className="text-[10px] text-primary hover:underline cursor-pointer flex items-center gap-0.5 font-medium"
                                                            title="點擊上傳自訂捷徑圖標 (自動帶入路徑與尺寸)"
                                                        >
                                                            <Upload className="h-2.5 w-2.5" />
                                                            上傳圖檔
                                                        </button>
                                                        <span className="text-muted-foreground/30 text-[10px]">|</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateShortcutIcon(index, previewIconUrl)}
                                                            className="text-[10px] text-muted-foreground hover:text-primary hover:underline cursor-pointer"
                                                        >
                                                            套用應用圖標
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* 隱藏的捷徑檔案選擇器 */}
                                                <input
                                                    type="file"
                                                    id={`shortcut-icon-file-${index}`}
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        if (e.target.files?.[0]) {
                                                            handleUploadShortcutIcon(index, e.target.files[0]);
                                                        }
                                                    }}
                                                />

                                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                                                    {/* 圖標預覽與路徑 */}
                                                    <div className="sm:col-span-8 flex items-center gap-2">
                                                        <div
                                                            onClick={() => document.getElementById(`shortcut-icon-file-${index}`)?.click()}
                                                            title="點擊上傳專屬捷徑圖標 (自動帶入路徑與解析度尺寸)"
                                                            className="w-8 h-8 rounded-lg border border-border/60 hover:border-primary hover:bg-muted/40 bg-background flex items-center justify-center overflow-hidden shrink-0 cursor-pointer relative group transition-all"
                                                        >
                                                            {uploadedShortcutPreviews[index] || (shortcut.icons && shortcut.icons[0]?.src) ? (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img
                                                                    src={uploadedShortcutPreviews[index] || resolvePreviewPath(shortcut.icons?.[0]?.src)}
                                                                    alt=""
                                                                    className="w-full h-full object-contain"
                                                                    onError={(e) => {
                                                                        const target = e.target as HTMLImageElement;
                                                                        if (target.src !== DEFAULT_PWA_ICON) {
                                                                            target.src = DEFAULT_PWA_ICON;
                                                                        }
                                                                    }}
                                                                />
                                                            ) : (
                                                                <Compass className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                                                            )}
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                                <Upload className="h-3 w-3" />
                                                            </div>
                                                        </div>
                                                        <Input
                                                            value={shortcut.icons?.[0]?.src || ""}
                                                            onChange={(e) => handleUpdateShortcutIcon(index, e.target.value)}
                                                            placeholder="/icon-192x192.png 或圖形 URL"
                                                            className="h-8 text-xs font-mono flex-1"
                                                        />
                                                    </div>

                                                    {/* 尺寸欄位 */}
                                                    <div className="sm:col-span-4 flex items-center gap-1.5">
                                                        <span className="text-[11px] text-muted-foreground font-medium shrink-0">尺寸 (sizes)</span>
                                                        <Input
                                                            value={shortcut.icons?.[0]?.sizes || "192x192"}
                                                            onChange={(e) => handleUpdateShortcutIconSizes(index, e.target.value)}
                                                            placeholder="例如：192x192"
                                                            className="h-8 text-xs font-mono w-full"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="h-px bg-border/50" />

                        {/* 區塊 7: 應用螢幕截圖 (Screenshots - 支援 Chrome 豐富安裝介面) */}
                        <div className="space-y-3.5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <ImageIcon className="h-4 w-4 text-primary" />
                                        應用螢幕截圖 (Screenshots，豐富安裝介面)
                                    </span>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Google Chrome / Edge 安裝提示必備：建議包含 1 張 wide (寬螢幕桌面) 與 1 張 narrow (直式行動裝置) 截圖。
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddScreenshot}
                                    className="cursor-pointer text-xs h-7 gap-1"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    新增截圖
                                </Button>
                            </div>

                            {!manifest.screenshots || manifest.screenshots.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic py-2">
                                    尚未新增任何螢幕截圖。點擊右上角「新增截圖」即可新增豐富安裝彈窗展示畫面。
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {manifest.screenshots.map((screenshot, index) => (
                                        <div
                                            key={index}
                                            className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2.5 relative"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-primary" />
                                                    截圖 #{index + 1}
                                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/70 text-muted-foreground ml-1">
                                                        {screenshot.form_factor === "wide" ? "Desktop (wide)" : "Mobile (narrow)"}
                                                    </span>
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        type="button"
                                                        onClick={() => document.getElementById(`screenshot-file-input-${index}`)?.click()}
                                                        className="cursor-pointer h-6 px-2 text-[10px] gap-1 text-primary border-primary/30 bg-primary/5 hover:bg-primary/10"
                                                        title="點擊上傳截圖，自動辨識並帶入檔名與尺寸"
                                                    >
                                                        <Upload className="h-3 w-3" />
                                                        <span>上傳圖檔帶入</span>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveScreenshot(index)}
                                                        className="cursor-pointer h-6 px-1.5 text-muted-foreground hover:text-destructive"
                                                        title="刪除此截圖"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* 隱藏的原生檔案選擇器 */}
                                            <input
                                                type="file"
                                                id={`screenshot-file-input-${index}`}
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    if (e.target.files?.[0]) {
                                                        handleUploadScreenshotFile(index, e.target.files[0]);
                                                    }
                                                }}
                                            />

                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-stretch">
                                                {/* 版型示意圖 / 上傳預覽 (點擊可上傳並自動帶入檔名與解析度尺寸) */}
                                                <div
                                                    onClick={() => document.getElementById(`screenshot-file-input-${index}`)?.click()}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        if (e.dataTransfer.files?.[0]) {
                                                            handleUploadScreenshotFile(index, e.dataTransfer.files[0]);
                                                        }
                                                    }}
                                                    title="點擊或拖曳上傳截圖，自動帶入檔名與尺寸規格"
                                                    className="sm:col-span-4 rounded-xl border border-border/70 bg-muted/40 hover:bg-muted/60 hover:border-primary/50 p-2.5 flex flex-col justify-between select-none relative overflow-hidden transition-all cursor-pointer group"
                                                >
                                                    {uploadedScreenshotPreviews[index] ? (
                                                        /* 已上傳真實圖片預覽 */
                                                        <div className="w-full h-full min-h-[115px] flex flex-col justify-between">
                                                            <div className="relative flex-1 aspect-video rounded-lg overflow-hidden bg-background/90 border border-border/50 flex items-center justify-center group-hover:brightness-95 transition-all">
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img
                                                                    src={uploadedScreenshotPreviews[index]}
                                                                    alt={screenshot.label || "Uploaded preview"}
                                                                    className="w-full h-full object-contain"
                                                                />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 text-xs font-medium">
                                                                    <Upload className="h-4 w-4" />
                                                                    <span>點擊更換圖檔</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pt-1.5 border-t border-border/40 mt-1">
                                                                <span className="text-emerald-600 dark:text-emerald-400 font-sans text-[9px] font-semibold flex items-center gap-1">
                                                                    <Check className="h-3 w-3" />
                                                                    {screenshot.form_factor === "wide" ? "16:9 寬版" : "9:16 直式"}
                                                                </span>
                                                                <span className="font-semibold text-foreground/80">{screenshot.sizes}</span>
                                                            </div>
                                                        </div>
                                                    ) : screenshot.form_factor === "wide" ? (
                                                        /* 桌面 (wide 16:9) 視窗示意圖 */
                                                        <div className="w-full h-full min-h-[115px] flex flex-col justify-between">
                                                            {/* 視窗頂部控制條 */}
                                                            <div className="flex items-center gap-1 pb-1.5 border-b border-border/50">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400/80" />
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
                                                                <div className="h-1.5 flex-1 rounded bg-background/80 mx-1.5" />
                                                                <Monitor className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                                                            </div>
                                                            {/* 視窗內容線條示意 */}
                                                            <div className="py-2 flex flex-col items-center justify-center gap-1">
                                                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/85">
                                                                    <Monitor className="h-3.5 w-3.5 text-primary" />
                                                                    <span>Desktop 桌面示意</span>
                                                                </div>
                                                                <div className="flex items-center gap-1 text-[10px] text-primary bg-primary/10 group-hover:bg-primary/20 px-2 py-0.5 rounded-full transition-colors">
                                                                    <Upload className="h-2.5 w-2.5" />
                                                                    <span>點擊上傳帶入檔名與尺寸</span>
                                                                </div>
                                                            </div>
                                                            {/* 底部比例規格 */}
                                                            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pt-1 border-t border-border/40">
                                                                <span className="bg-primary/10 text-primary px-1.5 py-0.2 rounded font-sans text-[9px] font-medium">16 : 9 寬版</span>
                                                                <span>{screenshot.sizes || "1280×720"}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        /* 手機 (narrow 9:16) 視窗示意圖 */
                                                        <div className="w-full h-full min-h-[115px] flex flex-col justify-between items-center">
                                                            {/* 迷你手機機身 */}
                                                            <div className="w-20 h-[80px] rounded-lg border-2 border-border/80 bg-background/90 p-1 flex flex-col justify-between shadow-xs group-hover:border-primary/60 transition-colors">
                                                                {/* 頂部聽筒 */}
                                                                <div className="flex justify-center">
                                                                    <div className="w-4 h-0.5 rounded-full bg-muted-foreground/40" />
                                                                </div>
                                                                {/* 螢幕骨架 */}
                                                                <div className="flex flex-col items-center justify-center gap-0.5 my-auto">
                                                                    <Smartphone className="h-3 w-3 text-primary" />
                                                                    <span className="text-[8px] font-semibold text-primary flex items-center gap-0.5">
                                                                        <Upload className="h-2 w-2" />
                                                                        點擊上傳
                                                                    </span>
                                                                </div>
                                                                {/* 底部 Home 鍵線條 */}
                                                                <div className="flex justify-center">
                                                                    <div className="w-5 h-0.5 rounded-full bg-muted-foreground/40" />
                                                                </div>
                                                            </div>
                                                            {/* 底部比例規格 */}
                                                            <div className="w-full flex items-center justify-between text-[10px] text-muted-foreground font-mono pt-1 mt-1 border-t border-border/40">
                                                                <span className="bg-primary/10 text-primary px-1.5 py-0.2 rounded font-sans text-[9px] font-medium">9 : 16 直式</span>
                                                                <span>{screenshot.sizes || "750×1334"}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 參數輸入欄 */}
                                                <div className="sm:col-span-8 space-y-2">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[11px] text-muted-foreground font-medium">圖片路徑 (src)</span>
                                                                {screenshot.src && (
                                                                    <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase">
                                                                        {detectImageType(screenshot.src)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <Input
                                                                value={screenshot.src}
                                                                onChange={(e) => handleUpdateScreenshot(index, "src", e.target.value)}
                                                                placeholder="/screenshot-wide.png"
                                                                className="h-8 text-xs font-mono"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <span className="text-[11px] text-muted-foreground font-medium">尺寸規格 (sizes)</span>
                                                            <Input
                                                                value={screenshot.sizes}
                                                                onChange={(e) => handleUpdateScreenshot(index, "sizes", e.target.value)}
                                                                placeholder="例如：1280x720 或 750x1334"
                                                                className="h-8 text-xs font-mono"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        <div className="space-y-1">
                                                            <span className="text-[11px] text-muted-foreground font-medium">版型規格 (form_factor)</span>
                                                            <Select
                                                                value={screenshot.form_factor || "wide"}
                                                                onValueChange={(val) => handleUpdateScreenshot(index, "form_factor", val as "wide" | "narrow")}
                                                            >
                                                                <SelectTrigger className="w-full h-8 text-xs min-w-0">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent className="min-w-[190px]">
                                                                    <SelectItem value="wide">wide (桌面 16:9)</SelectItem>
                                                                    <SelectItem value="narrow">narrow (手機 9:16)</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <span className="text-[11px] text-muted-foreground font-medium">畫面描述 (label)</span>
                                                            <Input
                                                                value={screenshot.label || ""}
                                                                onChange={(e) => handleUpdateScreenshot(index, "label", e.target.value)}
                                                                placeholder="例如：主工作檯操作介面"
                                                                className="h-8 text-xs"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* 下方成果區：代碼預覽、複製與一鍵下載 */}
                <div className="mt-14 pt-8 border-t border-border/60 space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <FileJson className="h-5 w-5 text-primary" />
                                資訊清單成品與匯出代碼
                            </h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                可直接下載為 <code className="font-mono bg-muted/60 px-1 py-0.2 rounded">manifest.json</code> 放置於專案 <code className="font-mono bg-muted/60 px-1 py-0.2 rounded">public/</code> 資料夾。
                            </p>
                        </div>

                        <Button
                            onClick={handleDownloadManifest}
                            className="cursor-pointer gap-2 shadow-xs"
                            size="lg"
                        >
                            <Download className="h-4 w-4" />
                            下載 manifest.json
                        </Button>
                    </div>

                    {/* 代碼分頁卡片：含手機防溢出保護與自適應橫向滾動 */}
                    <div className="p-3.5 sm:p-4 rounded-xl border border-border/50 bg-muted/20 space-y-3 overflow-hidden max-w-full">
                        <Tabs
                            value={codeTab}
                            onValueChange={(val) => setCodeTab(val as "manifest" | "html")}
                            className="w-full"
                        >
                            <div className="w-full overflow-x-auto pb-1 border-b border-border/40 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                <TabsList variant="line" className="h-8 w-max min-w-full justify-start gap-1">
                                    <TabsTrigger value="manifest" className="text-xs cursor-pointer gap-1.5 whitespace-nowrap shrink-0">
                                        <FileJson className="h-3.5 w-3.5 text-primary shrink-0" />
                                        manifest.json (完整檔案)
                                    </TabsTrigger>
                                    <TabsTrigger value="html" className="text-xs cursor-pointer gap-1.5 whitespace-nowrap shrink-0">
                                        <FileCode className="h-3.5 w-3.5 text-primary shrink-0" />
                                        HTML 引入標籤 (&lt;head&gt;)
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            {/* Tab 1: manifest.json */}
                            <TabsContent value="manifest" className="space-y-2 mt-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-muted-foreground min-w-0 flex-1 leading-snug">
                                        保存為 <code className="text-foreground font-mono bg-muted/60 px-1 py-0.5 rounded">public/manifest.json</code>：
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCopyCode(manifestJsonString, "manifest")}
                                        className="shrink-0 cursor-pointer gap-1.5 h-8 text-xs font-normal"
                                    >
                                        {copiedSnippet === "manifest" ? (
                                            <>
                                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                                                <span className="text-emerald-500">已複製</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-3.5 w-3.5" />
                                                複製代碼
                                            </>
                                        )}
                                    </Button>
                                </div>
                                <pre className="text-[11px] font-mono text-muted-foreground overflow-x-auto leading-relaxed p-3 rounded-lg bg-background/80 border border-border/50 max-w-full">
                                    {manifestJsonString}
                                </pre>
                            </TabsContent>

                            {/* Tab 2: HTML Head Tags */}
                            <TabsContent value="html" className="space-y-2 mt-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-muted-foreground min-w-0 flex-1 leading-snug">
                                        放置於 HTML 頁面或 Next.js 的 <code className="text-foreground font-mono bg-muted/60 px-1 py-0.5 rounded">&lt;head&gt;</code> 標籤內：
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCopyCode(htmlHeadSnippetString, "html")}
                                        className="shrink-0 cursor-pointer gap-1.5 h-8 text-xs font-normal"
                                    >
                                        {copiedSnippet === "html" ? (
                                            <>
                                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                                                <span className="text-emerald-500">已複製</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-3.5 w-3.5" />
                                                複製代碼
                                            </>
                                        )}
                                    </Button>
                                </div>
                                <pre className="text-[11px] font-mono text-muted-foreground overflow-x-auto leading-relaxed p-3 rounded-lg bg-background/80 border border-border/50 max-w-full">
                                    {htmlHeadSnippetString}
                                </pre>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </main>
        </div>
    );
}
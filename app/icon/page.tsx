"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    MaskShape,
    SHAPES,
    applyShapePath,
    drawCheckerboard,
    drawSafeAreaOverlay,
    getSampleIconDataUrl,
    generateAllPwaIcons,
    createPwaIconsZip,
    GeneratedIconFile,
} from "./mask-utils";
import {
    Download,
    Upload,
    Sparkles,
    ShieldAlert,
    ZoomIn,
    RotateCcw,
    Palette,
    Archive,
    Check,
    Copy,
    Loader2,
    FileCode,
    FileJson,
    ArrowRight,
    CornerUpRight,
    Sliders,
    Maximize2,
} from "lucide-react";

const PRESET_COLORS = [
    { label: "白", value: "#ffffff" },
    { label: "黑", value: "#0f172a" },
    { label: "靛藍", value: "#4f46e5" },
    { label: "紫色", value: "#7c3aed" },
    { label: "粉紅", value: "#db2777" },
    { label: "天藍", value: "#0ea5e9" },
    { label: "翡翠綠", value: "#10b981" },
    { label: "琥珀黃", value: "#f59e0b" },
];

export default function IconPage() {
    const [selectedShape, setSelectedShape] = useState<MaskShape>("Rounded square");
    const [scale, setScale] = useState<number>(100);
    const [roundRadiusPercent, setRoundRadiusPercent] = useState<number>(22);
    const [iconBgColor, setIconBgColor] = useState<string>("#ffffff");
    const [isTransparentIconBg, setIsTransparentIconBg] = useState<boolean>(false);
    const [imageSrc, setImageSrc] = useState<string>("");
    const [isUsingSample, setIsUsingSample] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [showSafeArea, setShowSafeArea] = useState(true);
    const [previewBackdrop, setPreviewBackdrop] = useState<"transparent" | "white" | "black">("transparent");
    const [autoMaskableSafePadding, setAutoMaskableSafePadding] = useState(true);

    // 生成狀態
    const [generatedFiles, setGeneratedFiles] = useState<GeneratedIconFile[] | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isZipping, setIsZipping] = useState(false);
    const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const colorInputRef = useRef<HTMLInputElement>(null);
    const mainCanvasRef = useRef<HTMLCanvasElement>(null);
    const imgElementRef = useRef<HTMLImageElement | null>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    // 初始化載入範例圖標
    useEffect(() => {
        setImageSrc("/pwa/example.svg");
        setIsUsingSample(true);
    }, []);

    // 當 imageSrc 改變時加載 Image 物件
    useEffect(() => {
        if (!imageSrc) {
            imgElementRef.current = null;
            return;
        }
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            imgElementRef.current = img;
            renderMainCanvas();
        };
        img.src = imageSrc;
    }, [imageSrc]);

    // 主畫布渲染
    const renderMainCanvas = useCallback(() => {
        const canvas = mainCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const size = canvas.width;
        ctx.clearRect(0, 0, size, size);

        // 1. 預覽環境底色
        if (previewBackdrop === "transparent") {
            drawCheckerboard(ctx, size, 20);
        } else {
            ctx.fillStyle = previewBackdrop;
            ctx.fillRect(0, 0, size, size);
        }

        // 2. 裁切遮罩內部渲染（圖標底色 + 圖片）
        if (imgElementRef.current) {
            ctx.save();
            const radiusRatio = roundRadiusPercent / 100;
            applyShapePath(ctx, selectedShape, size, radiusRatio);
            ctx.clip();

            // 繪製圖標背景色
            if (!isTransparentIconBg) {
                ctx.fillStyle = iconBgColor;
                ctx.fillRect(0, 0, size, size);
            }

            // 等比縮放置中繪製圖片
            const factor = scale / 100;
            const img = imgElementRef.current;
            const imgAspect = img.width / img.height;
            let drawW = size * factor;
            let drawH = size * factor;

            if (imgAspect > 1) {
                drawH = drawW / imgAspect;
            } else {
                drawW = drawH * imgAspect;
            }

            const drawX = (size - drawW) / 2;
            const drawY = (size - drawH) / 2;

            ctx.drawImage(img, drawX, drawY, drawW, drawH);
            ctx.restore();

            // 遮罩邊界微線
            ctx.save();
            applyShapePath(ctx, selectedShape, size, radiusRatio);
            ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
        }

        // 3. 安全區域輔助線 (80% W3C 與 70% Android 推薦區域)
        if (showSafeArea) {
            drawSafeAreaOverlay(ctx, size);
        }
    }, [selectedShape, scale, roundRadiusPercent, iconBgColor, isTransparentIconBg, previewBackdrop, showSafeArea]);

    useEffect(() => {
        renderMainCanvas();
    }, [renderMainCanvas]);

    const handleFile = (file: File) => {
        if (file && file.type.startsWith("image/")) {
            const url = URL.createObjectURL(file);
            setImageSrc(url);
            setIsUsingSample(false);
            setScale(100);
            setGeneratedFiles(null);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleLoadSample = () => {
        setImageSrc("/pwa/example.svg");
        setIsUsingSample(true);
        setScale(100);
        setRoundRadiusPercent(22);
        setIconBgColor("#ffffff");
        setIsTransparentIconBg(false);
        setGeneratedFiles(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };



    const handleGenerateAll = async () => {
        if (!imgElementRef.current) return;

        setIsGenerating(true);
        try {
            const radiusRatio = roundRadiusPercent / 100;
            const files = await generateAllPwaIcons(imgElementRef.current, {
                shape: selectedShape,
                scale,
                iconBgColor,
                isTransparentIconBg,
                roundRadiusRatio: radiusRatio,
                autoMaskableSafePadding,
            });
            setGeneratedFiles(files);

            // 將生成的 512x512 圖標預覽與背景色彩保存到 localStorage，供「資訊清單 (/manifest)」頁面自動同步帶入
            try {
                const preview512 = files.find((f) => f.name.includes("512"))?.previewUrl || files[0]?.previewUrl;
                let persistentUrl = preview512;
                if (mainCanvasRef.current) {
                    try {
                        persistentUrl = mainCanvasRef.current.toDataURL("image/png");
                    } catch { }
                }
                if (persistentUrl) {
                    localStorage.setItem(
                        "pwa_generated_icon_data",
                        JSON.stringify({
                            previewUrl: persistentUrl,
                            iconBgColor: isTransparentIconBg ? "#ffffff" : iconBgColor,
                            themeColor: isTransparentIconBg ? "#ffffff" : iconBgColor,
                            shape: selectedShape,
                            updatedAt: Date.now(),
                        })
                    );
                }
            } catch (storageErr) {
                console.warn("無法儲存至 localStorage", storageErr);
            }

            setTimeout(() => {
                resultsRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        } catch (err) {
            console.error("生成圖標失敗", err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownloadZip = async () => {
        if (!generatedFiles || generatedFiles.length === 0) return;
        setIsZipping(true);
        try {
            const zipBlob = await createPwaIconsZip(generatedFiles);
            const link = document.createElement("a");
            link.download = "pwa-icons.zip";
            link.href = URL.createObjectURL(zipBlob);
            link.click();
        } catch (err) {
            console.error("ZIP 打包失敗", err);
        } finally {
            setIsZipping(false);
        }
    };

    const handleDownloadItem = (file: GeneratedIconFile) => {
        const link = document.createElement("a");
        link.download = file.name;
        link.href = file.previewUrl || URL.createObjectURL(file.blob);
        link.click();
    };

    const manifestIconsSnippet = `"icons": [
  {
    "src": "/icon-192x192.png",
    "sizes": "192x192",
    "type": "image/png",
    "purpose": "any"
  },
  {
    "src": "/icon-512x512.png",
    "sizes": "512x512",
    "type": "image/png",
    "purpose": "any"
  },
  {
    "src": "/icon-maskable-192x192.png",
    "sizes": "192x192",
    "type": "image/png",
    "purpose": "maskable"
  },
  {
    "src": "/icon-maskable-512x512.png",
    "sizes": "512x512",
    "type": "image/png",
    "purpose": "maskable"
  }
]`;

    const fullManifestSnippet = `{
  "name": "My PWA App",
  "short_name": "App",
  "start_url": "/",
  "display": "standalone",
  "background_color": "${isTransparentIconBg ? "#ffffff" : iconBgColor}",
  "theme_color": "${isTransparentIconBg ? "#ffffff" : iconBgColor}",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-maskable-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icon-maskable-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}`;

    const htmlHeadSnippet = `<!-- PWA & Favicon HTML Links (放置於 <head> 內) -->
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">`;

    const handleCopySnippet = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedSnippet(id);
        setTimeout(() => setCopiedSnippet(null), 2000);
    };

    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            <Header />

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleChange}
            />

            {/* 工作檯容器：移除卡片，改為沉浸式雙欄工作區，底層預留手機導航列避空安全距離 */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-32 sm:pb-24 lg:py-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

                    {/* 左側：中心畫布舞台 (Canvas Stage) */}
                    <div className="lg:col-span-7 flex flex-col items-center">
                        {/* 畫布檢視區 */}
                        <div className="w-full flex flex-col items-center justify-center p-6 sm:p-10 rounded-2xl bg-muted/25 border border-border/50 transition-colors">
                            <div className="relative flex items-center justify-center p-3 sm:p-4 bg-background/80 shadow-md border border-border/60">
                                <canvas
                                    ref={mainCanvasRef}
                                    width={512}
                                    height={512}
                                    className="w-64 h-64 sm:w-84 sm:h-84 md:w-96 md:h-96 block"
                                />
                            </div>

                            {/* 畫布底下的控制小工具列 (Toolbar) */}
                            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
                                {/* 預覽環境底色 Tabs */}
                                <Tabs
                                    value={previewBackdrop}
                                    onValueChange={(val) => {
                                        if (val) setPreviewBackdrop(val as typeof previewBackdrop);
                                    }}
                                >
                                    <TabsList className="h-8 p-0.5">
                                        <TabsTrigger value="transparent" className="text-xs px-2.5 py-1 cursor-pointer">
                                            棋盤底
                                        </TabsTrigger>
                                        <TabsTrigger value="white" className="text-xs px-2.5 py-1 cursor-pointer">
                                            純白底
                                        </TabsTrigger>
                                        <TabsTrigger value="black" className="text-xs px-2.5 py-1 cursor-pointer">
                                            純黑底
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>

                                {/* 安全區切換 */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowSafeArea(!showSafeArea)}
                                    className={`text-xs cursor-pointer ${showSafeArea
                                        ? "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium"
                                        : "text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    <ShieldAlert className="h-4 w-4 text-rose-500" />
                                    <span>80% 安全區輔助線</span>
                                </Button>
                            </div>
                        </div>

                        {/* 提示備註 */}
                        <div className="mt-4 text-xs text-muted-foreground flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                            <span>所見即所得：透明邊界將完整保留於匯出的 PNG 圖標與 favicon.ico 中</span>
                        </div>
                    </div>

                    {/* 右側：屬性檢查器面板 (Inspector Panel) - 無卡片封裝，簡潔線條分區 */}
                    <div className="lg:col-span-5 space-y-6">

                        {/* 區塊 1: 圖片來源 */}
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                    圖片來源
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleLoadSample}
                                    className="gap-1.5 cursor-pointer text-xs"
                                >
                                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                                    使用範例
                                </Button>
                            </div>

                            <div
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                className={`flex items-center gap-3.5 p-3.5 rounded-xl border border-dashed cursor-pointer transition-all ${isDragging
                                    ? "border-primary bg-primary/10"
                                    : "border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40"
                                    }`}
                            >
                                <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                                    <Upload className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-foreground truncate">
                                        {isUsingSample ? "目前使用向量範例圖標" : "點擊或拖放更換自訂圖片"}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        支援 PNG, SVG, JPG, WebP
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-border/50" />

                        {/* 區塊 2: 遮罩形狀與圓角 */}
                        <div className="space-y-3.5">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                    遮罩形狀 (Mask Shape)
                                </span>
                                <span className="text-xs font-mono text-primary">{selectedShape}</span>
                            </div>

                            <Select
                                value={selectedShape}
                                onValueChange={(val) => {
                                    if (val) {
                                        setSelectedShape(val as MaskShape);
                                        setGeneratedFiles(null);
                                    }
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SHAPES.map((item) => (
                                        <SelectItem key={item.value} value={item.value}>
                                            <div className="flex flex-col text-left py-0.5">
                                                <span className="font-medium text-foreground">
                                                    {item.label}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {item.description}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* 圓角弧度滑桿 (僅在 Rounded square 時展開) */}
                            {selectedShape === "Rounded square" && (
                                <div className="pt-2 pl-3 border-l-2 border-primary/40 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-medium text-foreground flex items-center gap-1.5">
                                            <CornerUpRight className="h-3 w-3 text-primary" />
                                            圓角半徑: {roundRadiusPercent}%
                                        </span>
                                        <button
                                            onClick={() => {
                                                setRoundRadiusPercent(22);
                                                setGeneratedFiles(null);
                                            }}
                                            title="重設為 22%"
                                            className="text-muted-foreground hover:text-foreground cursor-pointer"
                                        >
                                            <RotateCcw className="h-3 w-3" />
                                        </button>
                                    </div>

                                    <Slider
                                        value={[roundRadiusPercent]}
                                        onValueChange={(val) => {
                                            const v = Array.isArray(val) ? val[0] : val;
                                            setRoundRadiusPercent(v);
                                            setGeneratedFiles(null);
                                        }}
                                        min={5}
                                        max={45}
                                        step={1}
                                    />

                                    <div className="grid grid-cols-3 gap-2 pt-1">
                                        {[
                                            { l: "小圓角 (15%)", v: 15 },
                                            { l: "標準 iOS (22%)", v: 22 },
                                            { l: "大圓角 (35%)", v: 35 },
                                        ].map((p) => (
                                            <Button
                                                key={p.v}
                                                variant={roundRadiusPercent === p.v ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => {
                                                    setRoundRadiusPercent(p.v);
                                                    setGeneratedFiles(null);
                                                }}
                                                className="w-full cursor-pointer text-xs"
                                            >
                                                {p.l}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="h-px bg-border/50" />

                        {/* 區塊 3: 圖片縮放 */}
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <ZoomIn className="h-3.5 w-3.5 text-primary" />
                                    圖片縮放大小
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/60 text-foreground">
                                        {scale}%
                                    </span>
                                    <button
                                        onClick={() => {
                                            setScale(100);
                                            setGeneratedFiles(null);
                                        }}
                                        title="重設為 100%"
                                        className="text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                                    >
                                        <RotateCcw className="h-3 w-3" />
                                    </button>
                                </div>
                            </div>

                            <Slider
                                value={[scale]}
                                onValueChange={(val) => {
                                    if (Array.isArray(val)) setScale(val[0]);
                                    else if (typeof val === "number") setScale(val);
                                    setGeneratedFiles(null);
                                }}
                                min={30}
                                max={150}
                                step={1}
                            />

                            <div className="grid grid-cols-3 gap-2 pt-1">
                                {[
                                    { l: "80% 安全區", v: 80 },
                                    { l: "100% 原圖", v: 100 },
                                    { l: "125% 放大", v: 125 },
                                ].map((p) => (
                                    <Button
                                        key={p.v}
                                        variant={scale === p.v ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => {
                                            setScale(p.v);
                                            setGeneratedFiles(null);
                                        }}
                                        className="w-full cursor-pointer text-xs"
                                    >
                                        {p.l}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="h-px bg-border/50" />

                        {/* 區塊 4: 圖標背景色 */}
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Palette className="h-3.5 w-3.5 text-primary" />
                                    圖標背景色 (Icon Background)
                                </span>
                                <span className="font-mono text-muted-foreground">
                                    {isTransparentIconBg ? "透明底" : iconBgColor.toUpperCase()}
                                </span>
                            </div>

                            <div className="flex items-center gap-2.5">
                                {/* 顏色方塊 */}
                                <div className="relative">
                                    <input
                                        ref={colorInputRef}
                                        type="color"
                                        value={iconBgColor}
                                        disabled={isTransparentIconBg}
                                        onChange={(e) => {
                                            setIconBgColor(e.target.value);
                                            setIsTransparentIconBg(false);
                                            setGeneratedFiles(null);
                                        }}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                    />
                                    <div
                                        className={`w-9 h-9 rounded-lg border shadow-xs flex items-center justify-center transition-all ${isTransparentIconBg
                                            ? "border-muted-foreground/30 bg-muted/40 opacity-50"
                                            : "border-border hover:border-primary cursor-pointer ring-1 ring-black/5"
                                            }`}
                                        style={{
                                            backgroundColor: isTransparentIconBg ? "transparent" : iconBgColor,
                                        }}
                                        title="點擊自訂色彩"
                                    >
                                        {isTransparentIconBg && (
                                            <span className="text-xs text-muted-foreground font-bold">∅</span>
                                        )}
                                    </div>
                                </div>

                                {/* 色碼文字 */}
                                <input
                                    type="text"
                                    value={isTransparentIconBg ? "" : iconBgColor}
                                    placeholder={isTransparentIconBg ? "透明 (無背景)" : "#ffffff"}
                                    disabled={isTransparentIconBg}
                                    onChange={(e) => {
                                        setIconBgColor(e.target.value);
                                        setGeneratedFiles(null);
                                    }}
                                    className="flex-1 h-9 px-3 text-sm font-mono rounded-md border border-input bg-transparent placeholder:text-muted-foreground focus:outline-none focus:border-primary disabled:opacity-50"
                                />

                                <Button
                                    variant={isTransparentIconBg ? "default" : "outline"}
                                    size="default"
                                    onClick={() => {
                                        setIsTransparentIconBg(!isTransparentIconBg);
                                        setGeneratedFiles(null);
                                    }}
                                    className="cursor-pointer shrink-0"
                                >
                                    透明底
                                </Button>
                            </div>

                            {/* 推薦色票 */}
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                {PRESET_COLORS.map((preset) => {
                                    const isSelected = !isTransparentIconBg && iconBgColor.toLowerCase() === preset.value.toLowerCase();
                                    return (
                                        <button
                                            key={preset.value}
                                            onClick={() => {
                                                setIconBgColor(preset.value);
                                                setIsTransparentIconBg(false);
                                                setGeneratedFiles(null);
                                            }}
                                            title={preset.label}
                                            className={`w-4.5 h-4.5 rounded-full border transition-transform cursor-pointer ${isSelected
                                                ? "ring-2 ring-primary ring-offset-1 scale-110 border-primary"
                                                : "border-border hover:scale-110"
                                                }`}
                                            style={{ backgroundColor: preset.value }}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        <div className="h-px bg-border/50" />

                        {/* 區塊 5: 行動按鈕 */}
                        <div className="pt-3 pb-2">
                            <Button
                                onClick={handleGenerateAll}
                                disabled={isGenerating}
                                className="w-full cursor-pointer shadow-sm"
                                size="lg"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        正在生成中...
                                    </>
                                ) : (
                                    <>
                                        <Archive className="h-4 w-4" />
                                        生成所有尺寸圖標
                                    </>
                                )}
                            </Button>
                        </div>

                    </div>
                </div>

                {/* 下方清單：生成完成後的平鋪資產列表 (Asset Table/List) */}
                {generatedFiles && (
                    <div ref={resultsRef} className="mt-16 pt-10 border-t border-border/60 space-y-6 animate-in fade-in-50 duration-200">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Archive className="h-5 w-5 text-primary" />
                                    已生成全套 {selectedShape} 圖標 ({generatedFiles.length} 款)
                                </h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    所有圖標皆已精確裁切為 {selectedShape}，包含 favicon.ico 與標準 PWA 規格。
                                </p>
                            </div>

                            <div className="flex items-center gap-2.5 flex-wrap">
                                <Button
                                    onClick={handleDownloadZip}
                                    disabled={isZipping}
                                    variant="outline"
                                    className="gap-2 font-medium cursor-pointer shadow-xs"
                                >
                                    {isZipping ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            打包中...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="h-4 w-4" />
                                            一鍵打包下載 (ZIP)
                                        </>
                                    )}
                                </Button>

                                <Link href="/manifest">
                                    <Button
                                        className="gap-2 font-medium cursor-pointer shadow-xs"
                                    >
                                        前往資訊清單 (自動帶入此圖標)
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        {/* 檔案清單：採用清爽的列表式排列，不使用厚重卡片 */}
                        <div className="border border-border/60 rounded-xl divide-y divide-border/50 overflow-hidden bg-background">
                            {generatedFiles.map((file) => (
                                <div
                                    key={file.name}
                                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors gap-4"
                                >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        {/* 微縮預覽，附帶微型棋盤格以展示透明圓角 */}
                                        <div
                                            className="w-10 h-10 rounded border border-border/70 flex items-center justify-center p-0.5 shrink-0 overflow-hidden shadow-2xs"
                                            style={{
                                                backgroundImage:
                                                    "linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)",
                                                backgroundSize: "8px 8px",
                                                backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0",
                                                backgroundColor: "#f8fafc",
                                            }}
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={file.previewUrl}
                                                alt={file.name}
                                                className="w-full h-full object-contain"
                                            />
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm font-medium text-foreground truncate">
                                                    {file.name}
                                                </span>
                                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground shrink-0">
                                                    {file.sizeDesc}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                                {file.purpose}
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="default"
                                        onClick={() => handleDownloadItem(file)}
                                        className="shrink-0 cursor-pointer"
                                    >
                                        <Download className="h-4 w-4" />
                                        下載
                                    </Button>
                                </div>
                            ))}
                        </div>

                        {/* 代碼片段：包含 manifest icons、完整 manifest.json 與 HTML 引用標籤 */}
                        <div className="p-3.5 sm:p-4 rounded-xl border border-border/50 bg-muted/20 space-y-3 overflow-hidden">
                            <Tabs defaultValue="manifest-icons" className="w-full">
                                {/* 分頁選單：加入水平滾動與邊界約束，避免手機版面凸出 */}
                                <div className="w-full overflow-x-auto pb-1 border-b border-border/40 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                    <TabsList variant="line" className="h-8 w-max min-w-full justify-start gap-1">
                                        <TabsTrigger value="manifest-icons" className="text-xs cursor-pointer gap-1.5 whitespace-nowrap shrink-0">
                                            <FileJson className="h-3.5 w-3.5 text-primary shrink-0" />
                                            manifest.json (&quot;icons&quot;)
                                        </TabsTrigger>
                                        <TabsTrigger value="html-head" className="text-xs cursor-pointer gap-1.5 whitespace-nowrap shrink-0">
                                            <FileCode className="h-3.5 w-3.5 text-primary shrink-0" />
                                            HTML (&lt;head&gt;)
                                        </TabsTrigger>
                                        <TabsTrigger value="manifest-full" className="text-xs cursor-pointer gap-1.5 whitespace-nowrap shrink-0">
                                            <FileJson className="h-3.5 w-3.5 text-primary shrink-0" />
                                            完整 manifest.json
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                <TabsContent value="manifest-icons" className="space-y-2 mt-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs text-muted-foreground min-w-0 flex-1 leading-snug">
                                            直接複製並貼入現有 <code className="text-foreground font-mono bg-muted/60 px-1 py-0.5 rounded">&quot;icons&quot;</code> 欄位：
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleCopySnippet(manifestIconsSnippet, "manifest-icons")}
                                            className="shrink-0 cursor-pointer gap-1.5 h-8 text-xs font-normal"
                                        >
                                            {copiedSnippet === "manifest-icons" ? (
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
                                        {manifestIconsSnippet}
                                    </pre>
                                </TabsContent>

                                <TabsContent value="html-head" className="space-y-2 mt-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs text-muted-foreground min-w-0 flex-1 leading-snug">
                                            放置於 HTML 頁面的 <code className="text-foreground font-mono bg-muted/60 px-1 py-0.5 rounded">&lt;head&gt;</code> 標籤內：
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleCopySnippet(htmlHeadSnippet, "html-head")}
                                            className="shrink-0 cursor-pointer gap-1.5 h-8 text-xs font-normal"
                                        >
                                            {copiedSnippet === "html-head" ? (
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
                                        {htmlHeadSnippet}
                                    </pre>
                                </TabsContent>

                                <TabsContent value="manifest-full" className="space-y-2 mt-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs text-muted-foreground min-w-0 flex-1 leading-snug">
                                            完整的 <code className="text-foreground font-mono bg-muted/60 px-1 py-0.5 rounded">manifest.json</code> 範例檔案結構：
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleCopySnippet(fullManifestSnippet, "manifest-full")}
                                            className="shrink-0 cursor-pointer gap-1.5 h-8 text-xs font-normal"
                                        >
                                            {copiedSnippet === "manifest-full" ? (
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
                                        {fullManifestSnippet}
                                    </pre>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
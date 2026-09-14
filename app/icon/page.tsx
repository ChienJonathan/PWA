"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Header } from "@/components/header";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";


const items = [
    { label: "Select a fruit", value: null },
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Blueberry", value: "blueberry" },
    { label: "Grapes", value: "grapes" },
    { label: "Pineapple", value: "pineapple" },
]

export default function IconPage() {
    const [preview, setPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = (file: File) => {
        if (file && file.type.startsWith("image/")) {
            const url = URL.createObjectURL(file);
            setPreview(url);
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

    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            <Header />

            <main className="flex-1 px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 sm:pb-8">
                <div className="mx-auto max-w-7xl">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleChange}
                    />

                    <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        className={`relative flex flex-col items-center justify-center h-52 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${isDragging
                            ? "border-primary bg-primary/10"
                            : "border-muted-foreground/30 hover:border-muted-foreground/60 bg-muted/20"
                            }`}
                    >
                        {preview ? (
                            <div className="relative w-full h-full p-2">
                                <Image
                                    src={preview}
                                    alt="預覽圖片"
                                    fill
                                    className="object-contain rounded-lg"
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                                <svg
                                    className="w-8 h-8 stroke-current"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
                                    />
                                </svg>
                                <p>
                                    <span className="font-semibold text-foreground">點擊上傳</span> 或拖放圖片至此
                                </p>
                                <p className="text-xs">支援 PNG, JPG, SVG 等格式</p>
                            </div>
                        )}
                    </div>
                    <Select items={items}>
                        <SelectTrigger className="w-full max-w-48">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectLabel>Fruits</SelectLabel>
                                {items.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>
            </main>
        </div>
    );
}
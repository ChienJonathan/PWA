"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgePercent, FileCodeCorner, GlobeCode } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function Header() {
    const pathname = usePathname();

    const navItems = [
        { name: "圖標工具", href: "/icon", icon: BadgePercent },
        { name: "資訊清單", href: "/manifest", icon: FileCodeCorner },
    ];

    return (
        <>
            {/* 頂部導航列 (桌面與手機適配) */}
            <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
                <div className="mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
                    {/* Brand */}
                    <Link
                        href="/"
                        className="flex items-center gap-2 font-bold text-lg tracking-tight text-foreground hover:opacity-90 transition-opacity"
                    >
                        <GlobeCode className="h-5 w-5 text-primary" />
                        <span>PWATools</span>
                    </Link>

                    {/* 桌面端導航列 (>= default 顯示) */}
                    <nav className="hidden sm:flex items-center gap-1.5">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={buttonVariants({
                                        variant: isActive ? "secondary" : "ghost",
                                        size: "default",
                                        className: isActive ? "font-semibold" : "text-muted-foreground",
                                    })}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </header>

            {/* 手機專屬底部導航列 (< sm 顯示，高度更加舒適且支援 iPhone 安全區域) */}
            <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/50 px-4 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] min-h-[68px] flex items-center justify-around shadow-lg">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all duration-200 active:scale-95 ${isActive
                                ? "text-primary font-semibold"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <div
                                className={`flex items-center justify-center p-1 rounded-lg transition-colors ${isActive ? "bg-primary/10" : ""
                                    }`}
                            >
                                <Icon
                                    className={`h-5 w-5 ${isActive ? "text-primary scale-110" : ""
                                        } transition-transform duration-200`}
                                />
                            </div>
                            <span
                                className={`text-xs mt-1 tracking-tight ${isActive ? "font-semibold text-primary" : "font-medium"
                                    }`}
                            >
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}
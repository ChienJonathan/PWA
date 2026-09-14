"use client";

import { Header } from "@/components/header";

export default function IconPage() {
    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            <Header />

            <main className="flex-1 px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 sm:pb-8"></main>
        </div>
    )
}
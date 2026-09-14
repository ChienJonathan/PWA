"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/icon");
  }, [router]);

  return (
    <noscript>
      <meta httpEquiv="refresh" content="0; url=/pwa/icon" />
    </noscript>
  );
}

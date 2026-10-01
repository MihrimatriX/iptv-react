"use client";

import { useEffect } from "react";

export function PWAProvider() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((error) => console.error("Service Worker registration failed:", error));
  }, []);

  return null;
}

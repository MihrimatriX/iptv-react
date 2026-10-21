"use client";

import { useEffect } from "react";
import { BASE_PATH } from "@/lib/deploy";

export function PWAProvider() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register(`${BASE_PATH}/sw.js`, { scope: `${BASE_PATH}/` })
      .catch((error) => console.error("Service Worker registration failed:", error));
  }, []);

  return null;
}

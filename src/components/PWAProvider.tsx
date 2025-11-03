"use client";

import { useEffect } from "react";

export function PWAProvider() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator))
      return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        console.log("Service Worker registered successfully:", registration);

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                console.log("New service worker version available");
              }
            });
          }
        });

        navigator.serviceWorker.addEventListener("message", (event) => {
          console.log("Message from service worker:", event.data);
        });
      } catch (error) {
        console.error("Service Worker registration failed:", error);
      }
    };

    registerSW();

    let deferredPrompt: any = null;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      console.log("PWA install prompt available");
    };

    const handleAppInstalled = () => {
      console.log("PWA was installed");
      deferredPrompt = null;
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  return null;
}

export const installPWA = async () => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
      window.location.reload();
    }
  } catch (error) {
    console.error("Failed to update PWA:", error);
  }
};

export const getPWAStatus = () => {
  if (typeof window === "undefined") return null;

  return {
    isInstalled:
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true,
    isOnline: navigator.onLine,
    hasServiceWorker: "serviceWorker" in navigator,
    isSecure:
      location.protocol === "https:" || location.hostname === "localhost",
  };
};

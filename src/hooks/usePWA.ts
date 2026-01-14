"use client";

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface UsePWAReturn {
  // Install prompt
  canInstall: boolean;
  isInstalled: boolean;
  promptInstall: () => Promise<boolean>;
  
  // Update handling
  hasUpdate: boolean;
  updateVersion: string | null;
  applyUpdate: () => void;
  
  // Service Worker status
  swRegistration: ServiceWorkerRegistration | null;
  isOnline: boolean;
}

export function usePWA(): UsePWAReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Check if already installed
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check if running as standalone PWA
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches 
        || (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone);
      setIsOnline(navigator.onLine);
    }
  }, []);

  // Listen for install prompt
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log("[PWA] App installed successfully");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Register Service Worker and listen for updates
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        
        setSwRegistration(registration);
        console.log("[PWA] Service Worker registered");

        // Check for updates periodically
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New version available
                setHasUpdate(true);
                console.log("[PWA] New version available!");
              }
            });
          }
        });

        // Check for updates on focus
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            registration.update();
          }
        });

      } catch (error) {
        console.error("[PWA] Service Worker registration failed:", error);
      }
    };

    // Listen for messages from SW
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "SW_UPDATED") {
        setHasUpdate(true);
        setUpdateVersion(event.data.version);
        console.log("[PWA] Update notification received:", event.data.version);
      }
    });

    // Listen for online/offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    registerSW();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Prompt user to install
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.log("[PWA] No install prompt available");
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === "accepted") {
        console.log("[PWA] User accepted install");
        setDeferredPrompt(null);
        return true;
      } else {
        console.log("[PWA] User dismissed install");
        return false;
      }
    } catch (error) {
      console.error("[PWA] Install prompt error:", error);
      return false;
    }
  }, [deferredPrompt]);

  // Apply update (reload with new SW)
  const applyUpdate = useCallback(() => {
    if (swRegistration?.waiting) {
      // Tell SW to skip waiting
      swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
    
    // Reload page to use new SW
    window.location.reload();
  }, [swRegistration]);

  return {
    canInstall: !!deferredPrompt && !isInstalled,
    isInstalled,
    promptInstall,
    hasUpdate,
    updateVersion,
    applyUpdate,
    swRegistration,
    isOnline,
  };
}


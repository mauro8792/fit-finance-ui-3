"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePWA } from "@/hooks/usePWA";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, RefreshCw, X, Smartphone, Sparkles, Share, PlusSquare } from "lucide-react";

// Storage key for dismissal
const INSTALL_DISMISSED_KEY = "pwa-install-dismissed";
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export function PWAPrompts() {
  const { canInstall, promptInstall, hasUpdate, applyUpdate, isInstalled, isIOSSafari } = usePWA();
  const [showInstall, setShowInstall] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);

  // Check if install prompt was dismissed recently
  useEffect(() => {
    if (canInstall && !isInstalled) {
      const dismissed = localStorage.getItem(INSTALL_DISMISSED_KEY);
      if (dismissed) {
        const dismissedAt = parseInt(dismissed);
        if (Date.now() - dismissedAt < DISMISS_DURATION) {
          return; // Still dismissed
        }
      }
      // Show install prompt after a short delay
      const timer = setTimeout(() => setShowInstall(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [canInstall, isInstalled]);

  // Show update modal immediately when available
  useEffect(() => {
    if (hasUpdate) {
      setShowUpdate(true);
    }
  }, [hasUpdate]);

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      setShowInstall(false);
    }
  };

  const handleDismissInstall = () => {
    localStorage.setItem(INSTALL_DISMISSED_KEY, Date.now().toString());
    setShowInstall(false);
  };

  return (
    <>
      {/* Install Prompt */}
      <AnimatePresence>
        {showInstall && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96"
          >
            <Card className="bg-gradient-to-br from-surface to-background border-primary/30 shadow-2xl shadow-primary/20">
              <CardContent className="p-4">
                <button
                  onClick={handleDismissInstall}
                  className="absolute top-2 right-2 p-1 text-text-muted hover:text-text transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-7 h-7 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text flex items-center gap-2">
                      Instalar BraCamp
                      <Sparkles className="w-4 h-4 text-primary" />
                    </h3>
                    
                    {isIOSSafari ? (
                      // Instrucciones específicas para iOS Safari
                      <>
                        <p className="text-sm text-text-muted mt-1">
                          Agregá la app a tu pantalla de inicio:
                        </p>
                        <div className="mt-3 space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-text-muted">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">1</span>
                            <span className="flex items-center gap-1">
                              Tocá el ícono <Share className="w-4 h-4 text-primary inline" /> de compartir
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-text-muted">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">2</span>
                            <span className="flex items-center gap-1">
                              Seleccioná <PlusSquare className="w-4 h-4 text-primary inline" /> &quot;Agregar a inicio&quot;
                            </span>
                          </div>
                        </div>
                        <Button
                          onClick={handleDismissInstall}
                          variant="outline"
                          className="mt-3 w-full border-primary/30 text-text"
                        >
                          Entendido
                        </Button>
                      </>
                    ) : (
                      // Botón normal para Android/Chrome
                      <>
                        <p className="text-sm text-text-muted mt-1">
                          Agregá la app a tu pantalla de inicio para acceso rápido
                        </p>
                        <Button
                          onClick={handleInstall}
                          className="mt-3 w-full bg-primary hover:bg-primary-hover text-black font-medium"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Instalar ahora
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Update Modal - Forced */}
      <AnimatePresence>
        {showUpdate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm"
            >
              <Card className="bg-gradient-to-br from-surface to-background border-primary/30">
                <CardContent className="p-6 text-center">
                  <motion.div
                    className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <RefreshCw className="w-10 h-10 text-primary" />
                  </motion.div>
                  
                  <h2 className="text-xl font-bold text-text mb-2">
                    ¡Nueva versión disponible!
                  </h2>
                  
                  <p className="text-text-muted mb-6">
                    Hay una actualización disponible con mejoras y correcciones. 
                    Actualiza ahora para tener la mejor experiencia.
                  </p>
                  
                  <Button
                    onClick={applyUpdate}
                    className="w-full bg-primary hover:bg-primary-hover text-black font-semibold h-12"
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Actualizar ahora
                  </Button>
                  
                  <p className="text-xs text-text-muted mt-3">
                    La app se recargará automáticamente
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}


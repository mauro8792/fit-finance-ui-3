"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { BottomNav } from "@/components/navigation/BottomNav";
import { Loader2 } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { status, userType, checkAuth } = useAuthStore();

  // Conectar WebSocket para recibir notificaciones en tiempo real
  useNotifications();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (status === "not-authenticated") {
      router.replace("/auth/login");
    } else if (status === "authenticated" && userType !== "coach") {
      // Redirigir según el tipo de usuario
      if (userType === "student") router.replace("/student");
      else if (userType === "admin" || userType === "superadmin") router.replace("/admin");
    }
  }, [status, userType, router]);

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status !== "authenticated" || userType !== "coach") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-nav">{children}</main>
      <BottomNav userType="coach" />
    </div>
  );
}


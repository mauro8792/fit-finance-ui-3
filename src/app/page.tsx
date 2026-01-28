"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Loader2 } from "lucide-react";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const { status, userType, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (status === "not-authenticated") {
      router.replace("/auth/login");
      return;
    }

    if (status === "select-profile") {
      router.replace("/auth/select-profile");
      return;
    }

    if (status === "authenticated" && userType) {
      switch (userType) {
        case "student":
          router.replace("/student");
          break;
        case "coach":
          router.replace("/coach");
          break;
        case "admin":
        case "superadmin":
          router.replace("/admin");
          break;
        default:
          router.replace("/auth/login");
      }
    }
  }, [status, userType, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        {/* Logo */}
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-lg shadow-primary/20">
          <Image
            src="/icons/gorila.png"
            alt="BraCamp"
            width={64}
            height={64}
            className="object-contain"
            priority
          />
        </div>
        
        {/* Loading */}
        <div className="flex items-center gap-2 text-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Verificando sesión...</span>
        </div>
      </div>
    </div>
  );
}

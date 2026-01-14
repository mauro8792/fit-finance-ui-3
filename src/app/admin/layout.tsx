"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { BottomNav } from "@/components/navigation/BottomNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status, userType } = useAuthStore();

  useEffect(() => {
    if (status === "not-authenticated") {
      router.replace("/auth/login");
    } else if (status === "authenticated" && userType !== "admin" && userType !== "superadmin") {
      router.replace("/");
    }
  }, [status, userType, router]);

  if (status === "checking") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Cargando...</div>
      </div>
    );
  }

  if (userType !== "admin" && userType !== "superadmin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {children}
      <BottomNav userType="admin" />
    </div>
  );
}


"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  User,
  Shield,
  Bell,
  Palette,
  LogOut,
  ChevronRight,
  Info,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    toast.success("Sesión cerrada");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Configuración" />

      <div className="px-4 py-4 space-y-4">
        {/* User Info */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-xl font-bold text-black">
                  {user?.fullName
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2) || "A"}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-text">{user?.fullName || "Admin"}</h2>
                <p className="text-sm text-text-muted">{user?.email}</p>
                <Badge className="mt-1 bg-primary/20 text-primary">Administrador</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Options */}
        <div className="space-y-2">
          <Card className="bg-surface/80 border-border cursor-pointer touch-feedback">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-text">Perfil</h3>
                <p className="text-xs text-text-muted">Editar información personal</p>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted" />
            </CardContent>
          </Card>

          <Card className="bg-surface/80 border-border cursor-pointer touch-feedback">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-text">Seguridad</h3>
                <p className="text-xs text-text-muted">Cambiar contraseña</p>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted" />
            </CardContent>
          </Card>

          <Card className="bg-surface/80 border-border cursor-pointer touch-feedback">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-text">Notificaciones</h3>
                <p className="text-xs text-text-muted">Preferencias de alertas</p>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted" />
            </CardContent>
          </Card>
        </div>

        {/* App Info */}
        <Card className="bg-surface/50 border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Info className="w-5 h-5 text-text-muted" />
              <span className="text-sm font-medium text-text">Información de la app</span>
            </div>
            <div className="space-y-2 text-sm text-text-muted">
              <div className="flex justify-between">
                <span>Versión</span>
                <span className="text-text">3.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>Framework</span>
                <span className="text-text">Next.js 16</span>
              </div>
              <div className="flex justify-between">
                <span>Tipo</span>
                <span className="text-text">PWA</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full border-red-500/50 text-red-500 hover:bg-red-500/10"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}


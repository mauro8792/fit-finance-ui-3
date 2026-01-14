"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  User,
  CreditCard,
  BookOpen,
  LogOut,
  ChevronRight,
  Mail,
  Phone,
  RefreshCw,
  Utensils,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function CoachProfilePage() {
  const router = useRouter();
  const { user, coach, student, logout, selectProfile } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.replace("/auth/login");
    toast.success("Sesión cerrada");
  };

  const handleSwitchProfile = () => {
    if (student) {
      selectProfile("student");
      router.replace("/student");
      toast.success("Cambiado a perfil de atleta");
    }
  };

  const menuItems = [
    {
      icon: BookOpen,
      label: "Catálogo de Ejercicios",
      subtitle: "Gestionar ejercicios disponibles",
      href: "/coach/exercises",
      color: "text-primary",
      bgColor: "bg-primary/20",
    },
    {
      icon: Utensils,
      label: "Catálogo de Alimentos",
      subtitle: "Gestionar alimentos para nutrición",
      href: "/coach/food-catalog",
      color: "text-accent",
      bgColor: "bg-accent/20",
    },
    {
      icon: CreditCard,
      label: "Datos de Pago",
      subtitle: "Configurar alias y CBU",
      href: "/coach/payment-settings",
      color: "text-success",
      bgColor: "bg-success/20",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Mi Perfil" />

      <div className="px-4 py-4 space-y-4">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-br from-surface to-background border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-lg shadow-primary/20">
                  <span className="text-2xl font-bold text-black">
                    {user?.fullName?.[0]?.toUpperCase() || "C"}
                  </span>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-text">
                    {user?.fullName || "Coach"}
                  </h2>
                  <p className="text-sm text-text-muted flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {user?.email}
                  </p>
                  {coach?.specialization && (
                    <p className="text-sm text-primary mt-1">
                      {coach.specialization}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Switch Profile (if has student profile) */}
        {student && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card
              className="bg-surface/80 border-accent/30 cursor-pointer touch-feedback"
              onClick={handleSwitchProfile}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-text text-sm">Cambiar a Atleta</h3>
                  <p className="text-xs text-text-muted">Ver mi rutina personal</p>
                </div>
                <ChevronRight className="w-5 h-5 text-accent" />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Menu Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-2"
        >
          {menuItems.map((item) => (
            <Card
              key={item.href}
              className="bg-surface/80 border-border cursor-pointer touch-feedback"
              onClick={() => router.push(item.href)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", item.bgColor)}>
                  <item.icon className={cn("w-5 h-5", item.color)} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-text text-sm">{item.label}</h3>
                  <p className="text-xs text-text-muted">{item.subtitle}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-text-muted" />
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* App Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-surface/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center">
                    <span className="text-sm font-bold text-black">F</span>
                  </div>
                  <span className="font-medium text-text">BraCamp</span>
                </div>
                <span className="text-xs text-text-muted">v3.0.0</span>
              </div>
              <Separator className="my-3" />
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>Panel de Entrenador</span>
                <span>© 2026</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Logout Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full h-12 border-error/30 text-error hover:bg-error/10 hover:text-error"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </motion.div>
      </div>
    </div>
  );
}


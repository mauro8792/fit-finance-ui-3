"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import api from "@/lib/api";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  LogOut,
  ChevronRight,
  Mail,
  Phone,
  RefreshCw,
  History,
  Dumbbell,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ProfilePage() {
  const router = useRouter();
  const { user, student, logout, selectProfile, coach } = useAuthStore();
  const [studentData, setStudentData] = useState<any>(null);

  useEffect(() => {
    // Cargar datos actualizados del estudiante (con sportPlan)
    const loadStudentData = async () => {
      if (student?.id) {
        try {
          const { data } = await api.get(`/students/${student.id}`);
          setStudentData(data);
        } catch (error) {
          console.error("Error loading student data:", error);
        }
      }
    };
    loadStudentData();
  }, [student?.id]);

  const handleLogout = () => {
    logout();
    router.replace("/auth/login");
    toast.success("Sesión cerrada");
  };

  const handleSwitchProfile = () => {
    if (coach) {
      selectProfile("coach");
      router.replace("/coach");
      toast.success("Cambiado a perfil de entrenador");
    }
  };

  const menuItems = [
    {
      icon: History,
      label: "Mi Historial",
      subtitle: "Progreso y entrenamientos",
      href: "/student/history",
      color: "text-accent",
      bgColor: "bg-accent/20",
      disabled: false,
    },
    {
      icon: CreditCard,
      label: "Mis Cuotas",
      subtitle: "Ver estado de pagos",
      href: "/student/fees",
      color: "text-primary",
      bgColor: "bg-primary/20",
      disabled: false,
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
                    {user?.fullName?.[0]?.toUpperCase() || "U"}
                  </span>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-text">
                    {user?.fullName || student?.firstName + " " + student?.lastName}
                  </h2>
                  <p className="text-sm text-text-muted flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {user?.email}
                  </p>
                  {student?.phone && (
                    <p className="text-sm text-text-muted flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3" />
                      {student.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Plan Info */}
              {(studentData?.sportPlan || student?.sportPlan) && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                        <Dumbbell className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text">
                          {studentData?.sportPlan?.name || student?.sportPlan?.name}
                        </p>
                        <p className="text-xs text-text-muted flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {studentData?.sportPlan?.weeklyFrequency || student?.sportPlan?.weeklyFrequency}x por semana
                        </p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-success">
                      ${studentData?.effectiveMonthlyFee?.toLocaleString() || 
                        studentData?.sportPlan?.monthlyFee?.toLocaleString() || 
                        student?.sportPlan?.monthlyFee?.toLocaleString() || "—"}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Switch Profile (if coach with dual profile) */}
        {coach && (
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
                  <h3 className="font-medium text-text text-sm">Cambiar a Entrenador</h3>
                  <p className="text-xs text-text-muted">Acceder como coach</p>
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
                <span>Desarrollado con 💪</span>
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


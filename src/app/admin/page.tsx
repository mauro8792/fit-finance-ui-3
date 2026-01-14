"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { getAllStudents, getAllCoaches, getAllFees } from "@/lib/api/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  UserCog,
  CreditCard,
  DollarSign,
  TrendingUp,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Stats {
  totalStudents: number;
  activeStudents: number;
  totalCoaches: number;
  pendingFees: number;
  totalPending: number;
  collectedThisMonth: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const [students, coaches, fees] = await Promise.all([
          getAllStudents().catch(() => []),
          getAllCoaches().catch(() => []),
          getAllFees().catch(() => []),
        ]);

        const pendingFees = fees.filter(
          (f: any) => f.status === "pending" || f.status === "overdue"
        );
        const paidThisMonth = fees.filter((f: any) => {
          if (f.status !== "paid") return false;
          const paidDate = new Date(f.paidAt);
          const now = new Date();
          return (
            paidDate.getMonth() === now.getMonth() &&
            paidDate.getFullYear() === now.getFullYear()
          );
        });

        setStats({
          totalStudents: students.length,
          activeStudents: students.filter((s: any) => s.isActive).length,
          totalCoaches: coaches.length,
          pendingFees: pendingFees.length,
          totalPending: pendingFees.reduce(
            (sum: number, f: any) => sum + (f.amount - (f.amountPaid || 0)),
            0
          ),
          collectedThisMonth: paidThisMonth.reduce(
            (sum: number, f: any) => sum + f.amount,
            0
          ),
        });
      } catch (error) {
        console.error("Error loading stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 19) return "Buenas tardes";
    return "Buenas noches";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="px-4 pt-6 pb-4">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="px-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-text-muted text-sm">{getGreeting()}</p>
          <h1 className="text-2xl font-bold text-text">Admin Panel 🛠️</h1>
        </motion.div>
      </header>

      <div className="px-4 space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card
            className="bg-surface/80 border-border cursor-pointer touch-feedback"
            onClick={() => router.push("/admin/students")}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted" />
              </div>
              <p className="text-2xl font-bold text-text">{stats?.totalStudents || 0}</p>
              <p className="text-xs text-text-muted">
                Alumnos ({stats?.activeStudents} activos)
              </p>
            </CardContent>
          </Card>

          <Card
            className="bg-surface/80 border-border cursor-pointer touch-feedback"
            onClick={() => router.push("/admin/coaches")}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <UserCog className="w-5 h-5 text-accent" />
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted" />
              </div>
              <p className="text-2xl font-bold text-text">{stats?.totalCoaches || 0}</p>
              <p className="text-xs text-text-muted">Coaches</p>
            </CardContent>
          </Card>

          <Card
            className="bg-surface/80 border-border cursor-pointer touch-feedback"
            onClick={() => router.push("/admin/fees")}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-yellow-500" />
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted" />
              </div>
              <p className="text-2xl font-bold text-text">{stats?.pendingFees || 0}</p>
              <p className="text-xs text-text-muted">Cuotas pendientes</p>
            </CardContent>
          </Card>

          <Card className="bg-surface/80 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-success" />
                </div>
              </div>
              <p className="text-2xl font-bold text-text">
                ${stats?.collectedThisMonth?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-text-muted">Cobrado este mes</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Amount Alert */}
        {(stats?.totalPending ?? 0) > 0 && (
          <Card className="bg-yellow-500/10 border-yellow-500/30">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-yellow-500">
                  ${stats?.totalPending?.toLocaleString() ?? 0} pendiente
                </p>
                <p className="text-xs text-text-muted">
                  De {stats?.pendingFees ?? 0} cuotas por cobrar
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-yellow-500 text-yellow-500"
                onClick={() => router.push("/admin/fees")}
              >
                Ver
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-text-muted px-1">Acciones rápidas</h2>

          <Card
            className="bg-surface/80 border-border cursor-pointer touch-feedback"
            onClick={() => router.push("/admin/students/new")}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-text">Nuevo alumno</h3>
                <p className="text-xs text-text-muted">Crear cuenta de alumno</p>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted" />
            </CardContent>
          </Card>

          <Card
            className="bg-surface/80 border-border cursor-pointer touch-feedback"
            onClick={() => router.push("/admin/coaches/new")}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <UserCog className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-text">Nuevo coach</h3>
                <p className="text-xs text-text-muted">Crear cuenta de entrenador</p>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


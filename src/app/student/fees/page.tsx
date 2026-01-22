"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { getStudentFeesWithCoach, getPaymentHistory } from "@/lib/api/student";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt,
  Banknote,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatDate } from "@/lib/utils";
import type { Fee } from "@/types";

interface Payment {
  id: number;
  amount: number;
  method: string;
  status: string;
  date: string;
  feeId: number;
  reference?: string;
}

interface CoachPaymentInfo {
  id: number;
  name?: string;
  paymentAlias?: string;
}

const STATUS_CONFIG = {
  pending: {
    label: "Pendiente",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    icon: Clock,
  },
  paid: {
    label: "Pagada",
    color: "text-success",
    bgColor: "bg-success/10",
    icon: CheckCircle2,
  },
  overdue: {
    label: "Vencida",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    icon: AlertCircle,
  },
  partial: {
    label: "Pago parcial",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    icon: Receipt,
  },
};

export default function FeesPage() {
  const { student } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState<Fee[]>([]);
  const [coach, setCoach] = useState<CoachPaymentInfo | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    const loadData = async () => {
      if (!student?.id) return;

      try {
        setLoading(true);
        const [feesResponse, paymentsData] = await Promise.all([
          getStudentFeesWithCoach(student.id),
          getPaymentHistory(student.id),
        ]);
        setFees(feesResponse.fees || []);
        setCoach(feesResponse.coach || null);
        setPayments(paymentsData || []);
      } catch (error) {
        console.error("Error loading fees:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [student?.id]);

  // Mostrar cuotas vencidas, actuales, o la próxima (si estamos a 5 días del fin de mes)
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const daysUntilEndOfMonth = daysInMonth - today.getDate();
  const showNextMonth = daysUntilEndOfMonth <= 5; // Mostrar próxima cuota si faltan 5 días o menos
  
  // Calcular el mes siguiente
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
  
  const pendingFees = fees.filter((f) => {
    if (f.status === "paid") return false;
    if (f.isOverdue || f.isCurrent) return true;
    // Mostrar la cuota del mes siguiente si estamos a 5 días del fin de mes
    if (showNextMonth && f.month === nextMonth && f.year === nextYear) return true;
    return false;
  });
  const paidFees = fees
    .filter((f) => f.status === "paid")
    .sort((a, b) => {
      // Ordenar de más reciente a más antigua
      if ((b.year || 0) !== (a.year || 0)) return (b.year || 0) - (a.year || 0);
      return (b.month || 0) - (a.month || 0);
    });

  const totalPending = pendingFees.reduce(
    (sum, f) => sum + (f.remainingAmount || (Number(f.value) || 0) - (Number(f.amountPaid) || 0)),
    0
  );

  const handleCopyAlias = (alias: string) => {
    navigator.clipboard.writeText(alias);
    toast.success("Alias copiado al portapapeles");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Cuotas" />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Cuotas" subtitle="Estado de pagos" />

      <div className="px-4 py-4 space-y-4">
        {/* Summary Card */}
        {totalPending > 0 && (
          <Card className="bg-gradient-to-br from-red-500/20 to-surface border-red-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-muted">Total pendiente</p>
                  <p className="text-3xl font-bold text-text">
                    ${totalPending.toLocaleString()}
                  </p>
                  <p className="text-sm text-text-muted mt-1">
                    {pendingFees.length} cuota{pendingFees.length > 1 ? "s" : ""} pendiente
                    {pendingFees.length > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Info - Datos para transferencia */}
        {pendingFees.length > 0 && coach?.paymentAlias && (
          <Card className="bg-gradient-to-br from-accent/20 to-surface border-accent/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Banknote className="w-5 h-5 text-accent" />
                Datos para transferencia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                <div>
                  <p className="text-xs text-text-muted">Alias</p>
                  <p className="font-mono text-lg text-text font-semibold">
                    {coach.paymentAlias}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-accent text-accent hover:bg-accent/10"
                  onClick={() => handleCopyAlias(coach.paymentAlias!)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar
                </Button>
              </div>
              <p className="text-xs text-text-muted text-center">
                📲 Realizá la transferencia y tu profe registrará el pago
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 bg-surface border border-border">
            <TabsTrigger
              value="pending"
              className="data-[state=active]:bg-primary data-[state=active]:text-black"
            >
              <Clock className="w-4 h-4 mr-2" />
              Pendientes ({pendingFees.length})
            </TabsTrigger>
            <TabsTrigger
              value="paid"
              className="data-[state=active]:bg-success data-[state=active]:text-black"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Pagadas ({paidFees.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending Fees */}
          <TabsContent value="pending" className="mt-4 space-y-3">
            {pendingFees.length === 0 ? (
              <Card className="bg-surface/80 border-border">
                <CardContent className="p-6 text-center">
                  <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
                  <h3 className="font-semibold text-text">¡Todo al día!</h3>
                  <p className="text-text-muted text-sm mt-1">
                    No tenés cuotas pendientes
                  </p>
                </CardContent>
              </Card>
            ) : (
              pendingFees.map((fee, index) => {
                const status = STATUS_CONFIG[fee.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                const StatusIcon = status.icon;
                const remaining = fee.remainingAmount || ((Number(fee.value) || 0) - (Number(fee.amountPaid) || 0));

                return (
                  <motion.div
                    key={fee.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="bg-surface/80 border-border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", status.bgColor)}>
                              <StatusIcon className={cn("w-5 h-5", status.color)} />
                            </div>
                            <div>
                              <h3 className="font-medium text-text">{fee.description}</h3>
                              <p className="text-xs text-text-muted flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Vence:{" "}
                                {formatDate(fee.dueDate, {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </p>
                            </div>
                          </div>
                          <Badge className={cn(status.bgColor, status.color, "border-0")}>
                            {status.label}
                          </Badge>
                        </div>

                        <div className="pt-3 border-t border-border">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-text-muted">A pagar:</p>
                            <p className="text-2xl font-bold text-text">
                              ${remaining.toLocaleString()}
                            </p>
                          </div>
                          {(Number(fee.amountPaid) || 0) > 0 && (
                            <p className="text-xs text-text-muted text-right">
                              Ya pagado: ${(Number(fee.amountPaid) || 0).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            )}

          </TabsContent>

          {/* Paid Fees */}
          <TabsContent value="paid" className="mt-4 space-y-3">
            {paidFees.length === 0 ? (
              <Card className="bg-surface/80 border-border">
                <CardContent className="p-6 text-center">
                  <Receipt className="w-12 h-12 text-text-muted mx-auto mb-3" />
                  <p className="text-text-muted text-sm">No hay cuotas pagadas</p>
                </CardContent>
              </Card>
            ) : (
              paidFees.map((fee, index) => (
                <motion.div
                  key={fee.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-surface/80 border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-success" />
                          </div>
                          <div>
                            <h3 className="font-medium text-text">{fee.description}</h3>
                            <p className="text-xs text-text-muted">
                              Pagado:{" "}
                              {formatDate(fee.paidDate || fee.dueDate, {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                        <p className="font-semibold text-text">
                          ${(Number(fee.value) || 0).toLocaleString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}


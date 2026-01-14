"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { getCoachFees, createPayment, notifyOverdueFees } from "@/lib/api/coach";
import api from "@/lib/api";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Calendar,
  User,
  Plus,
  X,
  Bell,
  Send,
  Settings,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Trash2,
  Loader2,
  RefreshCw,
  CalendarPlus,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatDate } from "@/lib/utils";
import type { Fee } from "@/types";

interface PriceSchedule {
  id: number;
  effectiveMonth: number;
  effectiveYear: number;
  amount: number;
  monthName?: string;
  sportPlan?: { id: number; name: string };
  studentName?: string;
}

interface PlanPrice {
  id: number;
  name: string;
  coachPrice?: number;
  defaultPrice?: number;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo" },
  { value: "transfer", label: "Transferencia" },
  { value: "mercadopago", label: "MercadoPago" },
  { value: "other", label: "Otro" },
];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(0, i).toLocaleString("es", { month: "long" }),
}));

const YEAR_OPTIONS = Array.from({ length: 3 }, (_, i) => ({
  value: new Date().getFullYear() + i,
  label: (new Date().getFullYear() + i).toString(),
}));

export default function CoachFeesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState<Fee[]>([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [registeringPayment, setRegisteringPayment] = useState<Fee | null>(null);

  // Payment form
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [notifyingOverdue, setNotifyingOverdue] = useState(false);
  
  // Aumentos programados
  const [showSchedules, setShowSchedules] = useState(false);
  const [schedules, setSchedules] = useState<PriceSchedule[]>([]);
  const [planPrices, setPlanPrices] = useState<PlanPrice[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    effectiveMonth: new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2,
    effectiveYear: new Date().getMonth() + 2 > 12 ? new Date().getFullYear() + 1 : new Date().getFullYear(),
    amount: "",
    sportPlanId: "",
  });
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [applyingIncreases, setApplyingIncreases] = useState(false);
  const [generatingFees, setGeneratingFees] = useState(false);
  
  const dataFetched = useRef(false);

  useEffect(() => {
    if (dataFetched.current) return;
    
    const loadFees = async () => {
      if (!user?.id) return;

      try {
        dataFetched.current = true;
        setLoading(true);
        const data = await getCoachFees();
        setFees(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error loading fees:", error);
        dataFetched.current = false;
      } finally {
        setLoading(false);
      }
    };

    loadFees();
  }, [user?.id]);

  // Cargar aumentos cuando se expande la sección
  useEffect(() => {
    if (showSchedules && schedules.length === 0) {
      loadSchedules();
    }
  }, [showSchedules]);

  const loadSchedules = async () => {
    try {
      setLoadingSchedules(true);
      const [schedulesRes, pricesRes] = await Promise.all([
        api.get("/fee/price-schedule"),
        api.get("/fee/coach/plan-prices").catch(() => ({ data: [] })),
      ]);
      setSchedules(schedulesRes.data.schedules || []);
      setPlanPrices(pricesRes.data || []);
    } catch (error) {
      console.error("Error loading schedules:", error);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!newSchedule.amount || parseFloat(newSchedule.amount) <= 0) {
      toast.error("Ingresá un monto válido");
      return;
    }

    try {
      setSavingSchedule(true);
      await api.post("/fee/price-schedule", {
        effectiveMonth: newSchedule.effectiveMonth,
        effectiveYear: newSchedule.effectiveYear,
        amount: parseFloat(newSchedule.amount),
        sportPlanId: newSchedule.sportPlanId ? parseInt(newSchedule.sportPlanId) : undefined,
      });
      toast.success("Aumento programado");
      setNewSchedule({ ...newSchedule, amount: "", sportPlanId: "" });
      loadSchedules();
    } catch (error: any) {
      console.error("Error creating schedule:", error);
      toast.error(error.response?.data?.message || "Error al programar aumento");
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleCancelSchedule = async (id: number) => {
    try {
      await api.delete(`/fee/price-schedule/${id}`);
      toast.success("Aumento cancelado");
      setSchedules((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error("Error canceling schedule:", error);
      toast.error("Error al cancelar aumento");
    }
  };

  const handleApplyIncreases = async () => {
    try {
      setApplyingIncreases(true);
      const { data } = await api.post("/fee/coach/apply-increases");
      toast.success(data.message || "Aumentos aplicados");
      // Recargar cuotas
      const feesData = await getCoachFees();
      setFees(Array.isArray(feesData) ? feesData : []);
    } catch (error) {
      console.error("Error applying increases:", error);
      toast.error("Error al aplicar aumentos");
    } finally {
      setApplyingIncreases(false);
    }
  };

  const handleGenerateFutureFees = async () => {
    try {
      setGeneratingFees(true);
      const { data } = await api.post("/fee/coach/generate-future-fees");
      toast.success(data.message || "Cuotas generadas");
      // Recargar cuotas
      const feesData = await getCoachFees();
      setFees(Array.isArray(feesData) ? feesData : []);
    } catch (error) {
      console.error("Error generating fees:", error);
      toast.error("Error al generar cuotas");
    } finally {
      setGeneratingFees(false);
    }
  };

  const feesArray = Array.isArray(fees) ? fees : [];
  const pendingFees = feesArray.filter(
    (f) => f.status === "pending" || f.status === "overdue" || f.status === "partial"
  );
  const paidFees = feesArray.filter((f) => f.status === "paid" || f.status === "completed");

  // Agrupar cuotas pagadas por mes (últimos 3 meses)
  const paidFeesByMonth = useMemo(() => {
    // Ordenar por año y mes descendente
    const sorted = [...paidFees].sort((a, b) => {
      if ((b.year || 0) !== (a.year || 0)) return (b.year || 0) - (a.year || 0);
      return (b.month || 0) - (a.month || 0);
    });

    // Agrupar por mes/año
    const grouped: Record<string, Fee[]> = {};
    for (const fee of sorted) {
      const key = `${fee.year}-${fee.month}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(fee);
    }

    // Convertir a array y tomar solo los últimos 3 meses
    const months = Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 3);

    return months;
  }, [paidFees]);

  // El API puede devolver 'value' o 'amount', y 'remainingAmount' ya calculado
  const totalPending = pendingFees.reduce(
    (sum, f) => sum + (f.remainingAmount || f.value || f.amount || 0),
    0
  );

  const handleRegisterPayment = async () => {
    if (!registeringPayment) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Ingresá un monto válido");
      return;
    }

    if (!paymentMethod) {
      toast.error("Seleccioná un método de pago");
      return;
    }

    setSavingPayment(true);
    try {
      await createPayment({
        feeId: registeringPayment.id,
        studentId: registeringPayment.studentId,
        amount,
        paymentMethod,
        reference: paymentReference || undefined,
      });

      toast.success("Pago registrado exitosamente");

      // Refresh fees
      const data = await getCoachFees();
      setFees(data || []);

      // Reset form
      setRegisteringPayment(null);
      setPaymentAmount("");
      setPaymentMethod("");
      setPaymentReference("");
    } catch (error) {
      console.error("Error registering payment:", error);
      toast.error("Error al registrar el pago");
    } finally {
      setSavingPayment(false);
    }
  };

  const openPaymentForm = (fee: Fee) => {
    setRegisteringPayment(fee);
    const feeAmount = fee.value || fee.amount || 0;
    setPaymentAmount((feeAmount - (fee.amountPaid || 0)).toString());
  };

  // Contar cuotas realmente vencidas (fecha pasada)
  const overdueFees = pendingFees.filter((fee) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = fee.dueDate ? new Date(fee.dueDate + "T00:00:00") : null;
    return dueDate && dueDate < today;
  });

  const handleNotifyOverdue = async () => {
    if (overdueFees.length === 0) {
      toast.info("No hay cuotas vencidas para notificar");
      return;
    }

    setNotifyingOverdue(true);
    try {
      const result = await notifyOverdueFees();
      if (result.notified > 0) {
        toast.success(
          `Se notificaron ${result.notified} alumno(s) con cuotas vencidas`,
          { duration: 4000 }
        );
      } else {
        toast.info(result.message);
      }
    } catch (error) {
      console.error("Error notifying overdue fees:", error);
      toast.error("Error al enviar notificaciones");
    } finally {
      setNotifyingOverdue(false);
    }
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
      <PageHeader 
        title="Cuotas" 
        subtitle="Gestión de pagos"
        rightContent={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/coach/payment-settings")}
            className="text-primary"
          >
            <Settings className="w-5 h-5" />
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Summary */}
        <Card className="bg-gradient-to-br from-primary/20 to-surface border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Total pendiente</p>
                <p className="text-3xl font-bold text-text">
                  ${totalPending.toLocaleString()}
                </p>
                <p className="text-sm text-text-muted mt-1">
                  {pendingFees.length} cuota{pendingFees.length !== 1 ? "s" : ""} por cobrar
                </p>
              </div>
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                <DollarSign className="w-7 h-7 text-primary" />
              </div>
            </div>
            
            {/* Botón para notificar cuotas vencidas */}
            {overdueFees.length > 0 && (
              <div className="mt-4 pt-4 border-t border-primary/20">
                <Button
                  onClick={handleNotifyOverdue}
                  disabled={notifyingOverdue}
                  className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/30"
                  variant="outline"
                >
                  {notifyingOverdue ? (
                    <>
                      <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin mr-2" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4 mr-2" />
                      Notificar {overdueFees.length} alumno{overdueFees.length !== 1 ? "s" : ""} con cuota vencida
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sección de Aumentos Programados */}
        <div>
          <Button
            variant="outline"
            className="w-full justify-between border-success/30 text-success hover:bg-success/10"
            onClick={() => setShowSchedules(!showSchedules)}
          >
            <span className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Programar Aumentos
            </span>
            {showSchedules ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
          <AnimatePresence>
            {showSchedules && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card className="mt-3 bg-surface/80 border-success/30">
                  <CardContent className="p-4 space-y-4">
                    <p className="text-sm text-text-muted">
                      Programá un aumento que se aplicará automáticamente a las cuotas futuras.
                    </p>

                    {/* Formulario */}
                    <div className="space-y-3">
                      {/* Selector de plan */}
                      <Select
                        value={newSchedule.sportPlanId || "all"}
                        onValueChange={(v) =>
                          setNewSchedule({ ...newSchedule, sportPlanId: v === "all" ? "" : v })
                        }
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Todos los planes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los planes</SelectItem>
                          {planPrices.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id.toString()}>
                              {plan.name} (${(plan.coachPrice || plan.defaultPrice)?.toLocaleString()})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          value={newSchedule.effectiveMonth.toString()}
                          onValueChange={(v) =>
                            setNewSchedule({ ...newSchedule, effectiveMonth: parseInt(v) })
                          }
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTH_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value.toString()}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={newSchedule.effectiveYear.toString()}
                          onValueChange={(v) =>
                            setNewSchedule({ ...newSchedule, effectiveYear: parseInt(v) })
                          }
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {YEAR_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value.toString()}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                          $
                        </span>
                        <Input
                          type="number"
                          placeholder="Nuevo monto"
                          value={newSchedule.amount}
                          onChange={(e) =>
                            setNewSchedule({ ...newSchedule, amount: e.target.value })
                          }
                          className="bg-background pl-7"
                        />
                      </div>

                      <Button
                        onClick={handleCreateSchedule}
                        disabled={savingSchedule || !newSchedule.amount}
                        className="w-full bg-success hover:bg-success/90 text-black"
                      >
                        {savingSchedule ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Plus className="w-4 h-4 mr-2" />
                        )}
                        Programar Aumento
                      </Button>
                    </div>

                    {/* Acciones rápidas */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleApplyIncreases}
                        disabled={applyingIncreases}
                        className="flex-1 text-xs"
                      >
                        {applyingIncreases ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <RefreshCw className="w-3 h-3 mr-1" />
                        )}
                        Aplicar a Pendientes
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateFutureFees}
                        disabled={generatingFees}
                        className="flex-1 text-xs"
                      >
                        {generatingFees ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <CalendarPlus className="w-3 h-3 mr-1" />
                        )}
                        Generar Cuotas
                      </Button>
                    </div>
                    <p className="text-xs text-text-muted">
                      💡 "Aplicar" actualiza cuotas pendientes. "Generar" crea cuotas para los próximos 3 meses.
                    </p>

                    {/* Lista de aumentos programados */}
                    {loadingSchedules ? (
                      <Skeleton className="h-20 w-full" />
                    ) : schedules.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-text-muted">
                          📋 Aumentos programados:
                        </p>
                        {schedules.map((schedule) => (
                          <div
                            key={schedule.id}
                            className="flex items-center justify-between p-3 bg-success/5 border border-success/20 rounded-lg"
                          >
                            <div>
                              <p className="text-sm text-text">
                                Desde {schedule.monthName} {schedule.effectiveYear}
                              </p>
                              <p className="text-lg font-bold text-success">
                                ${schedule.amount.toLocaleString()}
                              </p>
                              {schedule.sportPlan ? (
                                <p className="text-xs text-primary">
                                  📋 {schedule.sportPlan.name}
                                </p>
                              ) : (
                                <p className="text-xs text-text-muted">
                                  Todos los planes
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCancelSchedule(schedule.id)}
                              className="text-red-500 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-info/10 border border-info/30 rounded-lg">
                        <p className="text-xs text-info flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          No tenés aumentos programados. Creá uno para que se aplique automáticamente.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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

          {/* Pending */}
          <TabsContent value="pending" className="mt-4 space-y-3">
            {pendingFees.length === 0 ? (
              <Card className="bg-surface/80 border-border">
                <CardContent className="p-6 text-center">
                  <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
                  <h3 className="font-semibold text-text">¡Todo al día!</h3>
                  <p className="text-text-muted text-sm mt-1">
                    No hay cuotas pendientes de cobro
                  </p>
                </CardContent>
              </Card>
            ) : (
              pendingFees.map((fee, index) => {
                const feeAmount = fee.value || fee.amount || 0;
                const remaining = fee.remainingAmount || (feeAmount - (fee.amountPaid || 0));
                // Verificar si está vencida: API isOverdue O fecha pasada
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dueDate = fee.dueDate ? new Date(fee.dueDate + "T00:00:00") : null;
                const isOverdue = fee.status === "overdue" || fee.isOverdue || (dueDate && dueDate < today);

                return (
                  <motion.div
                    key={fee.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className={cn(
                        "bg-surface/80 border-border",
                        isOverdue && "border-red-500/30"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center",
                                isOverdue ? "bg-red-500/20" : "bg-yellow-500/20"
                              )}
                            >
                              {isOverdue ? (
                                <AlertCircle className="w-5 h-5 text-red-500" />
                              ) : (
                                <Clock className="w-5 h-5 text-yellow-500" />
                              )}
                            </div>
                            <div>
                              <h3 className="font-medium text-text">
                                {fee.studentName || fee.description || "Alumno"}
                              </h3>
                              <p className="text-xs text-text-muted">
                                {fee.monthName} {fee.year} • {fee.sportName || fee.sportPlanName || ""}
                              </p>
                            </div>
                          </div>
                          <Badge
                            className={cn(
                              "text-xs",
                              isOverdue
                                ? "bg-red-500/20 text-red-500"
                                : "bg-yellow-500/20 text-yellow-500"
                            )}
                          >
                            {isOverdue ? "Vencida" : "Pendiente"}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-text-muted flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Vence:{" "}
                              {formatDate(fee.dueDate, {
                                day: "numeric",
                                month: "short",
                              })}
                            </p>
                            <p className="text-xl font-bold text-text mt-1">
                              ${remaining.toLocaleString()}
                            </p>
                          </div>
                          <Button
                            className="bg-gradient-to-r from-primary to-primary-hover text-black"
                            onClick={() => openPaymentForm(fee)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Registrar pago
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </TabsContent>

          {/* Paid */}
          <TabsContent value="paid" className="mt-4 space-y-4">
            {paidFeesByMonth.length === 0 ? (
              <Card className="bg-surface/80 border-border">
                <CardContent className="p-6 text-center">
                  <CreditCard className="w-12 h-12 text-text-muted mx-auto mb-3" />
                  <p className="text-text-muted text-sm">No hay cuotas pagadas</p>
                </CardContent>
              </Card>
            ) : (
              paidFeesByMonth.map(([monthKey, monthFees], groupIndex) => {
                const [year, month] = monthKey.split("-").map(Number);
                const monthNames = [
                  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
                ];
                const monthName = monthNames[month - 1];
                const totalMonth = monthFees.reduce(
                  (sum, f) => sum + (f.value || f.amount || 0), 0
                );

                return (
                  <motion.div
                    key={monthKey}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: groupIndex * 0.1 }}
                  >
                    {/* Header del mes */}
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-text">
                        {monthName} {year}
                      </h3>
                      <Badge className="bg-success/20 text-success">
                        ${totalMonth.toLocaleString()}
                      </Badge>
                    </div>

                    {/* Cuotas del mes */}
                    <Card className="bg-surface/80 border-border">
                      <CardContent className="p-0 divide-y divide-border">
                        {monthFees.map((fee) => (
                          <div
                            key={fee.id}
                            className="flex items-center justify-between px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <CheckCircle2 className="w-4 h-4 text-success" />
                              <span className="text-sm text-text">
                                {fee.studentName || "Alumno"}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-text">
                              ${(fee.value || fee.amount || 0).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Payment Dialog */}
      <Dialog 
        open={!!registeringPayment} 
        onOpenChange={(open) => !open && setRegisteringPayment(null)}
      >
        <DialogContent className="sm:max-w-md bg-surface border-border">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>

          {registeringPayment && (
            <div className="space-y-4">
              <div className="p-3 bg-background/50 rounded-lg">
                <p className="font-medium text-text">
                  {registeringPayment.studentName || "Alumno"}
                </p>
                <p className="text-xs text-text-muted">
                  {registeringPayment.monthName} {registeringPayment.year}
                </p>
              </div>

              <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                <p className="text-xs text-text-muted mb-1">Monto a cobrar</p>
                <p className="text-2xl font-bold text-primary">
                  ${Number(paymentAmount).toLocaleString()}
                </p>
              </div>

              <div>
                <Label className="text-text-muted text-sm">Método de pago</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-text-muted text-sm">Referencia (opcional)</Label>
                <Input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Nro. de transferencia, etc."
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setRegisteringPayment(null)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-primary to-primary-hover text-black"
                  disabled={savingPayment}
                  onClick={handleRegisterPayment}
                >
                  {savingPayment ? "Guardando..." : "Confirmar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


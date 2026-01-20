"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import api from "@/lib/api";
import {
  getStudentById,
  getStudentWeightStats,
  getStudentStepsStats,
  getStudentNotes,
} from "@/lib/api/coach";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Scale,
  Footprints,
  Dumbbell,
  Utensils,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Settings,
  MessageSquare,
  CreditCard,
  BarChart3,
  Calendar,
  History,
  Edit,
  Loader2,
  Package,
  DollarSign,
  Pause,
  Play,
  AlertTriangle,
  Bike,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import type { Student } from "@/types";
import { StudentPermissions } from "@/components/coach/StudentPermissions";

interface PlanPrice {
  id: number;
  name: string;
  sport?: { name: string };
  weeklyFrequency: number;
  coachPrice?: number;
  defaultPrice?: number;
}

interface WeightStats {
  currentWeight: number | null;
  initialWeight: number | null;
  weightChange: number | null;
  weeklyTrend: number | null;
  totalDays: number;
  lastUpdated?: string;
}

interface StepsStats {
  dailyGoal: number;
  totalSteps: number;
  daysWithData: number;
  weeklyAverage: number;
  weekStart?: string;
  weekEnd?: string;
}

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = Number(params.studentId);

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [weightStats, setWeightStats] = useState<WeightStats | null>(null);
  const [stepsStats, setStepsStats] = useState<StepsStats | null>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const dataFetched = useRef(false);

  // Modal cambiar plan
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<PlanPrice[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);
  const [coachPlanPrice, setCoachPlanPrice] = useState<number | null>(null);
  const [priceSchedules, setPriceSchedules] = useState<any[]>([]);
  // Fecha de inicio para primera asignación de plan
  const [planStartDate, setPlanStartDate] = useState<string>("");
  const [planStartDateDisplay, setPlanStartDateDisplay] = useState<string>("");
  const planStartDateRef = useRef<HTMLInputElement>(null);

  // Pausar / Reactivar alumno
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [newStartDate, setNewStartDate] = useState<string>("");
  const [newStartDateDisplay, setNewStartDateDisplay] = useState<string>("");
  const [pausingStudent, setPausingStudent] = useState(false);
  const [reactivatingStudent, setReactivatingStudent] = useState(false);
  const [reactivatePlanId, setReactivatePlanId] = useState<string>("");
  const [changePlanOnReactivate, setChangePlanOnReactivate] = useState(false);
  const [reactivatePlans, setReactivatePlans] = useState<PlanPrice[]>([]);
  const [loadingReactivatePlans, setLoadingReactivatePlans] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (dataFetched.current) return;
      dataFetched.current = true;

      try {
        setLoading(true);
        const [studentData, weightData, stepsData, notesData, planPricesData] = await Promise.all([
          getStudentById(studentId),
          getStudentWeightStats(studentId).catch((e) => {
            console.error("Error fetching weight stats:", e);
            return null;
          }),
          getStudentStepsStats(studentId).catch((e) => {
            console.error("Error fetching steps stats:", e);
            return null;
          }),
          getStudentNotes(studentId).catch(() => []),
          api.get("/fee/coach/plan-prices").catch(() => ({ data: [] })),
        ]);
        setStudent(studentData);
        setWeightStats(weightData);
        setStepsStats(stepsData);
        setNotes(notesData);
        
        // Buscar el precio del coach para el plan del alumno
        if (studentData?.sportPlan?.id && planPricesData?.data) {
          const planPrice = planPricesData.data.find(
            (p: PlanPrice) => p.id === studentData?.sportPlan?.id
          );
          if (planPrice) {
            setCoachPlanPrice(planPrice.coachPrice || planPrice.defaultPrice || null);
          }
        }
      } catch (error) {
        console.error("Error loading student:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [studentId]);

  const handleOpenChangePlan = async () => {
    setShowChangePlan(true);
    setLoadingPlans(true);
    try {
      const [plansRes, schedulesRes] = await Promise.all([
        api.get("/fee/coach/plan-prices"),
        api.get("/fee/price-schedule").catch(() => ({ data: { schedules: [] } })),
      ]);
      setAvailablePlans(plansRes.data || []);
      setPriceSchedules(schedulesRes.data?.schedules || []);
      // Pre-seleccionar el plan actual si existe
      if (student?.sportPlan?.id) {
        setSelectedPlanId(student.sportPlan.id.toString());
      }
    } catch (error) {
      console.error("Error loading plans:", error);
      toast.error("Error al cargar planes");
    } finally {
      setLoadingPlans(false);
    }
  };

  // Buscar el próximo aumento programado para un plan
  const getScheduledIncrease = (planId: number) => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Primero buscar aumento específico para este plan
    const specificSchedule = priceSchedules.find((s) => {
      const isForThisPlan = s.sportPlanId === planId;
      const isFuture =
        s.effectiveYear > currentYear ||
        (s.effectiveYear === currentYear && s.effectiveMonth > currentMonth);
      return isForThisPlan && isFuture;
    });

    if (specificSchedule) return specificSchedule;

    // Si no hay específico, buscar aumento general (aplica a todos los planes)
    const generalSchedule = priceSchedules.find((s) => {
      const isGeneral = !s.sportPlanId && s.appliesToAll;
      const isFuture =
        s.effectiveYear > currentYear ||
        (s.effectiveYear === currentYear && s.effectiveMonth > currentMonth);
      return isGeneral && isFuture;
    });

    return generalSchedule;
  };

  const handleConfirmChangePlan = async () => {
    if (!selectedPlanId) {
      toast.error("Seleccioná un plan");
      return;
    }

    // Si es primera asignación, requerir fecha de inicio
    const isFirstAssignment = !student?.sportPlan;
    if (isFirstAssignment && !planStartDate) {
      toast.error("Seleccioná la fecha de inicio del alumno");
      return;
    }

    // Si es el mismo plan, cerrar
    if (student?.sportPlan?.id?.toString() === selectedPlanId) {
      setShowChangePlan(false);
      return;
    }

    setChangingPlan(true);
    try {
      const { data } = await api.put(`/students/${studentId}/change-plan`, {
        sportPlanId: parseInt(selectedPlanId),
        ...(isFirstAssignment && planStartDate ? { startDate: planStartDate } : {}),
      });
      toast.success(data.message || "Plan actualizado");
      setShowChangePlan(false);
      setPlanStartDate("");
      setPlanStartDateDisplay("");
      // Recargar datos del alumno
      const updatedStudent = await getStudentById(studentId);
      setStudent(updatedStudent);
      
      // Actualizar el precio mostrado
      const selectedPlan = availablePlans.find(p => p.id.toString() === selectedPlanId);
      if (selectedPlan) {
        setCoachPlanPrice(selectedPlan.coachPrice || selectedPlan.defaultPrice || null);
      }
    } catch (error: any) {
      console.error("Error changing plan:", error);
      toast.error(error.response?.data?.message || "Error al cambiar plan");
    } finally {
      setChangingPlan(false);
    }
  };

  // ========== PAUSAR / REACTIVAR ==========

  const handlePauseStudent = async () => {
    setPausingStudent(true);
    try {
      const { data } = await api.post(`/students/${studentId}/pause`);
      toast.success(data.message || "Alumno pausado correctamente");
      setShowPauseDialog(false);
      // Recargar datos del alumno
      const updatedStudent = await getStudentById(studentId);
      setStudent(updatedStudent);
    } catch (error: any) {
      console.error("Error pausing student:", error);
      toast.error(error.response?.data?.message || "Error al pausar alumno");
    } finally {
      setPausingStudent(false);
    }
  };

  const [reactivatePriceSchedules, setReactivatePriceSchedules] = useState<any[]>([]);

  const handleChangePlanOnReactivateToggle = async (checked: boolean) => {
    setChangePlanOnReactivate(checked);
    if (checked && reactivatePlans.length === 0) {
      setLoadingReactivatePlans(true);
      try {
        const [plansRes, schedulesRes] = await Promise.all([
          api.get("/fee/coach/plan-prices"),
          api.get("/fee/price-schedule").catch(() => ({ data: { schedules: [] } })),
        ]);
        setReactivatePlans(plansRes.data || []);
        setReactivatePriceSchedules(schedulesRes.data?.schedules || []);
      } catch (error) {
        console.error("Error loading plans:", error);
        toast.error("Error al cargar planes");
      } finally {
        setLoadingReactivatePlans(false);
      }
    }
    if (!checked) {
      setReactivatePlanId("");
    }
  };

  // Obtener el precio efectivo considerando aumentos programados
  const getEffectivePrice = (plan: PlanPrice, schedules: any[]): { price: number; hasIncrease: boolean; increaseMonth?: string } => {
    const basePrice = plan.coachPrice || plan.defaultPrice || 0;
    
    // Buscar si hay un aumento programado para este plan
    const now = new Date();
    const targetMonth = newStartDate ? new Date(newStartDate).getMonth() + 1 : now.getMonth() + 2; // Mes de la fecha de inicio o próximo mes
    const targetYear = newStartDate ? new Date(newStartDate).getFullYear() : now.getFullYear();
    
    const applicableSchedule = schedules.find((s: any) => {
      const isForThisPlan = s.sportPlanId === plan.id || s.sportPlanId === null;
      const isForTargetMonth = s.effectiveMonth === targetMonth && s.effectiveYear === targetYear;
      return isForThisPlan && isForTargetMonth;
    });
    
    if (applicableSchedule) {
      const monthNames = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      return {
        price: applicableSchedule.amount,
        hasIncrease: true,
        increaseMonth: `${monthNames[applicableSchedule.effectiveMonth]} ${applicableSchedule.effectiveYear}`,
      };
    }
    
    return { price: basePrice, hasIncrease: false };
  };

  // Helpers para formato de fecha dd/mm/yyyy
  const formatDateToDisplay = (isoDate: string): string => {
    if (!isoDate) return "";
    const [year, month, day] = isoDate.split("-");
    return `${day}/${month}/${year}`;
  };

  const formatDateToISO = (displayDate: string): string => {
    const parts = displayDate.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    return "";
  };

  const handleReactivateStudent = async () => {
    if (!newStartDate) {
      toast.error("Seleccioná una fecha de inicio");
      return;
    }

    setReactivatingStudent(true);
    try {
      // Si se seleccionó cambiar el plan, hacerlo primero
      if (changePlanOnReactivate && reactivatePlanId) {
        await api.put(`/students/${studentId}/change-plan`, {
          sportPlanId: Number(reactivatePlanId),
        });
      }

      const { data } = await api.post(`/students/${studentId}/reactivate`, {
        newStartDate,
      });
      toast.success(data.message || "Alumno reactivado correctamente");
      setShowReactivateDialog(false);
      setNewStartDate("");
      setReactivatePlanId("");
      setChangePlanOnReactivate(false);
      
      // Recargar datos del alumno y precios
      const [updatedStudent, planPricesData] = await Promise.all([
        getStudentById(studentId),
        api.get("/fee/coach/plan-prices").catch(() => ({ data: [] })),
      ]);
      setStudent(updatedStudent);
      
      // Actualizar el precio del plan
      if (updatedStudent?.sportPlan?.id && planPricesData?.data) {
        const planPrice = planPricesData.data.find(
          (p: PlanPrice) => p.id === updatedStudent?.sportPlan?.id
        );
        if (planPrice) {
          setCoachPlanPrice(planPrice.coachPrice || planPrice.defaultPrice || null);
        }
      }
    } catch (error: any) {
      console.error("Error reactivating student:", error);
      toast.error(error.response?.data?.message || "Error al reactivar alumno");
    } finally {
      setReactivatingStudent(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Cargando..." backHref="/coach/students" />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Error" backHref="/coach/students" />
        <div className="px-4 py-12 text-center">
          <p className="text-text-muted">No se encontró el alumno</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title={`${student.firstName} ${student.lastName}`}
        backHref="/coach/students"
        rightContent={
          <Button
            size="icon"
            variant="ghost"
            onClick={() => router.push(`/coach/students/${studentId}/settings`)}
          >
            <Settings className="w-5 h-5" />
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Student Profile Card */}
        <Card className="bg-gradient-to-br from-primary/20 to-surface border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary-hover text-black text-xl font-bold">
                  {student.firstName?.[0]}{student.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-text">
                  {student.firstName} {student.lastName}
                </h2>
                <p className="text-sm text-text-muted">{student.email}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {student.objective && (
                    <Badge variant="outline" className="text-xs capitalize">
                      {student.objective}
                    </Badge>
                  )}
                  <Badge
                    className={cn(
                      "text-xs",
                      student.isActive
                        ? "bg-success/20 text-success"
                        : "bg-red-500/20 text-red-500"
                    )}
                  >
                    {student.isActive ? "Activo" : "Pausado"}
                  </Badge>
                  
                  {/* Botón Pausar/Reactivar */}
                  {student.isActive ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowPauseDialog(true)}
                      className="h-6 text-xs border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10"
                    >
                      <Pause className="w-3 h-3 mr-1" />
                      Pausar
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNewStartDate(new Date().toISOString().split("T")[0]);
                        setShowReactivateDialog(true);
                      }}
                      className="h-6 text-xs border-success/30 text-success hover:bg-success/10"
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Reactivar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plan Deportivo */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-text-muted">Plan Deportivo</p>
                  {student.sportPlan ? (
                    <>
                      <p className="font-medium text-text">
                        {student.sportPlan.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-xs">
                          {student.sportPlan.weeklyFrequency}x/sem
                        </Badge>
                        {(coachPlanPrice || student.sportPlan.monthlyFee) && (
                          <span className="text-xs text-success flex items-center gap-0.5">
                            <DollarSign className="w-3 h-3" />
                            {(coachPlanPrice || student.sportPlan.monthlyFee)?.toLocaleString()}/mes
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-text-muted">Sin plan asignado</p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenChangePlan}
                className="border-primary/30 text-primary hover:bg-primary/10"
              >
                <Edit className="w-4 h-4 mr-1" />
                {student.sportPlan ? "Cambiar" : "Asignar"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Weight */}
          <Card
            className="bg-surface/80 border-border cursor-pointer touch-feedback"
            onClick={() => router.push(`/coach/students/${studentId}/progress`)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Scale className="w-4 h-4 text-primary" />
                <span className="text-xs text-text-muted">Peso</span>
              </div>
              <p className="text-xl font-bold text-text">
                {weightStats?.currentWeight != null 
                  ? `${Number(weightStats.currentWeight).toFixed(1)} kg` 
                  : "-- kg"}
              </p>
              {weightStats?.weeklyTrend != null && weightStats.weeklyTrend !== 0 && (
                <div className="flex items-center gap-1 mt-1">
                  {weightStats.weeklyTrend < 0 ? (
                    <TrendingDown className="w-3 h-3 text-success" />
                  ) : (
                    <TrendingUp className="w-3 h-3 text-warning" />
                  )}
                  <span
                    className={cn(
                      "text-xs",
                      weightStats.weeklyTrend < 0 ? "text-success" : "text-warning"
                    )}
                  >
                    {weightStats.weeklyTrend > 0 ? "+" : ""}
                    {Number(weightStats.weeklyTrend).toFixed(1)} kg/sem
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Steps */}
          <Card
            className="bg-surface/80 border-border cursor-pointer touch-feedback"
            onClick={() => router.push(`/coach/students/${studentId}/progress`)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Footprints className="w-4 h-4 text-accent" />
                <span className="text-xs text-text-muted">Pasos/día</span>
              </div>
              <p className="text-xl font-bold text-text">
                {stepsStats?.weeklyAverage != null 
                  ? Math.round(stepsStats.weeklyAverage).toLocaleString() 
                  : "--"}
              </p>
              {stepsStats?.dailyGoal && (
                <p className="text-xs text-text-muted mt-1">
                  Meta: {stepsStats.dailyGoal.toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <QuickActionCard
            icon={<Dumbbell className="w-5 h-5 text-primary" />}
            title="Rutina"
            subtitle="Ver o asignar rutina"
            onClick={() => router.push(`/coach/students/${studentId}/routine`)}
          />
          <QuickActionCard
            icon={<History className="w-5 h-5 text-purple-400" />}
            title="Historial de Entrenamientos"
            subtitle="Progreso por ejercicio y sesiones"
            onClick={() => router.push(`/coach/students/${studentId}/history`)}
          />
          <QuickActionCard
            icon={<Utensils className="w-5 h-5 text-accent" />}
            title="Nutrición"
            subtitle="Ver alimentación y macros"
            onClick={() => router.push(`/coach/students/${studentId}/nutrition`)}
          />
          <QuickActionCard
            icon={<BarChart3 className="w-5 h-5 text-blue-400" />}
            title="Progreso Detallado"
            subtitle="Gráficos de 20 semanas"
            onClick={() => router.push(`/coach/students/${studentId}/progress`)}
          />
          <QuickActionCard
            icon={<Bike className="w-5 h-5 text-orange-400" />}
            title="Cardio"
            subtitle="Pasos y actividades aeróbicas"
            onClick={() => router.push(`/coach/students/${studentId}/cardio`)}
          />
          <QuickActionCard
            icon={<CreditCard className="w-5 h-5 text-yellow-500" />}
            title="Cuotas"
            subtitle="Estado de pagos"
            onClick={() => router.push(`/coach/fees`)}
          />
        </div>

        {/* Recent Notes */}
        {notes.length > 0 && (
          <Card className="bg-surface/80 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-text-muted" />
                Notas recientes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border">
              {notes.slice(0, 5).map((note, index) => (
                <div 
                  key={index} 
                  className="px-4 py-3 cursor-pointer hover:bg-background/30 transition-colors"
                  onClick={() => note.microcycleId && router.push(`/coach/microcycle/${note.microcycleId}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text">
                        {note.exerciseName}
                      </p>
                      <p className="text-sm text-text-muted mt-1 line-clamp-2">
                        "{note.note}"
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-text-muted/70">
                        {note.load && <span>{note.load}kg</span>}
                        {note.reps && <span>× {note.reps} reps</span>}
                        <span>•</span>
                        <span>
                          {formatDate(note.date, {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0 mt-1" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Student Permissions */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-4">
            <StudentPermissions studentId={studentId} />
          </CardContent>
        </Card>
      </div>

      {/* Modal Cambiar Plan */}
      <Dialog open={showChangePlan} onOpenChange={setShowChangePlan}>
        <DialogContent className="sm:max-w-md bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Cambiar Plan de {student?.firstName}
            </DialogTitle>
          </DialogHeader>

          {loadingPlans ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : availablePlans.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-text-muted">
                No tenés planes configurados.
              </p>
              <Button
                variant="link"
                onClick={() => {
                  setShowChangePlan(false);
                  router.push("/coach/payment-settings");
                }}
                className="text-primary mt-2"
              >
                Ir a Configurar Pagos
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-text-muted">
                Seleccioná el nuevo plan para este alumno:
              </p>
              
              <div className="space-y-2">
                {availablePlans.map((plan) => {
                  const price = plan.coachPrice || plan.defaultPrice || 0;
                  const isCurrentPlan = student?.sportPlan?.id === plan.id;
                  const isSelected = selectedPlanId === plan.id.toString();
                  const scheduledIncrease = getScheduledIncrease(plan.id);
                  
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id.toString())}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background/50 hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                            isSelected ? "border-primary" : "border-text-muted"
                          )}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-text">{plan.name}</p>
                          <p className="text-xs text-text-muted">
                            {plan.sport?.name} • {plan.weeklyFrequency}x/sem
                          </p>
                          {isCurrentPlan && (
                            <Badge className="mt-1 text-xs bg-success/20 text-success">
                              Plan actual
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-success">
                          ${price.toLocaleString()}
                        </span>
                        {scheduledIncrease && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-primary">
                            <TrendingUp className="w-3 h-3" />
                            <span>
                              {scheduledIncrease.monthName}: ${Number(scheduledIncrease.amount).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Fecha de inicio - solo para primera asignación */}
              {!student?.sportPlan && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <label className="text-sm font-medium text-text flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Fecha de inicio del alumno *
                  </label>
                  <p className="text-xs text-text-muted">
                    Las cuotas se generarán a partir de esta fecha
                  </p>
                  <div 
                    className="relative flex items-center bg-background border border-border rounded-md px-3 py-2 cursor-pointer hover:border-primary transition-colors"
                    onClick={() => planStartDateRef.current?.showPicker()}
                  >
                    <Calendar className="w-4 h-4 text-text-muted mr-2" />
                    <span className={`flex-1 ${planStartDateDisplay ? "text-text" : "text-text-muted"}`}>
                      {planStartDateDisplay || "dd/mm/aaaa"}
                    </span>
                    <input
                      ref={planStartDateRef}
                      type="date"
                      value={planStartDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          setPlanStartDate(e.target.value);
                          setPlanStartDateDisplay(formatDateToDisplay(e.target.value));
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowChangePlan(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-primary to-primary-hover text-black"
                  onClick={handleConfirmChangePlan}
                  disabled={changingPlan || !selectedPlanId}
                >
                  {changingPlan ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  {changingPlan ? "Cambiando..." : "Confirmar Cambio"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Pausar Alumno */}
      <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <DialogContent className="sm:max-w-md bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pause className="w-5 h-5 text-yellow-500" />
              Pausar Alumno
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-text">
                    ¿Seguro que querés pausar a <strong>{student?.firstName} {student?.lastName}</strong>?
                  </p>
                  <p className="text-xs text-text-muted mt-2">
                    Al pausar un alumno:
                  </p>
                  <ul className="text-xs text-text-muted mt-1 space-y-1 list-disc list-inside">
                    <li>No se generarán nuevas cuotas</li>
                    <li>Dejará de aparecer como activo</li>
                    <li>Podrás reactivarlo cuando vuelva</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPauseDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
                onClick={handlePauseStudent}
                disabled={pausingStudent}
              >
                {pausingStudent ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Pause className="w-4 h-4 mr-2" />
                )}
                {pausingStudent ? "Pausando..." : "Pausar Alumno"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Reactivar Alumno */}
      <Dialog open={showReactivateDialog} onOpenChange={(open) => {
        setShowReactivateDialog(open);
        if (!open) {
          setChangePlanOnReactivate(false);
          setReactivatePlanId("");
          setNewStartDate("");
          setNewStartDateDisplay("");
        }
      }}>
        <DialogContent className="sm:max-w-md bg-surface border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-success" />
              Reactivar Alumno
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              Reactivar a <strong className="text-text">{student?.firstName} {student?.lastName}</strong>
            </p>

            {/* Plan actual */}
            <div className="p-3 bg-background/50 rounded-lg border border-border">
              <p className="text-xs text-text-muted mb-1">Plan actual</p>
              <p className="text-sm font-medium text-text">
                {student?.sportPlan?.name || "Sin plan"}
                {coachPlanPrice && (
                  <span className="text-primary ml-2">
                    ${coachPlanPrice.toLocaleString()}/mes
                  </span>
                )}
              </p>
            </div>

            {/* Opción de cambiar plan */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={changePlanOnReactivate}
                  onChange={(e) => handleChangePlanOnReactivateToggle(e.target.checked)}
                  className="w-4 h-4 rounded border-border accent-primary"
                />
                <span className="text-sm text-text">Cambiar plan al reactivar</span>
              </label>

              {changePlanOnReactivate && (
                <div className="space-y-2 pl-6">
                  {loadingReactivatePlans ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  ) : reactivatePlans.length === 0 ? (
                    <p className="text-sm text-text-muted py-2">No hay planes disponibles</p>
                  ) : (
                    reactivatePlans.map((plan) => {
                      const { price, hasIncrease, increaseMonth } = getEffectivePrice(plan, reactivatePriceSchedules);
                      const isCurrentPlan = student?.sportPlan?.id === plan.id;
                      return (
                        <div
                          key={plan.id}
                          onClick={() => !isCurrentPlan && setReactivatePlanId(String(plan.id))}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-all",
                            reactivatePlanId === String(plan.id)
                              ? "border-primary bg-primary/10"
                              : isCurrentPlan
                              ? "border-border bg-surface/50 opacity-50 cursor-not-allowed"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-text">
                                {plan.name}
                                {isCurrentPlan && (
                                  <span className="text-xs text-text-muted ml-2">(actual)</span>
                                )}
                              </p>
                              <p className="text-xs text-text-muted">
                                {plan.weeklyFrequency}x por semana
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-primary">
                                ${price.toLocaleString()}
                              </p>
                              {hasIncrease && (
                                <p className="text-xs text-success flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3" />
                                  {increaseMonth}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Fecha de inicio */}
            <div className="p-4 bg-success/10 border border-success/30 rounded-lg">
              <p className="text-sm text-text mb-3">
                Seleccioná la nueva fecha de inicio:
              </p>
              <div className="relative">
                {/* Input visible con formato dd/mm/aaaa */}
                <input
                  type="text"
                  value={newStartDate ? formatDateToDisplay(newStartDate) : ""}
                  readOnly
                  placeholder="dd/mm/aaaa"
                  className="w-full bg-background border border-border rounded-md px-3 py-2 pr-10 text-text cursor-pointer"
                  onClick={() => {
                    const input = document.getElementById("reactivate-date-picker") as HTMLInputElement;
                    input?.showPicker();
                  }}
                />
                {/* Input date oculto con icono visible */}
                <input
                  id="reactivate-date-picker"
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="absolute right-0 top-0 h-full w-10 opacity-0 cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5"
                />
                {/* Icono del calendario visible */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-xs text-text-muted mt-2">
                A partir de esta fecha se calcularán las nuevas cuotas.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowReactivateDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-success hover:bg-success/90 text-black"
                onClick={handleReactivateStudent}
                disabled={reactivatingStudent || !newStartDate || (changePlanOnReactivate && !reactivatePlanId)}
              >
                {reactivatingStudent ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {reactivatingStudent ? "Reactivando..." : "Reactivar Alumno"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuickActionCard({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <Card
      className="bg-surface/80 border-border cursor-pointer touch-feedback"
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-background/50 flex items-center justify-center">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-text">{title}</h3>
          <p className="text-xs text-text-muted">{subtitle}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-text-muted" />
      </CardContent>
    </Card>
  );
}


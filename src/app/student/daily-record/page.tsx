"use client";

import { PageHeader } from "@/components/navigation/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addManualSteps, getStepsByDate } from "@/lib/api/cardio";
import { addSleepLog, getSleepLogs, getWeightByDate, type SleepQuality } from "@/lib/api/health";
import { createWeight } from "@/lib/api/student";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { AnimatePresence, motion } from "framer-motion";
import { BatteryFull, BatteryLow, BatteryMedium, Check, ChevronLeft, ChevronRight, Edit3, Footprints, Loader2, Minus, Moon, PartyPopper, Plus, Scale } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// Obtener fecha de hoy en formato yyyy-mm-dd
const getTodayISO = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

// Obtener fecha de ayer en formato yyyy-mm-dd
const getYesterdayISO = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
};

// Formatear fecha para mostrar (dd/mm/yyyy)
const formatDateDisplay = (isoDate: string): string => {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
};

// Generar array de últimos N días para el scroll de fechas
const getLastNDays = (n: number): { date: string; label: string; dayName: string }[] => {
  const days = [];
  for (let i = 0; i < n; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const dayName = date.toLocaleDateString("es-AR", { weekday: "short" });
    const label = i === 0 ? "Hoy" : i === 1 ? "Ayer" : date.getDate().toString();
    days.push({ date: isoDate, label, dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1) });
  }
  return days;
};

export default function DailyRecordPage() {
  const router = useRouter();
  const { student } = useAuthStore();

  const [activeTab, setActiveTab] = useState("weight");
  
  // Estado para indicadores de completado en tabs
  const [weightCompleted, setWeightCompleted] = useState(false);
  const [sleepCompleted, setSleepCompleted] = useState(false);
  const [stepsCompleted, setStepsCompleted] = useState(false);
  
  // Estado para mensaje final
  const [showFinalMessage, setShowFinalMessage] = useState(false);
  
  // Ref para scroll de fechas
  const dateScrollRef = useRef<HTMLDivElement>(null);
  
  // Weight state
  const [weight, setWeight] = useState("");
  const [weightNotes, setWeightNotes] = useState("");
  const [weightLoading, setWeightLoading] = useState(false);
  const [weightSuccess, setWeightSuccess] = useState(false);
  const [existingWeight, setExistingWeight] = useState<{ weight: number; id: number } | null>(null);
  const [checkingWeight, setCheckingWeight] = useState(false);

  // Steps state
  const [steps, setSteps] = useState("");
  const [stepsNotes, setStepsNotes] = useState("");
  const [stepsLoading, setStepsLoading] = useState(false);
  const [stepsSuccess, setStepsSuccess] = useState(false);
  const [existingSteps, setExistingSteps] = useState<{ steps: number; id: number } | null>(null);
  const [checkingSteps, setCheckingSteps] = useState(false);
  const [stepsDate, setStepsDate] = useState(getYesterdayISO()); // Por defecto ayer

  // Sleep state
  const [sleepHours, setSleepHours] = useState(7);
  const [sleepMinutes, setSleepMinutes] = useState(0);
  const [sleepQuality, setSleepQuality] = useState<SleepQuality>("PLENO");
  const [sleepLoading, setSleepLoading] = useState(false);
  const [sleepSuccess, setSleepSuccess] = useState(false);
  const [existingSleep, setExistingSleep] = useState<{ id: number; sleepHours: number; sleepMinutes: number } | null>(null);
  const [checkingSleep, setCheckingSleep] = useState(false);

  // Verificar pasos para una fecha específica
  const checkExistingSteps = useCallback(async (studentId: number, date: string) => {
    setCheckingSteps(true);
    setExistingSteps(null);
    setSteps("");
    try {
      const existingS = await getStepsByDate(studentId, date);
      setExistingSteps(existingS);
      if (existingS && existingS.steps > 0) {
        setSteps(existingS.steps.toString());
      }
      return existingS;
    } catch (error) {
      console.error("Error checking existing steps:", error);
      return null;
    } finally {
      setCheckingSteps(false);
    }
  }, []);

  // Verificar registros existentes para hoy
  const checkExistingRecords = useCallback(async (studentId: number) => {
    const today = getTodayISO();
    const yesterday = getYesterdayISO();
    
    // Verificar peso (hoy)
    setCheckingWeight(true);
    try {
      const existingW = await getWeightByDate(studentId, today);
      setExistingWeight(existingW);
      if (existingW && existingW.weight > 0) {
        setWeight(existingW.weight.toFixed(2));
        setWeightCompleted(true);
      }
    } catch (error) {
      console.error("Error checking existing weight:", error);
    } finally {
      setCheckingWeight(false);
    }

    // Verificar pasos (ayer por defecto)
    const existingS = await checkExistingSteps(studentId, yesterday);
    if (existingS && existingS.steps > 0) {
      setStepsCompleted(true);
    }

    // Verificar sueño (hoy)
    setCheckingSleep(true);
    try {
      const sleepLogs = await getSleepLogs(studentId, 7);
      const existingSl = sleepLogs.find(log => log.date === today);
      if (existingSl) {
        setExistingSleep({ id: existingSl.id, sleepHours: existingSl.sleepHours, sleepMinutes: existingSl.sleepMinutes });
        setSleepHours(existingSl.sleepHours);
        setSleepMinutes(existingSl.sleepMinutes);
        setSleepQuality(existingSl.quality);
        setSleepCompleted(true);
      }
    } catch (error) {
      console.error("Error checking existing sleep:", error);
    } finally {
      setCheckingSleep(false);
    }
  }, [checkExistingSteps]);

  // Verificar al montar el componente
  useEffect(() => {
    if (student?.id) {
      checkExistingRecords(student.id);
    }
  }, [student?.id, checkExistingRecords]);

  // Verificar pasos cuando cambie la fecha
  useEffect(() => {
    if (student?.id && stepsDate) {
      checkExistingSteps(student.id, stepsDate);
    }
  }, [student?.id, stepsDate, checkExistingSteps]);

  const handleWeightSubmit = async () => {
    if (!student?.id || !weight) return;

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0 || weightNum > 500) {
      toast.error("Ingresá un peso válido");
      return;
    }

    setWeightLoading(true);
    try {
      await createWeight(student.id, weightNum, getTodayISO(), weightNotes || undefined);
      setWeightSuccess(true);
      setWeightCompleted(true);
      toast.success(existingWeight ? "Peso actualizado correctamente" : "Peso registrado correctamente");
      // Resetear y avanzar al siguiente tab
      setTimeout(() => {
        setWeightSuccess(false);
        setExistingWeight({ weight: parseFloat(weight), id: existingWeight?.id || 0 });
        // Auto-avance a sueño
        setActiveTab("sleep");
      }, 1200);
    } catch (error) {
      console.error(error);
      toast.error("Error al registrar peso");
    } finally {
      setWeightLoading(false);
    }
  };

  const handleStepsSubmit = async () => {
    if (!student?.id || !steps) return;

    const stepsNum = parseInt(steps);
    if (isNaN(stepsNum) || stepsNum < 0 || stepsNum > 100000) {
      toast.error("Ingresá una cantidad de pasos válida");
      return;
    }

    setStepsLoading(true);
    try {
      await addManualSteps(student.id, { steps: stepsNum, date: stepsDate, replace: true });
      setStepsSuccess(true);
      setStepsCompleted(true);
      toast.success(existingSteps ? "Pasos actualizados correctamente" : "Pasos registrados correctamente");
      // Resetear después de mostrar el check
      setTimeout(() => {
        setStepsSuccess(false);
        setExistingSteps({ steps: parseInt(steps), id: existingSteps?.id || 0 });
        // Mostrar mensaje final si todo está completo
        if (weightCompleted && sleepCompleted) {
          setShowFinalMessage(true);
        }
      }, 1200);
    } catch (error) {
      console.error(error);
      toast.error("Error al registrar pasos");
    } finally {
      setStepsLoading(false);
    }
  };

  const handleSleepSubmit = async () => {
    if (!student?.id) return;

    if (sleepHours === 0 && sleepMinutes === 0) {
      toast.error("Ingresá las horas de sueño");
      return;
    }

    setSleepLoading(true);
    try {
      await addSleepLog(student.id, {
        date: getTodayISO(),
        sleepHours,
        sleepMinutes,
        quality: sleepQuality,
      });
      setSleepSuccess(true);
      setSleepCompleted(true);
      const displayFormat = sleepMinutes > 0 ? `${sleepHours}h ${sleepMinutes}m` : `${sleepHours}h`;
      toast.success(existingSleep ? `Sueño actualizado a ${displayFormat}` : `${displayFormat} registrados`);
      // Resetear y avanzar al siguiente tab
      setTimeout(() => {
        setSleepSuccess(false);
        setExistingSleep({ id: existingSleep?.id || 0, sleepHours, sleepMinutes });
        // Auto-avance a pasos
        setActiveTab("steps");
      }, 1200);
    } catch (error: any) {
      console.error(error);
      if (error?.response?.status === 400) {
        toast.error("Ya existe un registro de sueño para hoy");
      } else {
        toast.error("Error al registrar sueño");
      }
    } finally {
      setSleepLoading(false);
    }
  };

  // Sleep helpers
  const getSleepColor = (hours: number, mins: number) => {
    const decimal = hours + mins / 60;
    if (decimal >= 8) return "#22c55e";
    if (decimal >= 7) return "#4ade80";
    if (decimal >= 6) return "#eab308";
    if (decimal >= 5) return "#f97316";
    return "#ef4444";
  };

  const sleepDisplayFormat = sleepMinutes > 0 ? `${sleepHours}h ${sleepMinutes}m` : `${sleepHours}h`;
  const sleepColor = getSleepColor(sleepHours, sleepMinutes);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Registro Diario"
        subtitle="Cargá tus datos de hoy"
        showBack
        backHref="/student"
      />

      <div className="px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-surface border border-border">
            {/* Tab 1: Peso */}
            <TabsTrigger
              value="weight"
              className={cn(
                "data-[state=active]:bg-primary data-[state=active]:text-black",
                "flex items-center gap-1.5 text-xs relative"
              )}
            >
              {weightCompleted ? (
                <div className="w-4 h-4 rounded-full bg-success flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              ) : (
                <Scale className="w-4 h-4" />
              )}
              Peso
            </TabsTrigger>
            {/* Tab 2: Sueño (antes era 3ro) */}
            <TabsTrigger
              value="sleep"
              className={cn(
                "data-[state=active]:bg-indigo-500 data-[state=active]:text-white",
                "flex items-center gap-1.5 text-xs"
              )}
            >
              {sleepCompleted ? (
                <div className="w-4 h-4 rounded-full bg-success flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              ) : (
                <Moon className="w-4 h-4" />
              )}
              Sueño
            </TabsTrigger>
            {/* Tab 3: Pasos (antes era 2do) */}
            <TabsTrigger
              value="steps"
              className={cn(
                "data-[state=active]:bg-accent data-[state=active]:text-black",
                "flex items-center gap-1.5 text-xs"
              )}
            >
              {stepsCompleted ? (
                <div className="w-4 h-4 rounded-full bg-success flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              ) : (
                <Footprints className="w-4 h-4" />
              )}
              Pasos
            </TabsTrigger>
          </TabsList>

          {/* Weight Tab */}
          <TabsContent value="weight" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="bg-surface/80 border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center">
                      <Scale className="w-6 h-6 text-black" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-text">Peso de hoy</h2>
                        {checkingWeight && (
                          <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        )}
                        {!checkingWeight && existingWeight && (
                          <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 text-xs">
                            <Edit3 className="w-3 h-3 mr-1" />
                            Ya registrado
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-text-muted font-normal">
                        {new Date().toLocaleDateString("es-AR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {weightSuccess ? (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center py-8"
                    >
                      <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
                        <Check className="w-8 h-8 text-success" />
                      </div>
                      <p className="text-lg font-semibold text-text">{weight} kg registrado</p>
                      <p className="text-sm text-text-muted">✓ Guardado</p>
                    </motion.div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="weight" className="text-text-secondary">
                          Peso (kg)
                        </Label>
                        <div className="relative">
                          <Input
                            id="weight"
                            type="number"
                            step="0.01"
                            min="0"
                            max="500"
                            placeholder="Ej: 75.5"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            className="text-2xl h-14 bg-background/50 border-border text-center font-bold"
                            disabled={weightLoading}
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted">
                            kg
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="weightNotes" className="text-text-secondary">
                          Notas (opcional)
                        </Label>
                        <Input
                          id="weightNotes"
                          placeholder="Ej: Después de entrenar"
                          value={weightNotes}
                          onChange={(e) => setWeightNotes(e.target.value)}
                          className="bg-background/50 border-border"
                          disabled={weightLoading}
                        />
                      </div>

                      <Button
                        onClick={handleWeightSubmit}
                        disabled={!weight || weightLoading || checkingWeight}
                        className="w-full h-12 bg-gradient-to-r from-primary to-primary-hover text-black font-semibold"
                      >
                        {weightLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Guardando...
                          </>
                        ) : existingWeight ? (
                          <>
                            <Edit3 className="mr-2 h-4 w-4" />
                            Actualizar Peso
                          </>
                        ) : (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Registrar Peso
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Tips */}
              <Card className="bg-surface/50 border-border">
                <CardContent className="p-4">
                  <p className="text-sm text-text-secondary">
                    💡 <strong>Tip:</strong> Pesate siempre a la misma hora, idealmente en ayunas y después de ir al baño.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Steps Tab */}
          <TabsContent value="steps" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="bg-surface/80 border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-success flex items-center justify-center">
                      <Footprints className="w-6 h-6 text-black" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-text">Registrar Pasos</h2>
                        {checkingSteps && (
                          <Loader2 className="w-4 h-4 text-accent animate-spin" />
                        )}
                        {!checkingSteps && existingSteps && (
                          <Badge variant="outline" className="bg-accent/20 text-accent border-accent/30 text-xs">
                            <Edit3 className="w-3 h-3 mr-1" />
                            Ya registrado
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-text-muted font-normal">
                        {new Date(stepsDate + "T12:00:00").toLocaleDateString("es-AR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Scroll de fechas horizontal */}
                  <div className="space-y-2">
                    <span className="text-sm text-text-muted">Fecha</span>
                    <div 
                      ref={dateScrollRef}
                      className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                      {getLastNDays(7).map((day) => (
                        <button
                          key={day.date}
                          onClick={() => setStepsDate(day.date)}
                          disabled={stepsLoading}
                          className={cn(
                            "flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-xl border transition-all",
                            stepsDate === day.date
                              ? "border-accent bg-accent/20 text-accent"
                              : "border-border bg-background/50 text-text-muted hover:border-accent/50"
                          )}
                        >
                          <span className="text-[10px] uppercase opacity-70">{day.dayName}</span>
                          <span className="text-lg font-bold">{day.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {stepsSuccess ? (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center py-8"
                    >
                      <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
                        <Check className="w-8 h-8 text-success" />
                      </div>
                      <p className="text-lg font-semibold text-text">
                        {parseInt(steps).toLocaleString()} pasos registrados
                      </p>
                      <p className="text-sm text-text-muted">✓ Guardado</p>
                    </motion.div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="steps" className="text-text-secondary">
                          Cantidad de pasos
                        </Label>
                        <div className="relative">
                          <Input
                            id="steps"
                            type="number"
                            min="0"
                            max="100000"
                            placeholder="Ej: 8500"
                            value={steps}
                            onChange={(e) => setSteps(e.target.value)}
                            className="text-2xl h-14 bg-background/50 border-border text-center font-bold"
                            disabled={stepsLoading}
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted">
                            pasos
                          </span>
                        </div>
                      </div>

                      {student?.dailyStepsGoal && (
                        <div className="flex items-center justify-center gap-2 text-text-muted text-sm">
                          <span>Meta diaria:</span>
                          <span className="font-semibold text-accent">
                            {student.dailyStepsGoal.toLocaleString()} pasos
                          </span>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="stepsNotes" className="text-text-secondary">
                          Notas (opcional)
                        </Label>
                        <Input
                          id="stepsNotes"
                          placeholder="Ej: Caminata por el parque"
                          value={stepsNotes}
                          onChange={(e) => setStepsNotes(e.target.value)}
                          className="bg-background/50 border-border"
                          disabled={stepsLoading}
                        />
                      </div>

                      <Button
                        onClick={handleStepsSubmit}
                        disabled={!steps || stepsLoading || checkingSteps}
                        className="w-full h-12 bg-gradient-to-r from-accent to-success text-black font-semibold"
                      >
                        {stepsLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Guardando...
                          </>
                        ) : existingSteps ? (
                          <>
                            <Edit3 className="mr-2 h-4 w-4" />
                            Actualizar Pasos
                          </>
                        ) : (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Registrar Pasos
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Tips */}
              <Card className="bg-surface/50 border-border">
                <CardContent className="p-4">
                  <p className="text-sm text-text-secondary">
                    💡 <strong>Tip:</strong> Podés ver los pasos en tu celular (Samsung Health, Google Fit, Apple Health) o smartwatch.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Sleep Tab */}
          <TabsContent value="sleep" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="bg-surface/80 border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${sleepColor}30` }}
                    >
                      <Moon className="w-6 h-6" style={{ color: sleepColor }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-text">Sueño de anoche</h2>
                        {checkingSleep && (
                          <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                        )}
                        {!checkingSleep && existingSleep && (
                          <Badge variant="outline" className="bg-indigo-500/20 text-indigo-400 border-indigo-400/30 text-xs">
                            <Edit3 className="w-3 h-3 mr-1" />
                            Ya registrado
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-text-muted font-normal">
                        {new Date().toLocaleDateString("es-AR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sleepSuccess ? (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center py-8"
                    >
                      <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mb-4">
                        <Check className="w-8 h-8 text-indigo-400" />
                      </div>
                      <p className="text-lg font-semibold text-text">
                        {sleepDisplayFormat} registrado
                      </p>
                      <p className="text-sm text-text-muted">✓ Guardado</p>
                    </motion.div>
                  ) : (
                    <>
                      {/* Sleep display */}
                      <div className="text-center py-4">
                        <motion.p
                          key={`${sleepHours}-${sleepMinutes}`}
                          initial={{ opacity: 0.5, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-5xl font-bold text-text"
                        >
                          {sleepDisplayFormat}
                        </motion.p>
                      </div>

                      {/* Hours and Minutes selectors */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <Label className="text-text-muted text-sm mb-2 block">Horas</Label>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="w-10 h-10 rounded-full"
                              onClick={() => setSleepHours(prev => Math.max(0, prev - 1))}
                              disabled={sleepLoading}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="text-3xl font-bold text-text w-12">{sleepHours}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="w-10 h-10 rounded-full"
                              onClick={() => setSleepHours(prev => Math.min(24, prev + 1))}
                              disabled={sleepLoading}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="text-center">
                          <Label className="text-text-muted text-sm mb-2 block">Minutos</Label>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="w-10 h-10 rounded-full"
                              onClick={() => setSleepMinutes(prev => prev <= 0 ? 45 : prev - 15)}
                              disabled={sleepLoading}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="text-3xl font-bold text-text w-12">{sleepMinutes.toString().padStart(2, '0')}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="w-10 h-10 rounded-full"
                              onClick={() => setSleepMinutes(prev => prev >= 45 ? 0 : prev + 15)}
                              disabled={sleepLoading}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Quick presets */}
                      <div className="flex flex-wrap justify-center gap-2">
                        {[6, 7, 8, 9].map((h) => (
                          <Button
                            key={h}
                            variant={sleepHours === h && sleepMinutes === 0 ? "default" : "outline"}
                            size="sm"
                            className="text-xs"
                            onClick={() => { setSleepHours(h); setSleepMinutes(0); }}
                            disabled={sleepLoading}
                          >
                            {h}h
                          </Button>
                        ))}
                        <Button
                          variant={sleepHours === 7 && sleepMinutes === 30 ? "default" : "outline"}
                          size="sm"
                          className="text-xs"
                          onClick={() => { setSleepHours(7); setSleepMinutes(30); }}
                          disabled={sleepLoading}
                        >
                          7h 30m
                        </Button>
                      </div>

                      {/* Quality selector */}
                      <div className="space-y-2">
                        <Label className="text-text-secondary">Calidad del sueño</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: "PLENO" as SleepQuality, label: "Pleno", icon: <BatteryFull className="w-5 h-5" /> },
                            { value: "ENTRECORTADO" as SleepQuality, label: "Irregular", icon: <BatteryMedium className="w-5 h-5" /> },
                            { value: "DIFICULTAD_DORMIR" as SleepQuality, label: "Difícil", icon: <BatteryLow className="w-5 h-5" /> },
                          ].map((option) => (
                            <button
                              key={option.value}
                              onClick={() => setSleepQuality(option.value)}
                              disabled={sleepLoading}
                              className={cn(
                                "p-3 rounded-lg border transition-all text-center",
                                sleepQuality === option.value
                                  ? "border-indigo-500 bg-indigo-500/20 text-indigo-400"
                                  : "border-border bg-background hover:border-indigo-500/50"
                              )}
                            >
                              <div className="flex justify-center mb-1">
                                {option.icon}
                              </div>
                              <p className="text-xs font-medium">{option.label}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <Button
                        onClick={handleSleepSubmit}
                        disabled={(sleepHours === 0 && sleepMinutes === 0) || sleepLoading || checkingSleep}
                        className="w-full h-12 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold"
                      >
                        {sleepLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Guardando...
                          </>
                        ) : existingSleep ? (
                          <>
                            <Edit3 className="mr-2 h-4 w-4" />
                            Actualizar Sueño
                          </>
                        ) : (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Registrar Sueño
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Tips */}
              <Card className="bg-indigo-500/10 border-indigo-500/20">
                <CardContent className="p-4">
                  <p className="text-sm text-text-secondary">
                    🌙 <strong>Tip:</strong> Registrá tu sueño apenas te levantes. Lo ideal es dormir entre 7-9 horas para una buena recuperación.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Mensaje final cuando todo está completo */}
        <AnimatePresence>
          {showFinalMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setShowFinalMessage(false)}
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="bg-surface border border-border rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-success to-accent flex items-center justify-center"
                >
                  <PartyPopper className="w-10 h-10 text-white" />
                </motion.div>
                
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-bold text-text mb-2"
                >
                  ¡Excelente!
                </motion.h2>
                
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-text-muted mb-6"
                >
                  Tenés tu registro al día. ¡Seguí así!
                </motion.p>
                
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex gap-2 justify-center mb-4"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-accent" />
                  </div>
                </motion.div>
                
                <Button
                  onClick={() => {
                    setShowFinalMessage(false);
                    router.push("/student");
                  }}
                  className="w-full h-12 bg-gradient-to-r from-success to-accent text-black font-semibold"
                >
                  Volver al inicio
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


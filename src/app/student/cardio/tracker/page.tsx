"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { useCardioSession } from "@/stores/cardio-session";
import {
  INDOOR_ACTIVITIES,
  INTENSITY_LEVELS,
  formatTime,
  estimateCalories,
  getLocalDateString,
  addManualActivity,
  getActivityInfo,
} from "@/lib/api/cardio";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Save,
  Route,
  Flame,
  Timer,
  Zap,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function CardioTrackerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { student } = useAuthStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Obtener tipo de actividad de la URL o null
  const activityParam = searchParams.get("activity");
  
  const {
    status,
    activityType,
    elapsedSeconds,
    distance,
    calories,
    notes,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    updateElapsed,
    setDistance,
    setCalories,
    setNotes,
    resetSession,
    restoreSession,
  } = useCardioSession();

  // Intensidad seleccionada
  const [intensity, setIntensity] = useState<string>("medium");

  // Restaurar sesión al cargar
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Si viene actividad por parámetro y no hay sesión activa, iniciarla
  useEffect(() => {
    if (activityParam && status === "idle" && student?.id) {
      startSession(activityParam, student.id);
    }
  }, [activityParam, status, student?.id, startSession]);

  // Timer interval
  useEffect(() => {
    if (status === "running") {
      intervalRef.current = setInterval(() => {
        updateElapsed();
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [status, updateElapsed]);

  // Calcular calorías estimadas automáticamente
  const estimatedCalories = activityType
    ? estimateCalories(activityType, Math.floor(elapsedSeconds / 60))
    : 0;

  const activityInfo = activityType ? getActivityInfo(activityType) : null;

  const handleSave = async () => {
    if (!student?.id || !activityType) return;

    const durationMinutes = Math.ceil(elapsedSeconds / 60);
    if (durationMinutes < 1) {
      toast.error("La actividad debe durar al menos 1 minuto");
      return;
    }

    try {
      setSaving(true);
      await addManualActivity(student.id, {
        activityType,
        durationMinutes,
        distanceKm: distance ? parseFloat(distance) : undefined,
        caloriesBurned: calories ? parseInt(calories) : estimatedCalories,
        notes: notes || undefined,
        date: getLocalDateString(),
        intensity: intensity as "low" | "medium" | "high",
      });

      toast.success("¡Actividad guardada! 🎉");
      resetSession();
      router.push("/student/cardio");
    } catch (error) {
      console.error("Error saving activity:", error);
      toast.error("Error al guardar la actividad");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    resetSession();
    router.push("/student/cardio");
  };

  // Si hay sesión activa de otra actividad, mostrar warning
  if (status !== "idle" && activityParam && activityType !== activityParam) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="bg-surface/80 border-border max-w-sm">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center mx-auto">
              <Timer className="w-8 h-8 text-warning" />
            </div>
            <h2 className="text-lg font-semibold text-text">Sesión en progreso</h2>
            <p className="text-sm text-text-muted">
              Ya tenés una sesión de{" "}
              <span className="text-primary font-medium">
                {getActivityInfo(activityType!).label}
              </span>{" "}
              en curso. ¿Qué querés hacer?
            </p>
            <div className="flex flex-col gap-2">
              <Button
                className="w-full"
                onClick={() => router.push(`/student/cardio/tracker`)}
              >
                Continuar sesión actual
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  resetSession();
                  startSession(activityParam!, student!.id!);
                }}
              >
                Descartar y empezar nueva
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vista de finalización (cuando se presiona Stop)
  if (status === "finished") {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader
          title="Guardar actividad"
          showBack
          onBack={() => resumeSession()}
        />

        <div className="px-4 py-4 space-y-4">
          {/* Resumen */}
          <Card className="bg-gradient-to-br from-primary/20 to-surface border-primary/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/30 flex items-center justify-center text-3xl">
                  {activityInfo?.emoji}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text">{activityInfo?.label}</h2>
                  <p className="text-3xl font-mono font-bold text-primary">
                    {formatTime(elapsedSeconds)}
                  </p>
                </div>
              </div>

              <div className="flex justify-around text-center">
                <div>
                  <p className="text-2xl font-bold text-text">
                    {Math.ceil(elapsedSeconds / 60)}
                  </p>
                  <p className="text-xs text-text-muted">minutos</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-success">
                    ~{estimatedCalories}
                  </p>
                  <p className="text-xs text-text-muted">kcal (est.)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Intensidad */}
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-4">
              <Label className="text-text-muted mb-3 block flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Intensidad
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(INTENSITY_LEVELS).map(([key, info]) => (
                  <Button
                    key={key}
                    variant="outline"
                    className={cn(
                      "h-auto py-3 flex flex-col items-center gap-1",
                      intensity === key && "border-2"
                    )}
                    style={{
                      borderColor: intensity === key ? info.color : undefined,
                      backgroundColor: intensity === key ? `${info.color}20` : undefined,
                    }}
                    onClick={() => setIntensity(key)}
                  >
                    <span className="text-sm font-medium">{info.label}</span>
                    <span className="text-xs text-text-muted">{info.description}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Datos opcionales */}
          <Card className="bg-surface/80 border-border">
            <CardContent className="p-4 space-y-4">
              {activityInfo?.hasDistance && (
                <div>
                  <Label className="flex items-center gap-2 text-text-muted mb-2">
                    <Route className="w-4 h-4" />
                    Distancia (km)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    placeholder="5.0"
                    className="bg-background"
                  />
                </div>
              )}

              <div>
                <Label className="flex items-center gap-2 text-text-muted mb-2">
                  <Flame className="w-4 h-4" />
                  Calorías (opcional)
                </Label>
                <Input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder={`${estimatedCalories} (estimado)`}
                  className="bg-background"
                />
              </div>

              <div>
                <Label className="text-text-muted mb-2 block">Notas (opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="¿Cómo te sentiste?"
                  className="bg-background resize-none"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Botones */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDiscard}
              disabled={saving}
            >
              Descartar
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-primary to-primary-hover text-black font-semibold"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                "Guardando..."
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Vista principal del tracker (running/paused/idle)
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader
        title={activityInfo?.label || "Cardio"}
        backHref="/student/cardio"
      />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {/* Icono de actividad */}
        <motion.div
          className="mb-8"
          animate={status === "running" ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 1, repeat: status === "running" ? Infinity : 0 }}
        >
          <div
            className="w-32 h-32 rounded-3xl flex items-center justify-center text-6xl shadow-lg"
            style={{ backgroundColor: `${activityInfo?.color}30` }}
          >
            {activityInfo?.emoji || "🏃"}
          </div>
        </motion.div>

        {/* Timer */}
        <motion.div
          className="text-center mb-8"
          animate={status === "running" ? { opacity: [1, 0.8, 1] } : {}}
          transition={{ duration: 1, repeat: status === "running" ? Infinity : 0 }}
        >
          <p className="text-6xl font-mono font-bold text-text tracking-wider">
            {formatTime(elapsedSeconds)}
          </p>
          <p className="text-text-muted mt-2">
            {status === "running" && "En progreso..."}
            {status === "paused" && "Pausado"}
            {status === "idle" && "Listo para empezar"}
          </p>
        </motion.div>

        {/* Estadísticas en vivo */}
        {status !== "idle" && (
          <motion.div
            className="flex gap-6 mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-text">
                {Math.ceil(elapsedSeconds / 60)}
              </p>
              <p className="text-xs text-text-muted">min</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success">~{estimatedCalories}</p>
              <p className="text-xs text-text-muted">kcal</p>
            </div>
          </motion.div>
        )}

        {/* Controles */}
        <div className="flex items-center gap-4">
          {status === "idle" && (
            <Button
              size="lg"
              className="w-20 h-20 rounded-full bg-gradient-to-r from-primary to-primary-hover text-black shadow-lg"
              onClick={() => student?.id && activityType && startSession(activityType, student.id)}
            >
              <Play className="w-8 h-8 ml-1" />
            </Button>
          )}

          {status === "running" && (
            <>
              <Button
                size="lg"
                variant="outline"
                className="w-16 h-16 rounded-full border-2 border-warning text-warning hover:bg-warning/10"
                onClick={pauseSession}
              >
                <Pause className="w-6 h-6" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-16 h-16 rounded-full border-2 border-error text-error hover:bg-error/10"
                onClick={stopSession}
              >
                <Square className="w-6 h-6" />
              </Button>
            </>
          )}

          {status === "paused" && (
            <>
              <Button
                size="lg"
                className="w-20 h-20 rounded-full bg-gradient-to-r from-primary to-primary-hover text-black shadow-lg"
                onClick={resumeSession}
              >
                <Play className="w-8 h-8 ml-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-16 h-16 rounded-full border-2 border-error text-error hover:bg-error/10"
                onClick={stopSession}
              >
                <Square className="w-6 h-6" />
              </Button>
            </>
          )}
        </div>

        {/* Badge de estado persistente */}
        {status !== "idle" && (
          <Badge className="mt-8 bg-primary/20 text-primary">
            ⚡ El cronómetro continúa aunque salgas de esta pantalla
          </Badge>
        )}
      </div>
    </div>
  );
}


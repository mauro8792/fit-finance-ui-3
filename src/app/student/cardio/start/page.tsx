"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useCardioSession } from "@/stores/cardio-session";
import { INDOOR_ACTIVITIES, getActivityInfo } from "@/lib/api/cardio";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timer, Play, ChevronRight } from "lucide-react";

export default function StartCardioPage() {
  const router = useRouter();
  const { status, activityType } = useCardioSession();

  // Si hay sesión activa, mostrar opción de continuar
  const hasActiveSession = status !== "idle" && status !== "finished";

  const handleSelectActivity = (type: string) => {
    router.push(`/student/cardio/tracker?activity=${type}`);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Iniciar actividad" backHref="/student/cardio" />

      <div className="px-4 py-4 space-y-4">
        {/* Sesión activa */}
        {hasActiveSession && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-gradient-to-r from-warning/20 to-warning/5 border-warning/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-warning/30 flex items-center justify-center text-2xl">
                      {getActivityInfo(activityType!).emoji}
                    </div>
                    <div>
                      <p className="font-medium text-text">Sesión en progreso</p>
                      <p className="text-sm text-text-muted">
                        {getActivityInfo(activityType!).label}
                      </p>
                    </div>
                  </div>
                  <Button
                    className="bg-warning text-black hover:bg-warning/90"
                    onClick={() => router.push("/student/cardio/tracker")}
                  >
                    Continuar
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Título de sección */}
        <div className="flex items-center gap-2 pt-2">
          <Timer className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-text">Actividades con cronómetro</h2>
        </div>
        <p className="text-sm text-text-muted -mt-2">
          Seleccioná una actividad y usá el cronómetro para registrar tu sesión
        </p>

        {/* Grid de actividades */}
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(INDOOR_ACTIVITIES)
            .filter(([key]) => !["walking", "running", "cycling"].includes(key)) // Excluir las que son más outdoor
            .map(([key, info], index) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card
                  className="bg-surface/80 border-border cursor-pointer hover:border-primary/50 hover:bg-surface transition-all active:scale-95"
                  onClick={() => handleSelectActivity(key)}
                >
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${info.color}20` }}
                    >
                      {info.emoji}
                    </div>
                    <span className="text-sm font-medium text-text">{info.label}</span>
                    {info.hasDistance && (
                      <Badge variant="outline" className="text-xs">
                        🛤️ Km
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
        </div>

        {/* Sección outdoor/manual */}
        <div className="pt-4">
          <h3 className="text-sm font-medium text-text-muted mb-3">
            O registrá una actividad manualmente
          </h3>
          <Button
            variant="outline"
            className="w-full h-14 bg-surface/50 border-border hover:bg-surface"
            onClick={() => router.push("/student/cardio/add-activity")}
          >
            <Play className="w-5 h-5 mr-2 text-accent" />
            Agregar actividad manual
          </Button>
        </div>
      </div>
    </div>
  );
}


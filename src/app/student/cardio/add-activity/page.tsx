"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { addManualActivity } from "@/lib/api/cardio";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Timer, Route, Flame, Footprints, Calendar, Save } from "lucide-react";
import { toast } from "sonner";
import { cn, getTodayString } from "@/lib/utils";

const ACTIVITY_TYPES = [
  { id: "walking", name: "Caminata", icon: "🚶" },
  { id: "running", name: "Correr", icon: "🏃" },
  { id: "cycling", name: "Ciclismo", icon: "🚴" },
  { id: "swimming", name: "Natación", icon: "🏊" },
  { id: "hiit", name: "HIIT", icon: "⚡" },
  { id: "other", name: "Otro", icon: "💪" },
];

export default function AddActivityPage() {
  const router = useRouter();
  const { student } = useAuthStore();

  const [activityType, setActivityType] = useState("");
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [steps, setSteps] = useState("");
  const [calories, setCalories] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(getTodayString);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!student?.id) return;

    if (!activityType) {
      toast.error("Seleccioná un tipo de actividad");
      return;
    }

    if (!duration || Number(duration) <= 0) {
      toast.error("Ingresá la duración");
      return;
    }

    try {
      setSaving(true);
      await addManualActivity(student.id, {
        activityType,
        durationMinutes: Number(duration),
        distanceKm: distance ? Number(distance) : undefined,
        steps: steps ? Number(steps) : undefined,
        caloriesBurned: calories ? Number(calories) : undefined,
        notes: notes || undefined,
        date,
        intensity: "medium",
      });

      toast.success("¡Actividad registrada! 🎉");
      router.push("/student/cardio");
    } catch (error) {
      console.error("Error adding activity:", error);
      toast.error("Error al registrar la actividad");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Nueva actividad" backHref="/student/cardio" />

      <div className="px-4 py-4 space-y-4">
        {/* Activity Type */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-4">
            <Label className="text-text-muted mb-3 block">Tipo de actividad</Label>
            <div className="grid grid-cols-3 gap-2">
              {ACTIVITY_TYPES.map((type) => (
                <Button
                  key={type.id}
                  variant="outline"
                  className={cn(
                    "h-auto py-3 flex flex-col items-center gap-1",
                    activityType === type.id &&
                      "bg-primary/20 border-primary text-primary"
                  )}
                  onClick={() => setActivityType(type.id)}
                >
                  <span className="text-2xl">{type.icon}</span>
                  <span className="text-xs">{type.name}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Duration & Distance */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-4 space-y-4">
            <div>
              <Label className="flex items-center gap-2 text-text-muted mb-2">
                <Timer className="w-4 h-4" />
                Duración (minutos) *
              </Label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="30"
                className="bg-background"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
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

              <div>
                <Label className="flex items-center gap-2 text-text-muted mb-2">
                  <Footprints className="w-4 h-4" />
                  Pasos
                </Label>
                <Input
                  type="number"
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  placeholder="5000"
                  className="bg-background"
                />
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-2 text-text-muted mb-2">
                <Flame className="w-4 h-4" />
                Calorías quemadas
              </Label>
              <Input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="250"
                className="bg-background"
              />
            </div>
          </CardContent>
        </Card>

        {/* Date & Notes */}
        <Card className="bg-surface/80 border-border">
          <CardContent className="p-4 space-y-4">
            <div>
              <Label className="flex items-center gap-2 text-text-muted mb-2">
                <Calendar className="w-4 h-4" />
                Fecha
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={getTodayString()}
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

        {/* Submit Button */}
        <Button
          className="w-full h-14 bg-gradient-to-r from-primary to-primary-hover text-black font-semibold text-lg rounded-xl"
          disabled={!activityType || !duration || saving}
          onClick={handleSubmit}
        >
          {saving ? (
            "Guardando..."
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Guardar actividad
            </>
          )}
        </Button>
      </div>
    </div>
  );
}


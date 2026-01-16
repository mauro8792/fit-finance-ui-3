"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dumbbell,
  Calendar,
  ChevronDown,
  ChevronUp,
  Check,
  Flame,
  ArrowDownToLine,
  Clock,
  Info,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ==================== TYPES ====================
interface SetRecord {
  id: string;
  setNumber: number;
  targetReps: string; // "12", "10-12", "AMRAP"
  targetKg?: string;
  targetRir?: string;
  targetRpe?: string;
  rest?: string;
  isDropSet?: boolean;
  dropSetCount?: number;
  // Lo que registra el alumno
  actualReps?: string;
  actualKg?: string;
  actualRirR?: string;
  actualRpe?: string;
  completed?: boolean;
  // Drops registrados
  drops?: {
    id: string;
    actualReps?: string;
    actualKg?: string;
  }[];
}

interface ExerciseRecord {
  id: string;
  name: string;
  muscleGroup?: string;
  sets: SetRecord[];
  notes?: string;
  expanded: boolean;
}

// ==================== MOCK DATA ====================
const mockExercises: ExerciseRecord[] = [
  {
    id: "e1",
    name: "Jalón al pecho",
    muscleGroup: "Espalda",
    notes: "Agarre ancho, llevar al pecho",
    expanded: true,
    sets: [
      { id: "s1", setNumber: 1, targetReps: "10-12", targetKg: "50", targetRir: "2", rest: "2 min", actualReps: "12", actualKg: "50", actualRirR: "2", actualRpe: "8", completed: true },
      { id: "s2", setNumber: 2, targetReps: "10-12", targetKg: "50", targetRir: "2", rest: "2 min", actualReps: "11", actualKg: "50", actualRirR: "1", actualRpe: "8", completed: true },
      { id: "s3", setNumber: 3, targetReps: "10-12", targetKg: "50", targetRir: "2", rest: "2 min" },
    ],
  },
  {
    id: "e2",
    name: "Remo con barra",
    muscleGroup: "Espalda",
    notes: "Última serie AMRAP - dar todo",
    expanded: true,
    sets: [
      { id: "s4", setNumber: 1, targetReps: "10", targetKg: "60", targetRir: "2", rest: "2 min" },
      { id: "s5", setNumber: 2, targetReps: "10", targetKg: "60", targetRir: "2", rest: "2 min" },
      { id: "s6", setNumber: 3, targetReps: "AMRAP", targetKg: "50", rest: "2 min" }, // AMRAP
    ],
  },
  {
    id: "e3",
    name: "Curl de bíceps",
    muscleGroup: "Bíceps",
    notes: "Última serie con 2 drop sets",
    expanded: true,
    sets: [
      { id: "s7", setNumber: 1, targetReps: "12", targetKg: "15", targetRir: "2", rest: "90s" },
      { id: "s8", setNumber: 2, targetReps: "12", targetKg: "15", targetRir: "2", rest: "90s" },
      { 
        id: "s9", 
        setNumber: 3, 
        targetReps: "12", 
        targetKg: "15", 
        targetRir: "1", 
        rest: "90s",
        isDropSet: true,
        dropSetCount: 2,
        drops: [
          { id: "d1", actualReps: "", actualKg: "" },
          { id: "d2", actualReps: "", actualKg: "" },
        ]
      }, // DROP SET
    ],
  },
];

// ==================== COMPONENT ====================
export default function StudentRoutineV2Page() {
  const router = useRouter();
  const [exercises, setExercises] = useState<ExerciseRecord[]>(mockExercises);
  const [isPreview, setIsPreview] = useState(true); // Modo preview (no activa)

  // Toggle ejercicio expandido
  const toggleExpand = (exerciseId: string) => {
    setExercises((prev) =>
      prev.map((e) =>
        e.id === exerciseId ? { ...e, expanded: !e.expanded } : e
      )
    );
  };

  // Actualizar set
  const updateSet = (
    exerciseId: string,
    setId: string,
    field: keyof SetRecord,
    value: string | boolean
  ) => {
    if (isPreview) return; // No editar en preview
    
    setExercises((prev) =>
      prev.map((e) =>
        e.id === exerciseId
          ? {
              ...e,
              sets: e.sets.map((s) =>
                s.id === setId ? { ...s, [field]: value } : s
              ),
            }
          : e
      )
    );
  };

  // Actualizar drop
  const updateDrop = (
    exerciseId: string,
    setId: string,
    dropId: string,
    field: "actualReps" | "actualKg",
    value: string
  ) => {
    if (isPreview) return;
    
    setExercises((prev) =>
      prev.map((e) =>
        e.id === exerciseId
          ? {
              ...e,
              sets: e.sets.map((s) =>
                s.id === setId
                  ? {
                      ...s,
                      drops: s.drops?.map((d) =>
                        d.id === dropId ? { ...d, [field]: value } : d
                      ),
                    }
                  : s
              ),
            }
          : e
      )
    );
  };

  // Contar series completadas
  const completedSets = exercises.reduce(
    (acc, e) => acc + e.sets.filter((s) => s.completed).length,
    0
  );
  const totalSets = exercises.reduce((acc, e) => acc + e.sets.length, 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Día 3"
        subtitle={`${completedSets}/${totalSets} series completadas`}
        backHref="/student"
      />

      <div className="px-4 py-4 space-y-4">
        {/* Fecha */}
        <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
          <Calendar className="w-4 h-4" />
          <span>mié, 5 nov 25</span>
        </div>

        {/* Banner Preview */}
        {isPreview && (
          <Card className="bg-orange-500/10 border-orange-500/30">
            <CardContent className="p-3 flex items-start gap-3">
              <Lock className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-text">
                  Esta rutina está en <strong>modo preview</strong>. Tu coach debe activarla para que puedas completar las series.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 border-orange-500/50 text-orange-400"
                  onClick={() => setIsPreview(false)}
                >
                  Simular activación (demo)
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de ejercicios */}
        {exercises.map((exercise, exIdx) => (
          <Card key={exercise.id} className="bg-surface/80 border-border overflow-hidden">
            {/* Header del ejercicio */}
            <div
              className="p-4 flex items-center justify-between cursor-pointer"
              onClick={() => toggleExpand(exercise.id)}
            >
              <div className="flex items-center gap-3">
                <Dumbbell className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-semibold text-text">{exercise.name}</h3>
                  <p className="text-xs text-text-muted">
                    {exercise.muscleGroup} · {exercise.sets.length} series · 
                    Reps: {exercise.sets[0]?.targetReps} · 
                    Descanso: {exercise.sets[0]?.rest}
                  </p>
                </div>
              </div>
              {exercise.expanded ? (
                <ChevronUp className="w-5 h-5 text-text-muted" />
              ) : (
                <ChevronDown className="w-5 h-5 text-text-muted" />
              )}
            </div>

            {/* Notas del coach */}
            {exercise.expanded && exercise.notes && (
              <div className="px-4 pb-2">
                <div className="flex items-start gap-2 p-2 bg-blue-500/10 rounded-lg">
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-300">{exercise.notes}</p>
                </div>
              </div>
            )}

            {/* Tabla de series */}
            {exercise.expanded && (
              <div className="px-4 pb-4">
                {/* Header de tabla */}
                <div className="grid grid-cols-7 gap-1 text-[10px] font-medium text-primary bg-primary/10 rounded-t-lg p-2">
                  <span className="text-center">REPS</span>
                  <span className="text-center">REAL</span>
                  <span className="text-center">CARGA</span>
                  <span className="text-center">RIR-E</span>
                  <span className="text-center">RIR-R</span>
                  <span className="text-center">RPE</span>
                  <span className="text-center">✓</span>
                </div>

                {/* Filas de series */}
                {exercise.sets.map((set, setIdx) => (
                  <div key={set.id}>
                    {/* Serie principal */}
                    <div
                      className={cn(
                        "grid grid-cols-7 gap-1 p-2 border-b border-border items-center",
                        set.completed && "bg-accent/10",
                        set.targetReps === "AMRAP" && "bg-purple-500/5",
                        set.isDropSet && "bg-orange-500/5"
                      )}
                    >
                      {/* REPS objetivo */}
                      <div className="text-center">
                        {set.targetReps === "AMRAP" ? (
                          <Badge className="bg-purple-500 text-white text-[10px] px-1">
                            <Flame className="w-3 h-3 mr-0.5" />
                            MAX
                          </Badge>
                        ) : (
                          <span className="text-sm font-medium">{set.targetReps}</span>
                        )}
                        {set.isDropSet && (
                          <Badge className="bg-orange-500 text-white text-[8px] px-1 ml-1">
                            <ArrowDownToLine className="w-2 h-2" />
                          </Badge>
                        )}
                      </div>

                      {/* REAL */}
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={set.actualReps || ""}
                        onChange={(e) => updateSet(exercise.id, set.id, "actualReps", e.target.value)}
                        className={cn(
                          "h-8 text-center text-sm p-1",
                          set.completed && "text-accent font-medium",
                          isPreview && "opacity-50"
                        )}
                        disabled={isPreview}
                        placeholder="-"
                      />

                      {/* CARGA */}
                      <div className="relative">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={set.actualKg || ""}
                          onChange={(e) => updateSet(exercise.id, set.id, "actualKg", e.target.value)}
                          className={cn(
                            "h-8 text-center text-sm p-1",
                            set.completed && "text-accent font-medium",
                            isPreview && "opacity-50"
                          )}
                          disabled={isPreview}
                          placeholder={set.targetKg || "-"}
                        />
                      </div>

                      {/* RIR-E (esperado) */}
                      <span className="text-center text-sm text-text-muted">
                        {set.targetRir || "-"}
                      </span>

                      {/* RIR-R (real) */}
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={set.actualRirR || ""}
                        onChange={(e) => updateSet(exercise.id, set.id, "actualRirR", e.target.value)}
                        className={cn(
                          "h-8 text-center text-sm p-1",
                          set.completed && "text-accent font-medium",
                          isPreview && "opacity-50"
                        )}
                        disabled={isPreview}
                        placeholder="-"
                      />

                      {/* RPE */}
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={set.actualRpe || ""}
                        onChange={(e) => updateSet(exercise.id, set.id, "actualRpe", e.target.value)}
                        className={cn(
                          "h-8 text-center text-sm p-1",
                          set.completed && "text-accent font-medium",
                          isPreview && "opacity-50"
                        )}
                        disabled={isPreview}
                        placeholder="-"
                      />

                      {/* Checkbox completado */}
                      <div className="flex justify-center">
                        <Checkbox
                          checked={set.completed || false}
                          onCheckedChange={(checked) =>
                            updateSet(exercise.id, set.id, "completed", !!checked)
                          }
                          disabled={isPreview}
                          className={cn(
                            "border-accent",
                            set.completed && "bg-accent"
                          )}
                        />
                      </div>
                    </div>

                    {/* Drop Sets (si aplica) */}
                    {set.isDropSet && set.drops && (
                      <div className="bg-orange-500/5 border-l-2 border-orange-500/50">
                        {set.drops.map((drop, dropIdx) => (
                          <div
                            key={drop.id}
                            className="grid grid-cols-7 gap-1 p-2 border-b border-border/50 items-center"
                          >
                            {/* Label Drop */}
                            <div className="text-center">
                              <span className="text-xs text-orange-400 font-medium">
                                ↳ D{dropIdx + 1}
                              </span>
                            </div>

                            {/* REAL (reps del drop) */}
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={drop.actualReps || ""}
                              onChange={(e) =>
                                updateDrop(exercise.id, set.id, drop.id, "actualReps", e.target.value)
                              }
                              className={cn(
                                "h-8 text-center text-sm p-1 border-orange-500/30",
                                isPreview && "opacity-50"
                              )}
                              disabled={isPreview}
                              placeholder="-"
                            />

                            {/* CARGA (kg del drop) */}
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={drop.actualKg || ""}
                              onChange={(e) =>
                                updateDrop(exercise.id, set.id, drop.id, "actualKg", e.target.value)
                              }
                              className={cn(
                                "h-8 text-center text-sm p-1 border-orange-500/30",
                                isPreview && "opacity-50"
                              )}
                              disabled={isPreview}
                              placeholder="-"
                            />

                            {/* Espacios vacíos para RIR-E, RIR-R, RPE */}
                            <span className="text-center text-text-muted">-</span>
                            <span className="text-center text-text-muted">-</span>
                            <span className="text-center text-text-muted">-</span>
                            <span></span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}

        {/* Botón finalizar */}
        {!isPreview && (
          <Button className="w-full h-14 bg-accent text-black font-semibold">
            <Check className="w-5 h-5 mr-2" />
            Finalizar entrenamiento
          </Button>
        )}
      </div>
    </div>
  );
}


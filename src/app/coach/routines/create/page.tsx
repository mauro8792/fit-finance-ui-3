"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { getCoachStudents } from "@/lib/api/coach";
import { createCompleteRoutine } from "@/lib/api/routine";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Target,
  Calendar,
  Dumbbell,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Save,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Student } from "@/types";

const OBJECTIVES = [
  { value: "strength", label: "Fuerza" },
  { value: "hypertrophy", label: "Hipertrofia" },
  { value: "endurance", label: "Resistencia" },
  { value: "weight_loss", label: "Pérdida de peso" },
  { value: "general_fitness", label: "Fitness general" },
];


export default function CreateRoutinePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const preSelectedStudent = searchParams.get("studentId");

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);

  // Form state
  const [selectedStudentId, setSelectedStudentId] = useState(preSelectedStudent || "");
  const [macroName, setMacroName] = useState("");
  const [macroDescription, setMacroDescription] = useState("");
  const [objective, setObjective] = useState("");
  const [mesoName, setMesoName] = useState("Mesociclo 1");
  const [weeks, setWeeks] = useState("4");
  const [daysPerWeek, setDaysPerWeek] = useState("4");

  useEffect(() => {
    const loadStudents = async () => {
      if (!user?.id) return;
      try {
        const data = await getCoachStudents(user.id);
        setStudents(data.filter((s: Student) => s.isActive));
      } catch (error) {
        console.error("Error loading students:", error);
      }
    };
    loadStudents();
  }, [user?.id]);

  // Generar nombres de días automáticamente
  const numDays = Math.min(Math.max(parseInt(daysPerWeek) || 1, 1), 7);
  const dayNames = Array.from({ length: numDays }, (_, i) => `Día ${i + 1}`);

  const handleCreate = async () => {
    if (!selectedStudentId) {
      toast.error("Seleccioná un alumno");
      return;
    }

    setLoading(true);
    try {
      // Fecha de inicio = hoy
      const today = new Date();
      const fechaInicio = today.toISOString().split("T")[0];
      
      const numWeeks = parseInt(weeks) || 4;
      
      // Build routine structure según el formato del backend
      const routineData = {
        studentId: parseInt(selectedStudentId),
        macrocycle: {
          nombre: macroName || "Nuevo Macrociclo",
          fechaInicio: fechaInicio,
          objetivo: objective || "general",
        },
        mesociclos: [
          {
            nombre: mesoName || "Mesociclo 1",
            objetivo: objective || "general",
            fechaInicio: fechaInicio,
            // cantidadMicrociclos NO va aquí, va en microciclos
          },
        ],
        microciclos: [
          {
            mesocicloIndex: 0,
            cantidadMicrociclos: numWeeks,
            plantillaDias: dayNames.map((name, index) => ({
              dia: index + 1,
              nombre: name,
              esDescanso: false,
              ejercicios: [], // Ejercicios se agregan después
            })),
          },
        ],
      };

      await createCompleteRoutine(routineData);
      toast.success("¡Rutina creada exitosamente!");
      router.push(`/coach/students/${selectedStudentId}/routine`);
    } catch (error: any) {
      console.error("Error creating routine:", error);
      const msg = error?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || "Error al crear la rutina");
    } finally {
      setLoading(false);
    }
  };

  const selectedStudent = students.find((s) => s.id.toString() === selectedStudentId);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Crear Rutina"
        subtitle={`Paso ${step} de 3`}
        backHref={preSelectedStudent ? `/coach/students/${preSelectedStudent}` : "/coach"}
      />

      <div className="px-4 py-4">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  step >= s
                    ? "bg-primary text-black"
                    : "bg-surface text-text-muted border border-border"
                )}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={cn(
                    "w-16 h-1 mx-2",
                    step > s ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Select Student */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <Card className="bg-surface/80 border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Seleccionar Alumno
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {preSelectedStudent ? (
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <p className="font-medium text-text">
                      {selectedStudent?.firstName} {selectedStudent?.lastName}
                    </p>
                    <p className="text-sm text-text-muted">{selectedStudent?.user?.email || ""}</p>
                  </div>
                ) : (
                  <Select
                    value={selectedStudentId}
                    onValueChange={setSelectedStudentId}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Elegí un alumno" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id.toString()}>
                          {student.firstName} {student.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>

            <Button
              className="w-full bg-primary text-black"
              disabled={!selectedStudentId}
              onClick={() => setStep(2)}
            >
              Siguiente
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        )}

        {/* Step 2: Macrocycle Info */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <Card className="bg-surface/80 border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  Macrociclo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-text-muted">Nombre del macrociclo</Label>
                  <Input
                    value={macroName}
                    onChange={(e) => setMacroName(e.target.value)}
                    placeholder="Ej: Preparación General"
                    className="mt-1 bg-background"
                  />
                </div>

                <div>
                  <Label className="text-text-muted">Objetivo</Label>
                  <Select value={objective} onValueChange={setObjective}>
                    <SelectTrigger className="mt-1 bg-background">
                      <SelectValue placeholder="Seleccionar objetivo" />
                    </SelectTrigger>
                    <SelectContent>
                      {OBJECTIVES.map((obj) => (
                        <SelectItem key={obj.value} value={obj.value}>
                          {obj.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-text-muted">Descripción (opcional)</Label>
                  <Textarea
                    value={macroDescription}
                    onChange={(e) => setMacroDescription(e.target.value)}
                    placeholder="Notas adicionales..."
                    className="mt-1 bg-background resize-none"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-surface/80 border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-accent" />
                  Primer Mesociclo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-text-muted">Nombre del mesociclo</Label>
                  <Input
                    value={mesoName}
                    onChange={(e) => setMesoName(e.target.value)}
                    placeholder="Ej: Adaptación"
                    className="mt-1 bg-background"
                  />
                </div>

                <div>
                  <Label className="text-text-muted">Duración (semanas)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={52}
                    value={weeks}
                    onChange={(e) => setWeeks(e.target.value)}
                    placeholder="4"
                    className="mt-1 bg-background"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Atrás
              </Button>
              <Button
                className="flex-1 bg-primary text-black"
                onClick={() => setStep(3)}
              >
                Siguiente
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Days Structure */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <Card className="bg-surface/80 border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-primary" />
                  Estructura Semanal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-text-muted">Días de entrenamiento por semana</Label>
                  <Input
                    type="number"
                    min={1}
                    max={7}
                    value={daysPerWeek}
                    onChange={(e) => setDaysPerWeek(e.target.value)}
                    placeholder="4"
                    className="mt-1 bg-background"
                  />
                </div>

                {/* Preview de los días generados */}
                <div>
                  <Label className="text-text-muted">Días que se crearán</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {dayNames.map((name, index) => (
                      <Badge key={index} variant="outline" className="bg-primary/10 text-primary border-primary/30">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="bg-primary/10 border-primary/30">
              <CardContent className="p-4">
                <h3 className="font-medium text-text mb-2">Resumen</h3>
                <div className="space-y-1 text-sm text-text-muted">
                  <p>
                    <strong className="text-text">Alumno:</strong>{" "}
                    {selectedStudent?.firstName} {selectedStudent?.lastName}
                  </p>
                  <p>
                    <strong className="text-text">Macrociclo:</strong>{" "}
                    {macroName || "Sin nombre"}
                  </p>
                  <p>
                    <strong className="text-text">Mesociclo:</strong> {mesoName}
                  </p>
                  <p>
                    <strong className="text-text">Microciclos:</strong> {weeks} semanas
                  </p>
                  <p>
                    <strong className="text-text">Días por semana:</strong> {dayNames.length} ({dayNames.join(", ")})
                  </p>
                  <p className="text-xs text-text-muted mt-2">
                    Total: {parseInt(weeks) * dayNames.length} entrenamientos
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Atrás
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-primary to-primary-hover text-black"
                disabled={loading}
                onClick={handleCreate}
              >
                {loading ? (
                  "Creando..."
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Crear Rutina
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}


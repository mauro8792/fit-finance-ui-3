"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  ChevronRight,
  ChevronLeft,
  Dumbbell,
  Calendar,
  Layers,
  Cloud,
  Plus,
  Minus,
  FileText,
  Target,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as routineV2Api from "@/lib/api/routine-v2";

// ==================== TYPES ====================
interface DraftData {
  step: number;
  template: {
    name: string;
    description: string;
    objective: string;
    tags: string[];
  };
  structure: {
    microcyclesCount: number;
    daysPerMicrocycle: number;
    dayNames: string[];
  };
  lastSaved: string;
}

const DRAFT_KEY = "routine_template_draft_v2";

const defaultDayNames = [
  "Día 1",
  "Día 2", 
  "Día 3",
  "Día 4",
  "Día 5",
  "Día 6",
  "Día 7",
];

const objetivos = [
  "Hipertrofia",
  "Fuerza",
  "Resistencia",
  "Definición",
  "Funcional",
  "Rehabilitación",
  "General",
];

// ==================== COMPONENT ====================
export default function CreateRoutineV2Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assignToStudentId = searchParams.get("assignTo");
  
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<DraftData | null>(null);

  // Step 1: Info general
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateObjective, setTemplateObjective] = useState("");
  const [templateTags, setTemplateTags] = useState<string[]>([]);

  // Step 2: Estructura
  const [microcyclesCount, setMicrocyclesCount] = useState(4);
  const [daysPerMicrocycle, setDaysPerMicrocycle] = useState(4);
  const [dayNames, setDayNames] = useState<string[]>(defaultDayNames.slice(0, 4));

  // Auto-save draft
  const saveDraft = useCallback(() => {
    const draft: DraftData = {
      step,
      template: {
        name: templateName,
        description: templateDescription,
        objective: templateObjective,
        tags: templateTags,
      },
      structure: {
        microcyclesCount,
        daysPerMicrocycle,
        dayNames,
      },
      lastSaved: new Date().toISOString(),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setAutoSaveStatus("saved");
  }, [step, templateName, templateDescription, templateObjective, templateTags, microcyclesCount, daysPerMicrocycle, dayNames]);

  // Load draft on mount
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const draft = JSON.parse(saved) as DraftData;
        setPendingDraft(draft);
        setShowDraftDialog(true);
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      }
    }
  }, []);

  // Auto-save on changes
  useEffect(() => {
    const hasData = templateName || templateDescription || templateObjective;
    if (!hasData) return;

    setAutoSaveStatus("saving");
    const timer = setTimeout(() => {
      saveDraft();
    }, 1500);

    return () => clearTimeout(timer);
  }, [templateName, templateDescription, templateObjective, templateTags, microcyclesCount, daysPerMicrocycle, dayNames, saveDraft]);

  // Apply draft
  const applyDraft = (draft: DraftData) => {
    setStep(draft.step);
    setTemplateName(draft.template.name);
    setTemplateDescription(draft.template.description);
    setTemplateObjective(draft.template.objective);
    setTemplateTags(draft.template.tags || []);
    setMicrocyclesCount(draft.structure.microcyclesCount);
    setDaysPerMicrocycle(draft.structure.daysPerMicrocycle);
    setDayNames(draft.structure.dayNames);
    setShowDraftDialog(false);
    setAutoSaveStatus("saved");
  };

  // Discard draft
  const discardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setShowDraftDialog(false);
    setPendingDraft(null);
  };

  // Handle days change
  const handleDaysChange = (newCount: number) => {
    setDaysPerMicrocycle(newCount);
    if (newCount > dayNames.length) {
      const newNames = [...dayNames];
      for (let i = dayNames.length; i < newCount; i++) {
        newNames.push(defaultDayNames[i] || `Día ${i + 1}`);
      }
      setDayNames(newNames);
    } else {
      setDayNames(dayNames.slice(0, newCount));
    }
  };

  // Toggle tag
  const toggleTag = (tag: string) => {
    if (templateTags.includes(tag)) {
      setTemplateTags(templateTags.filter(t => t !== tag));
    } else {
      setTemplateTags([...templateTags, tag]);
    }
  };

  // Validation
  const canGoToStep2 = templateName.trim().length > 0;
  const canCreate = daysPerMicrocycle >= 1;

  // Create template - usando batch insert (una sola llamada al backend)
  const handleCreate = async () => {
    setSaving(true);
    
    try {
      // Construir la estructura completa para batch insert
      const microcycles = [];
      for (let weekNum = 1; weekNum <= microcyclesCount; weekNum++) {
        const days = [];
        for (let i = 0; i < daysPerMicrocycle; i++) {
          days.push({
            name: dayNames[i] || `Día ${i + 1}`,
            isRestDay: false,
          });
        }
        microcycles.push({
          name: `Semana ${weekNum}`,
          weekNumber: weekNum,
          isDeload: false,
          days,
        });
      }

      // Crear todo en una sola llamada (batch insert)
      const template = await routineV2Api.createTemplateComplete({
        name: templateName,
        description: templateDescription || undefined,
        objective: templateObjective || undefined,
        tags: templateTags.length > 0 ? templateTags : undefined,
        microcycles,
        autoPublish: !!assignToStudentId, // Publicar automáticamente si se va a asignar
      });

      // Limpiar draft
      localStorage.removeItem(DRAFT_KEY);
      
      // Si hay un alumno para asignar
      if (assignToStudentId) {
        try {
          const assigned = await routineV2Api.assignTemplate({
            templateId: template.id,
            studentId: parseInt(assignToStudentId),
            autoCreateMicrocycles: true,
          });
          
          toast.success("¡Rutina creada y asignada!", {
            description: "Ahora podés agregar los ejercicios",
          });
          
          // Ir al editor de la rutina del alumno
          router.push(`/coach/student-routine-v2/${assigned.id}/edit`);
        } catch (assignError) {
          console.error("Error assigning template:", assignError);
          toast.error("Error al asignar la rutina", {
            description: "La plantilla se creó pero no se pudo asignar",
          });
          router.push(`/coach/routines-v2/${template.id}/edit`);
        }
      } else {
        toast.success("¡Plantilla creada!", {
          description: "Ahora podés agregar los ejercicios",
        });
        
        // Ir al editor de la plantilla
        router.push(`/coach/routines-v2/${template.id}/edit`);
      }
    } catch (error) {
      console.error("Error creating template:", error);
      toast.error("Error al crear la plantilla", {
        description: "Intentá de nuevo",
      });
      setSaving(false);
    }
  };

  const totalSteps = 2;
  const progress = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title={assignToStudentId ? "Nueva Rutina" : "Nueva Plantilla"}
        subtitle={`Paso ${step} de ${totalSteps}`}
        backHref={assignToStudentId ? `/coach/students/${assignToStudentId}/routine` : "/coach/routines-v2"}
      />

      {/* Progress bar */}
      <div className="px-4 py-2">
        <Progress value={progress} className="h-1" />
      </div>

      {/* Auto-save indicator */}
      <div className="px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          {autoSaveStatus === "saving" && (
            <>
              <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              <span>Guardando...</span>
            </>
          )}
          {autoSaveStatus === "saved" && (
            <>
              <Cloud className="w-3 h-3 text-accent" />
              <span>Borrador guardado</span>
            </>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <AnimatePresence mode="wait">
          {/* ==================== STEP 1: INFO GENERAL ==================== */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card className="bg-surface/80 border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" />
                    Información General
                  </CardTitle>
                  <p className="text-xs text-text-muted">
                    Definí el nombre y objetivo de la rutina
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Nombre */}
                  <div className="space-y-2">
                    <Label>Nombre de la plantilla *</Label>
                    <Input
                      placeholder="Ej: Hipertrofia Full Body"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="bg-background"
                    />
                  </div>

                  {/* Objetivo */}
                  <div className="space-y-2">
                    <Label>Objetivo principal</Label>
                    <div className="flex flex-wrap gap-2">
                      {objetivos.map((obj) => (
                        <Badge
                          key={obj}
                          variant={templateObjective === obj ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer transition-colors",
                            templateObjective === obj 
                              ? "bg-primary text-black" 
                              : "hover:border-primary"
                          )}
                          onClick={() => setTemplateObjective(templateObjective === obj ? "" : obj)}
                        >
                          {obj}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label>Etiquetas (para organizar)</Label>
                    <div className="flex flex-wrap gap-2">
                      {["Principiante", "Intermedio", "Avanzado", "Full Body", "Upper/Lower", "PPL", "Drop Sets", "AMRAP"].map((tag) => (
                        <Badge
                          key={tag}
                          variant={templateTags.includes(tag) ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer transition-colors text-xs",
                            templateTags.includes(tag) 
                              ? "bg-accent text-black" 
                              : "hover:border-accent"
                          )}
                          onClick={() => toggleTag(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Descripción */}
                  <div className="space-y-2">
                    <Label>Descripción (opcional)</Label>
                    <Textarea
                      placeholder="Describe brevemente esta rutina..."
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      className="bg-background resize-none"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Botón siguiente */}
              <Button
                className="w-full h-14 bg-primary text-black font-semibold"
                disabled={!canGoToStep2}
                onClick={() => setStep(2)}
              >
                Siguiente
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* ==================== STEP 2: ESTRUCTURA ==================== */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card className="bg-surface/80 border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-accent" />
                    Estructura
                  </CardTitle>
                  <p className="text-xs text-text-muted">
                    Configurá la duración y los días de entrenamiento
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Microciclos */}
                  <div className="space-y-2">
                    <Label>Cantidad de semanas (microciclos)</Label>
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setMicrocyclesCount(Math.max(1, microcyclesCount - 1))}
                        disabled={microcyclesCount <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <div className="flex-1 text-center">
                        <span className="text-3xl font-bold text-primary">{microcyclesCount}</span>
                        <p className="text-xs text-text-muted">semanas</p>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setMicrocyclesCount(Math.min(16, microcyclesCount + 1))}
                        disabled={microcyclesCount >= 16}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {/* Quick selects */}
                    <div className="flex justify-center gap-2 mt-2">
                      {[4, 6, 8, 12].map((n) => (
                        <Badge
                          key={n}
                          variant={microcyclesCount === n ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer",
                            microcyclesCount === n && "bg-primary text-black"
                          )}
                          onClick={() => setMicrocyclesCount(n)}
                        >
                          {n} sem
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Días por semana */}
                  <div className="space-y-2">
                    <Label>Días de entrenamiento por semana</Label>
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDaysChange(Math.max(1, daysPerMicrocycle - 1))}
                        disabled={daysPerMicrocycle <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <div className="flex-1 text-center">
                        <span className="text-3xl font-bold text-accent">{daysPerMicrocycle}</span>
                        <p className="text-xs text-text-muted">días</p>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDaysChange(Math.min(7, daysPerMicrocycle + 1))}
                        disabled={daysPerMicrocycle >= 7}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {/* Quick selects */}
                    <div className="flex justify-center gap-2 mt-2">
                      {[3, 4, 5, 6].map((n) => (
                        <Badge
                          key={n}
                          variant={daysPerMicrocycle === n ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer",
                            daysPerMicrocycle === n && "bg-accent text-black"
                          )}
                          onClick={() => handleDaysChange(n)}
                        >
                          {n} días
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Nombres de días */}
                  <div className="space-y-2">
                    <Label>Nombres de los días</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {dayNames.map((name, idx) => (
                        <Input
                          key={idx}
                          value={name}
                          onChange={(e) => {
                            const newNames = [...dayNames];
                            newNames[idx] = e.target.value;
                            setDayNames(newNames);
                          }}
                          placeholder={`Día ${idx + 1}`}
                          className="bg-background text-sm"
                        />
                      ))}
                    </div>
                  </div>

                </CardContent>
              </Card>

              {/* Resumen */}
              <Card className="bg-primary/10 border-primary/30">
                <CardContent className="p-4">
                  <h4 className="font-medium text-primary mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Resumen
                  </h4>
                  <div className="space-y-1 text-sm text-text-muted">
                    <p>📋 <strong className="text-text">{templateName || "Sin nombre"}</strong></p>
                    {templateObjective && <p>🎯 Objetivo: {templateObjective}</p>}
                    {templateTags.length > 0 && <p>🏷️ Tags: {templateTags.join(", ")}</p>}
                    <p>📅 {microcyclesCount} semanas × {daysPerMicrocycle} días = <strong className="text-text">{microcyclesCount * daysPerMicrocycle} entrenamientos</strong></p>
                  </div>
                </CardContent>
              </Card>

              {/* Botones */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-14"
                  onClick={() => setStep(1)}
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Atrás
                </Button>
                <Button
                  className="flex-1 h-14 bg-primary text-black font-semibold"
                  disabled={!canCreate || saving}
                  onClick={handleCreate}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      Crear y agregar ejercicios
                      <Dumbbell className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Draft dialog */}
      <AnimatePresence>
        {showDraftDialog && pendingDraft && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center p-4 pb-24"
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="w-full max-w-md bg-surface rounded-2xl p-6 space-y-4 mb-safe"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-text">Borrador encontrado</h3>
                  <p className="text-xs text-text-muted">
                    Guardado {new Date(pendingDraft.lastSaved).toLocaleString("es-AR")}
                  </p>
                </div>
              </div>
              
              <p className="text-sm text-text-muted">
                Tenés un borrador de &quot;{pendingDraft.template.name || "plantilla sin nombre"}&quot;. 
                ¿Querés continuar donde lo dejaste?
              </p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={discardDraft}
                >
                  Empezar de cero
                </Button>
                <Button
                  className="flex-1 bg-primary text-black"
                  onClick={() => applyDraft(pendingDraft)}
                >
                  Continuar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

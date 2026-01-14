"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar, Loader2, Dumbbell, Copy, Plus } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

interface MicrocycleData {
  id: number;
  name: string;
  isDeload?: boolean;
  days?: Array<{
    id: number;
    dia: number;
    nombre: string;
    exercises?: Array<{
      id: number;
      exerciseCatalogId: number;
      series: string;
      repeticiones: string;
      descanso: string;
      rirEsperado: string;
      orden: number;
      exerciseCatalog?: {
        name: string;
        muscleGroup: string;
      };
      sets?: Array<{
        reps: string;
        expectedRir: string;
        order: number;
        isAmrap: boolean;
      }>;
    }>;
  }>;
}

interface Mesocycle {
  id: number;
  name: string;
  status?: string;
  macrocycle?: {
    id: number;
    studentId: number;
  };
  microcycles?: MicrocycleData[];
}

export default function AddMicrocyclePage() {
  const params = useParams();
  const router = useRouter();
  const mesocycleId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mesocycle, setMesocycle] = useState<Mesocycle | null>(null);
  const [lastMicrocycle, setLastMicrocycle] = useState<MicrocycleData | null>(null);
  
  // Datos del nuevo microciclo
  const [name, setName] = useState("");
  const [isDeload, setIsDeload] = useState(false);
  const [daysPerWeek, setDaysPerWeek] = useState("4");
  const [copyFromLast, setCopyFromLast] = useState(true); // Por defecto copiar

  // Ref para prevenir llamados duplicados (React StrictMode)
  const dataFetched = useRef(false);

  useEffect(() => {
    if (dataFetched.current) return;
    dataFetched.current = true;

    const loadMesocycle = async () => {
      try {
        const { data } = await api.get(`/mesocycle/${mesocycleId}`);
        setMesocycle(data);
        
        // Generar nombre automático
        const nextNumber = (data.microcycles?.length || 0) + 1;
        setName(`Microciclo ${nextNumber}`);
        
        // Si hay microciclos, obtener el último con sus datos completos
        if (data.microcycles && data.microcycles.length > 0) {
          // Ordenar para asegurarnos de obtener el último
          const sortedMicros = [...data.microcycles].sort((a, b) => a.id - b.id);
          const lastMicroId = sortedMicros[sortedMicros.length - 1].id;
          
          const { data: lastMicroData } = await api.get(`/microcycle/${lastMicroId}`);
          
          setLastMicrocycle(lastMicroData);
          setDaysPerWeek(String(lastMicroData.days?.length || 4));
        }
      } catch (error) {
        console.error("Error loading mesocycle:", error);
        toast.error("Error al cargar el mesociclo");
        dataFetched.current = false; // Permitir reintento si hay error
      } finally {
        setLoading(false);
      }
    };

    loadMesocycle();
  }, [mesocycleId]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Ingresá un nombre");
      return;
    }

    setSaving(true);
    try {
      const numDays = parseInt(daysPerWeek) || 4;
      
      let daysPayload;
      
      if (copyFromLast && lastMicrocycle?.days) {
        // Copiar estructura del último microciclo
        console.log("Last microcycle data:", JSON.stringify(lastMicrocycle, null, 2));
        
        daysPayload = lastMicrocycle.days.map((day) => ({
          dia: day.dia,
          nombre: day.nombre,
          esDescanso: false,
          exercises: day.exercises?.map((ex) => {
            // Obtener el exerciseCatalogId - puede estar directo o en exerciseCatalog
            const catalogId = ex.exerciseCatalogId || (ex.exerciseCatalog as any)?.id;
            
            console.log("Copying exercise:", ex.exerciseCatalog?.name || "Unknown", "catalogId:", catalogId);
            
            return {
              exerciseCatalogId: catalogId,
              series: ex.series || "3",
              repeticiones: ex.repeticiones || "8-12",
              descanso: ex.descanso || "2",
              rirEsperado: ex.rirEsperado || "2",
              orden: ex.orden || 1,
              sets: ex.sets?.map((s, idx) => ({
                reps: s.reps || "8-12",
                expectedRir: s.expectedRir || "2",
                order: s.order ?? idx,
                isAmrap: s.isAmrap || false,
              })) || [
                { reps: "8-12", expectedRir: "2", order: 0, isAmrap: false },
                { reps: "8-12", expectedRir: "2", order: 1, isAmrap: false },
                { reps: "8-12", expectedRir: "2", order: 2, isAmrap: false },
              ],
            };
          }) || [],
        }));
      } else {
        // Crear días vacíos
        daysPayload = Array.from({ length: numDays }, (_, i) => ({
          dia: i + 1,
          nombre: `Día ${i + 1}`,
          esDescanso: false,
          exercises: [],
        }));
      }
      
      const payload = {
        name: isDeload ? `${name} (Descarga)` : name,
        isDeload,
        days: daysPayload,
      };

      const { data: newMicro } = await api.post(`/microcycle/${mesocycleId}`, payload);
      
      toast.success(copyFromLast 
        ? "Microciclo copiado - editalo para personalizarlo" 
        : isDeload 
          ? "Semana de descarga agregada" 
          : "Microciclo agregado"
      );
      
      // Ir directamente a editar el nuevo microciclo
      if (newMicro?.id) {
        router.push(`/coach/microcycle/${newMicro.id}`);
      } else if (mesocycle?.macrocycle?.studentId) {
        router.push(`/coach/students/${mesocycle.macrocycle.studentId}/routine`);
      } else {
        router.back();
      }
    } catch (error) {
      console.error("Error creating microcycle:", error);
      toast.error("Error al crear el microciclo");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title="Cargando..." backHref="/coach/students" />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  const lastMicroExerciseCount = lastMicrocycle?.days?.reduce(
    (total, day) => total + (day.exercises?.length || 0), 0
  ) || 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Agregar Semana"
        subtitle={mesocycle?.name}
        backHref={mesocycle?.macrocycle?.studentId 
          ? `/coach/students/${mesocycle.macrocycle.studentId}/routine`
          : "/coach/students"}
      />

      <div className="px-4 py-4 space-y-4">
        {/* Info del mesociclo */}
        <Card className="bg-surface border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-text-muted">Mesociclo</p>
                <p className="font-medium text-text">{mesocycle?.name}</p>
                <p className="text-xs text-text-muted">
                  {mesocycle?.microcycles?.length || 0} microciclos actuales
                </p>
              </div>
              {mesocycle?.status && (
                <Badge 
                  variant="outline" 
                  className={
                    mesocycle.status === "active" 
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : mesocycle.status === "draft"
                        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                  }
                >
                  {mesocycle.status === "active" ? "Activo" : 
                   mesocycle.status === "draft" ? "Borrador" : 
                   mesocycle.status === "published" ? "Publicado" : mesocycle.status}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Opción de copiar último microciclo */}
        {lastMicrocycle && (
          <Card 
            className={`border transition-colors cursor-pointer ${
              copyFromLast 
                ? "bg-primary/10 border-primary/30" 
                : "bg-surface border-border"
            }`}
            onClick={() => setCopyFromLast(!copyFromLast)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    copyFromLast ? "bg-primary/20" : "bg-background"
                  }`}>
                    <Copy className={`w-5 h-5 ${copyFromLast ? "text-primary" : "text-text-muted"}`} />
                  </div>
                  <div>
                    <p className={`font-medium ${copyFromLast ? "text-primary" : "text-text"}`}>
                      📋 Copiar último microciclo
                    </p>
                    <p className="text-xs text-text-muted">
                      {lastMicrocycle.name} • {lastMicrocycle.days?.length || 0} días • {lastMicroExerciseCount} ejercicios
                    </p>
                  </div>
                </div>
                <Switch
                  checked={copyFromLast}
                  onCheckedChange={setCopyFromLast}
                />
              </div>
              {copyFromLast && (
                <p className="text-xs text-primary/80 mt-2">
                  ✓ Se copiará toda la estructura con ejercicios y series
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Formulario */}
        <Card className="bg-surface border-border">
          <CardContent className="p-4 space-y-4">
            {/* Nombre */}
            <div>
              <Label className="text-text-muted">Nombre del microciclo</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Microciclo 5"
                className="mt-1 bg-background"
              />
            </div>

            {/* Días por semana - solo si no copia */}
            {!copyFromLast && (
              <div>
                <Label className="text-text-muted">Días de entrenamiento</Label>
                <Input
                  type="number"
                  value={daysPerWeek}
                  onChange={(e) => setDaysPerWeek(e.target.value)}
                  min={1}
                  max={7}
                  className="mt-1 bg-background"
                />
              </div>
            )}

            {/* Switch de descarga */}
            <div className={`p-4 rounded-lg border transition-colors ${
              isDeload 
                ? "bg-blue-500/10 border-blue-500/30" 
                : "bg-background border-border"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isDeload ? "bg-blue-500/20" : "bg-primary/10"
                  }`}>
                    <Dumbbell className={`w-4 h-4 ${
                      isDeload ? "text-blue-400" : "text-primary"
                    }`} />
                  </div>
                  <div>
                    <p className={`font-medium ${isDeload ? "text-blue-400" : "text-text"}`}>
                      🔵 Semana de Descarga
                    </p>
                    <p className="text-xs text-text-muted">
                      Reduce intensidad para recuperación
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isDeload}
                  onCheckedChange={setIsDeload}
                />
              </div>

              {isDeload && (
                <div className="mt-3 p-3 bg-blue-500/10 rounded-lg">
                  <p className="text-xs text-blue-300">
                    💡 <strong>Sugerencias:</strong>
                  </p>
                  <ul className="text-xs text-text-muted mt-1 space-y-1">
                    <li>• Reducir peso un 40-50%</li>
                    <li>• Mantener o reducir volumen</li>
                    <li>• Enfocarse en técnica</li>
                    <li>• Ideal cada 4-6 semanas</li>
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Botones */}
        <div className="space-y-2">
          <Button
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            className="w-full bg-primary text-black"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {copyFromLast ? "Copiando..." : "Creando..."}
              </>
            ) : (
              <>
                {copyFromLast ? (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar y Editar
                  </>
                ) : isDeload ? (
                  "🔵 Agregar Semana de Descarga"
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Vacío
                  </>
                )}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

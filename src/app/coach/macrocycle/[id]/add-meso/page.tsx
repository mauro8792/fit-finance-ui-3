"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Layers, Loader2, Target, Calendar } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

interface Macrocycle {
  id: number;
  nombre: string;
  objetivo?: string;
  studentId: number;
  mesocycles?: Array<{
    id: number;
    name: string;
  }>;
}

const OBJECTIVES = [
  { value: "hypertrophy", label: "Hipertrofia" },
  { value: "strength", label: "Fuerza" },
  { value: "endurance", label: "Resistencia" },
  { value: "fat_loss", label: "Pérdida de grasa" },
  { value: "general", label: "Acondicionamiento general" },
];

export default function AddMesocyclePage() {
  const params = useParams();
  const router = useRouter();
  const macrocycleId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [macrocycle, setMacrocycle] = useState<Macrocycle | null>(null);
  
  // Formulario
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("hypertrophy");
  const [weeks, setWeeks] = useState("4");
  const [daysPerWeek, setDaysPerWeek] = useState("4");

  const dataFetched = useRef(false);

  useEffect(() => {
    if (dataFetched.current) return;
    
    const loadMacrocycle = async () => {
      try {
        dataFetched.current = true;
        setLoading(true);
        const { data } = await api.get(`/macrocycle/${macrocycleId}`);
        setMacrocycle(data);
        
        // Generar nombre automático
        const nextNumber = (data.mesocycles?.length || 0) + 1;
        setName(`Mesociclo ${nextNumber}`);
      } catch (error) {
        console.error("Error loading macrocycle:", error);
        toast.error("Error al cargar el macrociclo");
        dataFetched.current = false;
      } finally {
        setLoading(false);
      }
    };

    loadMacrocycle();
  }, [macrocycleId]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Ingresá un nombre");
      return;
    }

    setSaving(true);
    try {
      const numWeeks = parseInt(weeks) || 4;
      const numDays = parseInt(daysPerWeek) || 4;

      // Crear mesociclo
      const { data: newMeso } = await api.post(`/mesocycle/${macrocycleId}`, {
        name,
        objetivo: objective,
      });

      // Crear microciclos con días
      for (let i = 0; i < numWeeks; i++) {
        const microPayload = {
          name: `Microciclo ${i + 1}`,
          days: Array.from({ length: numDays }, (_, j) => ({
            dia: j + 1,
            nombre: `Día ${j + 1}`,
            esDescanso: false,
            exercises: [],
          })),
        };
        await api.post(`/microcycle/${newMeso.id}`, microPayload);
      }

      toast.success("Mesociclo creado exitosamente");
      
      // Volver a la rutina del estudiante
      if (macrocycle?.studentId) {
        router.push(`/coach/students/${macrocycle.studentId}/routine`);
      } else {
        router.back();
      }
    } catch (error: any) {
      console.error("Error creating mesocycle:", error);
      toast.error(error.response?.data?.message || "Error al crear el mesociclo");
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

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Agregar Mesociclo"
        subtitle={macrocycle?.nombre}
        backHref={macrocycle?.studentId 
          ? `/coach/students/${macrocycle.studentId}/routine`
          : "/coach/students"}
      />

      <div className="px-4 py-4 space-y-4">
        {/* Info del macrociclo */}
        <Card className="bg-surface border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Layers className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Macrociclo</p>
                <p className="font-medium text-text">{macrocycle?.nombre}</p>
                <p className="text-xs text-text-muted">
                  {macrocycle?.mesocycles?.length || 0} mesociclos actuales
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulario */}
        <Card className="bg-surface border-border">
          <CardContent className="p-4 space-y-4">
            {/* Nombre */}
            <div>
              <Label className="text-text-muted">Nombre</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Mesociclo de Fuerza"
                className="mt-1 bg-background"
              />
            </div>

            {/* Objetivo */}
            <div>
              <Label className="text-text-muted">Objetivo</Label>
              <Select value={objective} onValueChange={setObjective}>
                <SelectTrigger className="mt-1 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OBJECTIVES.map((obj) => (
                    <SelectItem key={obj.value} value={obj.value}>
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        {obj.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duración */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-text-muted">Semanas</Label>
                <Input
                  type="number"
                  value={weeks}
                  onChange={(e) => setWeeks(e.target.value)}
                  min={1}
                  max={12}
                  className="mt-1 bg-background"
                />
                <p className="text-xs text-text-muted mt-1">Microciclos a crear</p>
              </div>
              <div>
                <Label className="text-text-muted">Días/semana</Label>
                <Input
                  type="number"
                  value={daysPerWeek}
                  onChange={(e) => setDaysPerWeek(e.target.value)}
                  min={1}
                  max={7}
                  className="mt-1 bg-background"
                />
                <p className="text-xs text-text-muted mt-1">Días de entrenamiento</p>
              </div>
            </div>

            {/* Resumen */}
            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-sm text-primary font-medium">Resumen:</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {weeks} semanas
                </div>
                <div>•</div>
                <div>{daysPerWeek} días/semana</div>
                <div>•</div>
                <div>{parseInt(weeks) * parseInt(daysPerWeek)} entrenamientos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botón crear */}
        <Button
          onClick={handleCreate}
          disabled={saving || !name.trim()}
          className="w-full bg-primary text-black"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creando mesociclo...
            </>
          ) : (
            <>
              <Layers className="w-4 h-4 mr-2" />
              Crear Mesociclo
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

